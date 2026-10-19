import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  onSnapshot,
  getDocs,
  setDoc,
  serverTimestamp,
  arrayUnion,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getProgressDocumentRef } from '@/lib/participantId'
import type { LatLng, QuestLocation, ParticipantProgress } from '@/types'

const progressCache = new Map<string, ParticipantProgress>()
let locationsCache: QuestLocation[] = []

/** True only on the temporary phone testing site; never enables production checkpoints. */
export function isPhoneARPreview(): boolean {
  return typeof window !== 'undefined'
    && window.location.hostname === 'campusquestar-app--phone-ar-test-u94nmep3.web.app'
}

/**
 * Development-only GPS fixture. Add ?testCoords=lat,lng to the app URL to
 * place all seven geofences at one test point without changing Firestore.
 */
function applyTestCoordinates(locations: QuestLocation[]): QuestLocation[] {
  if (typeof window === 'undefined') return locations

  // The temporary phone preview is allowed to simulate all seven checkpoints at
  // the user's test location. This override never applies to the production site.
  const phonePreview = isPhoneARPreview()
  if (!import.meta.env.DEV && !phonePreview) return locations

  const raw = new URLSearchParams(window.location.search).get('testCoords')
    ?? (phonePreview ? '10.758460,76.694664' : null)
  if (!raw) return locations

  const [latRaw, lngRaw] = raw.split(',')
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    console.warn('Ignoring invalid testCoords query parameter. Expected ?testCoords=latitude,longitude')
    return locations
  }

  const coords: LatLng = { lat, lng }
  return locations.map((location) => ({ ...location, coords }))
}

// Default fallback metadata for the 7 locations if Firestore documents only contain coords & order
export const DEFAULT_LOCATIONS_META: Record<number, { name: string; clue: string; hint: string }> = {
  1: {
    name: 'Main Quadrangle',
    clue: 'Where arches meet the open sky, look for the central stone marker where paths converge.',
    hint: 'Near the center fountain plaza of the main quad.',
  },
  2: {
    name: 'Memorial Library',
    clue: 'Between columns of stone and centuries of knowledge, search the entrance steps.',
    hint: 'At the front entrance portico facing the courtyard.',
  },
  3: {
    name: 'Engineering Hall',
    clue: 'Where circuits hum and gears turn, locate the kinetic sculpture outside.',
    hint: 'Near the robotic arm display in the north courtyard.',
  },
  4: {
    name: 'Science Center',
    clue: 'Look for the glass atrium where light refracts through the periodic exhibit.',
    hint: 'Near the east sundial pavilion.',
  },
  5: {
    name: 'Student Union Plaza',
    clue: 'At the bustling crossroads of student voices, scan the central amphitheater.',
    hint: 'Around the amphitheater steps.',
  },
  6: {
    name: 'Historic Clock Tower',
    clue: 'Beneath the ringing chimes of time, look at the tower base mosaic.',
    hint: 'Directly facing the tower south portal.',
  },
  7: {
    name: 'Innovation Hub',
    clue: 'The final threshold where future visions ignite. Scan the illuminated portal emblem.',
    hint: 'At the main entrance glass prism.',
  },
}

/**
 * Fetches all quest locations from Firestore, ordered by order field (1 to 7).
 */
export async function fetchQuestLocations(): Promise<QuestLocation[]> {
  try {
    const colRef = collection(db, 'locations')
    const snap = await getDocs(colRef)
    const list: QuestLocation[] = []

    snap.forEach((d) => {
      const data = d.data()
      const order = Number(data.order) || 1
      const meta = DEFAULT_LOCATIONS_META[order] || DEFAULT_LOCATIONS_META[1]

      list.push({
        id: d.id,
        order,
        name: data.name || meta.name,
        clue: data.clue || meta.clue,
        hint: data.hint || meta.hint,
        coords: {
          lat: Number(data.coords?.lat) || 37.4275,
          lng: Number(data.coords?.lng) || -122.1697,
        },
        unlockRadius: Number(data.unlockRadius) || 20,
      })
    })

    const result = applyTestCoordinates(list.sort((a, b) => a.order - b.order))
    locationsCache = result
    return result
  } catch (err) {
    console.error('Error fetching locations:', err)
    return []
  }
}

/**
 * Unlocks the target location for the user, recording timestamps in Firestore.
 */
export async function unlockTargetLocation(
  uid: string,
  locationOrder: number,
  locationId: string
): Promise<boolean> {
  if (!uid) return false

  try {
    const progressRef = await getProgressDocumentRef(uid)
    const now = serverTimestamp()

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(progressRef)
      const existing = snapshot.data()
      transaction.set(progressRef, {
        uid,
        updatedAt: now,
        unlockedAt: now,
        [`unlockedLocations.${locationId}`]: now,
        ...(!existing?.startedAt ? { startedAt: now } : {}),
      }, { merge: true })
    })

    return true
  } catch (err) {
    console.error('Error unlocking location in Firestore:', err)
    return false
  }
}

/**
 * Advances the user's quest progress to the next location after mini-game completion.
 */
