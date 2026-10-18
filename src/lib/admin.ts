import {
  User,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as secondarySignOut,
  AuthError,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db, getSecondaryAuth } from '@/lib/firebase'
import { createNumericParticipantDocuments, getUserProfileRef } from '@/lib/participantId'
import type { ParticipantUser } from '@/types'

/**
 * Checks whether a given Firebase Auth user / UID is an authorized administrator.
 * Verifies existence in `admins/{uid}`, `admins/{email}`, or `users/{uid}.role === 'admin'`.
 */
export async function checkIsAdmin(
  target: User | { uid: string; email?: string | null } | string | null | undefined,
): Promise<boolean> {
  if (!target) return false
  const uid = typeof target === 'string' ? target : target.uid
  const email = typeof target === 'object' && target !== null && 'email' in target ? target.email : null

  try {
    // 1. Check admins/{uid}
    if (uid) {
      const adminDocRef = doc(db, 'admins', uid)
      const adminSnap = await getDoc(adminDocRef)
      if (adminSnap.exists()) return true
    }

    // 2. Check admins/{email}
    if (email) {
      const adminEmailRef = doc(db, 'admins', email.toLowerCase().trim())
      const adminEmailSnap = await getDoc(adminEmailRef)
      if (adminEmailSnap.exists()) return true
    }

    // 3. Check the participant profile associated with this Firebase UID.
    if (uid) {
      const userDocRef = await getUserProfileRef(uid)
      const userSnap = userDocRef ? await getDoc(userDocRef) : null
      if (userSnap?.exists() && userSnap.data()?.role === 'admin') {
        return true
      }
    }

    return false
  } catch (err) {
    console.error('Error checking admin status:', err)
    return false
  }
}

export interface RegisterParticipantParams {
  displayName: string
  email: string
  password?: string
}

export interface RegisterParticipantResult {
  success: boolean
  uid?: string
  participantId?: string
  password?: string
  error?: string
}

/**
 * Generates an easy-to-read, temporary participant password
 */
export function generateTemporaryPassword(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  let randomPart = ''
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `Quest@${randomPart}!`
}

/**
 * Registers a new participant account via secondary auth instance,
 * atomically creating the auth user, users/{sixDigitId} document, and progress/{uid} document.
 * Crucially, does NOT mutate or sign out the admin's active primary browser session.
 */
export async function registerParticipant({
  displayName,
  email,
  password,
}: RegisterParticipantParams): Promise<RegisterParticipantResult> {
  const trimmedName = displayName.trim()
  const trimmedEmail = email.trim().toLowerCase()
  const finalPassword = password && password.trim() ? password.trim() : generateTemporaryPassword()

  if (!trimmedName) {
    return { success: false, error: 'Participant name is required.' }
  }
  if (!trimmedEmail) {
    return { success: false, error: 'Participant email is required.' }
  }
  if (finalPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' }
  }

  const secondaryAuth = getSecondaryAuth()

  try {
    // 1. Create auth user on isolated secondary auth instance
    const cred = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, finalPassword)
    const newUid = cred.user.uid
    await updateProfile(cred.user, { displayName: trimmedName, photoURL: '/avatars/avatar-1.png' })

    // 2. Create the numeric profile document and UID-keyed progress record atomically.
    const participantId = await createNumericParticipantDocuments(newUid, {
        uid: newUid,
        email: trimmedEmail,
        displayName: trimmedName,
        role: 'participant',
        avatarId: 'avatar-1',
        avatarUrl: '/avatars/avatar-1.png',
        createdAt: serverTimestamp(),
      }, {
        uid: newUid,
        currentLocationIndex: 0,
        completedGameIds: [],
        startedAt: null,
        updatedAt: serverTimestamp(),
      })

    // 3. Clean up secondary auth session in background
    secondarySignOut(secondaryAuth).catch(() => {})

    return {
      success: true,
      uid: newUid,
      participantId,
      password: finalPassword,
    }
  } catch (err) {
    // Clean up secondary auth session on error
    try {
      await secondarySignOut(secondaryAuth)
    } catch {
      // ignore
    }

    const authErr = err as AuthError
    if (authErr.code === 'auth/email-already-in-use') {
      return {
        success: false,
        error: `An account with email "${trimmedEmail}" is already registered.`,
      }
    } else if (authErr.code === 'auth/invalid-email') {
      return {
        success: false,
        error: 'Invalid email format. Please check the address.',
      }
    } else if (authErr.code === 'auth/weak-password') {
      return {
        success: false,
        error: 'Password is too weak. Please use a stronger password.',
      }
    }

    return {
      success: false,
      error: authErr.message || 'Failed to register participant. Please try again.',
    }
  }
}

/**
 * Fetches all registered participants from Firestore for the admin table
 */
export async function fetchRegisteredParticipants(): Promise<ParticipantUser[]> {
  try {
    const usersCol = collection(db, 'users')
    const snap = await getDocs(usersCol)
    const list = await Promise.all(snap.docs
      .filter((d) => d.data().role === 'participant')
      .map(async (d): Promise<ParticipantUser> => {
        const data = d.data() as ParticipantUser
        const uid = data.uid || d.id
        let participantId = /^\d{6}$/.test(d.id) ? d.id : undefined
        if (!participantId) {
          try { participantId = (await getUserProfileRef(uid))?.id } catch (err) { console.warn('Could not migrate participant profile:', err) }
        }
        return {
          uid,
          participantId,
          email: data.email || '',
          displayName: data.displayName || 'Unnamed Player',
          role: data.role,
          createdAt: data.createdAt,
        }
      }))

    // Sort descending by registration date
    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0
      const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0
      return timeB - timeA
    })
  } catch (err) {
    console.error('Error fetching participants:', err)
    return []
  }
}

/**
 * Deletes a participant user from Firestore (users and progress docs)
 * and triggers authentication deletion via server API.
 */
export async function deleteParticipant(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete Firestore user document
    const userDocRef = await getUserProfileRef(uid)
    if (userDocRef) await deleteDoc(userDocRef)

    // 2. Delete Firestore progress document
    const progressDocRef = doc(db, 'progress', uid)
    await deleteDoc(progressDocRef).catch(() => {})

    // 3. Delete Firestore leaderboard document if present
    const leaderboardDocRef = doc(db, 'leaderboard', uid)
    await deleteDoc(leaderboardDocRef).catch(() => {})

    // 4. Request Firebase Auth deletion via API endpoint
    try {
      await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      })
    } catch (e) {
      console.warn('API delete-user call notice:', e)
    }

    return { success: true }
  } catch (err: any) {
    console.error('Failed to delete participant:', err)
    return {
      success: false,
      error: err.message || 'Failed to delete participant.',
    }
  }
}

