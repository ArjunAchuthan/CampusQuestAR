import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
  type DocumentReference,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

const pendingLookups = new Map<string, Promise<DocumentReference | null>>()

function randomSixDigitId(): string {
  const random = new Uint32Array(1)
  globalThis.crypto.getRandomValues(random)
  return String(100000 + (random[0] % 900000))
}

/** Create a new participant's numeric profile document and progress record atomically. */
export async function createNumericParticipantDocuments(
  uid: string,
  profile: Record<string, unknown>,
  progress: Record<string, unknown>,
): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const participantId = randomSixDigitId()
    const userRef = doc(db, 'users', participantId)
    const progressRef = doc(db, 'progress', uid)

    const created = await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(userRef)
      if (existing.exists()) return false
      transaction.set(userRef, { ...profile, uid, participantId })
      transaction.set(progressRef, progress)
      return true
    })

    if (created) return participantId
  }

  throw new Error('Could not allocate a unique six-digit participant ID. Please try again.')
}

/** Find a profile by its Firebase UID and move older users/{uid} profiles to a numeric document ID. */
export function getUserProfileRef(uid: string): Promise<DocumentReference | null> {
  const pending = pendingLookups.get(uid)
  if (pending) return pending

  const lookup = (async (): Promise<DocumentReference | null> => {
    const users = collection(db, 'users')
    const matches = await getDocs(query(users, where('uid', '==', uid)))
    const current = matches.docs.find((item) => item.data().uid === uid)

    if (current && /^\d{6}$/.test(current.id)) return current.ref

    const legacyRef = current?.ref ?? doc(db, 'users', uid)
    const legacy = await getDoc(legacyRef)
    if (!legacy.exists()) return null

    const oldData = legacy.data()
    const previousId = typeof oldData.participantId === 'string' && /^\d{6}$/.test(oldData.participantId)
      ? oldData.participantId
      : null

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const participantId = attempt === 0 && previousId ? previousId : randomSixDigitId()
      const numericRef = doc(db, 'users', participantId)
      if (numericRef.path === legacyRef.path) continue

      const moved = await runTransaction(db, async (transaction) => {
        const source = await transaction.get(legacyRef)
        const destination = await transaction.get(numericRef)
        if (!source.exists()) return destination.exists() && destination.data().uid === uid
        if (destination.exists()) return false

        transaction.set(numericRef, {
          ...source.data(),
          uid,
          participantId,
        })
        transaction.delete(legacyRef)
        return true
      })

      if (moved) return numericRef
    }

    // A concurrent migration may have completed after the initial query.
    const refreshed = await getDocs(query(users, where('uid', '==', uid)))
    return refreshed.docs.find((item) => item.data().uid === uid)?.ref ?? null
  })()

  pendingLookups.set(uid, lookup)
  lookup.finally(() => pendingLookups.delete(uid)).catch(() => {})
  return lookup
}