export async function completeLocationGame(
  uid: string,
  locationIndex: number,
  gameId: string
): Promise<boolean> {
  if (!uid) return false

  try {
    const progressRef = await getProgressDocumentRef(uid)
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(progressRef)
      const data = snapshot.data()
      const completed = Array.isArray(data?.completedGameIds) ? data.completedGameIds : []
      if (completed.includes(gameId)) return
      if ((data?.currentLocationIndex ?? 0) !== locationIndex) {
        throw new Error('This checkpoint is no longer the active quest location.')
      }

      const isFinalLocation = locationIndex >= 6
      transaction.update(progressRef, {
        completedGameIds: arrayUnion(gameId),
        currentLocationIndex: isFinalLocation ? 6 : locationIndex + 1,
        ...(isFinalLocation ? { finishedAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      })
      progressCache.set(uid, {
        uid,
        participantId: progressRef.id,
        currentLocationIndex: isFinalLocation ? 6 : locationIndex + 1,
        completedGameIds: [...new Set([...completed, gameId])],
        startedAt: data?.startedAt,
        updatedAt: new Date(),
        unlockedAt: data?.unlockedAt,
        unlockedLocations: data?.unlockedLocations || {},
      })
    })

    return true
  } catch (err) {
    console.error('Error completing location game:', err)
    return false
  }
}

/**
 * React hook to listen in realtime to user's quest progress and quest locations.
 */
export function useQuestProgress(uid: string | null | undefined) {
  const [locations, setLocations] = useState<QuestLocation[]>(locationsCache)
  const [progress, setProgress] = useState<ParticipantProgress | null>(() => uid ? progressCache.get(uid) ?? null : null)
  const [loading, setLoading] = useState(() => !(uid && progressCache.has(uid) && locationsCache.length > 0))

  // 1. Subscribe to locations collection
  useEffect(() => {
    const colRef = collection(db, 'locations')
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list: QuestLocation[] = []
        snap.forEach((d) => {
          const data = d.data()
          const order = Number(data.order) || 1
          const meta = DEFAULT_LOCATIONS_META[order] || DEFAULT_LOCATIONS_META[1]
          list.push({
            id: d.id,
            order,
            name: data.name || meta.name,
            clue: data.clue || meta.clue,
            hint: data.hint || meta.hint,
            coords: {
              lat: Number(data.coords?.lat) || 37.4275,
              lng: Number(data.coords?.lng) || -122.1697,
            },
            unlockRadius: Number(data.unlockRadius) || 20,
          })
        })
        list.sort((a, b) => a.order - b.order)
        const nextLocations = applyTestCoordinates(list)
        locationsCache = nextLocations
        setLocations(nextLocations)
      },
      (err) => {
        console.warn('Locations snapshot error, loading fallback:', err)
        fetchQuestLocations().then(setLocations)
      }
    )

    return () => unsub()
  }, [])

  // 2. Subscribe to user progress doc
  useEffect(() => {
    if (!uid) {
      setProgress(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined
    const cachedProgress = progressCache.get(uid)
    setProgress(cachedProgress ?? null)
    setLoading(!(cachedProgress && locationsCache.length > 0))
    void getProgressDocumentRef(uid).then((progressRef) => {
      if (cancelled) return
      unsubscribe = onSnapshot(
        progressRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data()
            const nextProgress: ParticipantProgress = {
              uid,
              participantId: progressRef.id,
              currentLocationIndex: typeof data.currentLocationIndex === 'number' ? data.currentLocationIndex : 0,
              completedGameIds: Array.isArray(data.completedGameIds) ? data.completedGameIds : [],
              startedAt: data.startedAt,
              updatedAt: data.updatedAt,
              unlockedAt: data.unlockedAt,
              unlockedLocations: data.unlockedLocations || {},
            }
            progressCache.set(uid, nextProgress)
            setProgress(nextProgress)
          } else {
            void setDoc(progressRef, {
              uid,
              participantId: progressRef.id,
              currentLocationIndex: 0,
              completedGameIds: [],
              startedAt: null,
              updatedAt: serverTimestamp(),
            }).catch(console.error)

            const initialProgress: ParticipantProgress = { uid, participantId: progressRef.id, currentLocationIndex: 0, completedGameIds: [] }
            progressCache.set(uid, initialProgress)
            setProgress(initialProgress)
          }
          setLoading(false)
        },
        (err) => {
          console.error('Progress snapshot error:', err)
          setLoading(false)
        },
      )
    }).catch((error) => {
      console.error('Could not resolve the candidate progress document:', error)
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [uid])

  const currentLocationIndex = progress?.currentLocationIndex ?? 0
  const currentLocation = Number.isInteger(currentLocationIndex) && currentLocationIndex >= 0
    ? locations[currentLocationIndex] ?? null
    : null

  const isCurrentUnlocked = Boolean(
    currentLocation && progress?.unlockedLocations?.[currentLocation.id]
  )

  const handleUnlockCurrent = useCallback(async () => {
    if (!uid || !currentLocation) return false
    return unlockTargetLocation(uid, currentLocation.order, currentLocation.id)
  }, [uid, currentLocation])

  return {
    locations,
    progress,
    currentLocationIndex,
    currentLocation,
    isCurrentUnlocked,
    unlockCurrent: handleUnlockCurrent,
    loading,
  }
}
