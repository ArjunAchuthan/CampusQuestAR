import { useState, useEffect, useCallback } from 'react'
import { onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUserProfileRef } from '@/lib/participantId'
import { AVATARS, DEFAULT_AVATAR, getAvatarById, type AvatarOption } from '@/lib/avatars'

export interface UserProfileData {
  uid: string
  participantId?: string
  displayName: string
  email: string
  role: 'participant' | 'admin'
  avatarId: string
  avatar: AvatarOption
}

export function useUserProfile(uid: string | null | undefined) {
  // Resolve effective UID synchronously from prop or auth instance
  const effectiveUid = uid || auth.currentUser?.uid || null

  const [profile, setProfile] = useState<UserProfileData | null>(() => {
    if (!effectiveUid) {
      // Check if there is a globally cached last active avatar
      const lastAvatarId = localStorage.getItem('campus_quest_last_avatar')
      if (lastAvatarId) {
        return {
          uid: '',
          displayName: '',
          email: '',
          role: 'participant',
          avatarId: lastAvatarId,
          avatar: getAvatarById(lastAvatarId),
        }
      }
      return null
    }

    const cachedAvatar = localStorage.getItem(`campus_quest_avatar_${effectiveUid}`) || localStorage.getItem('campus_quest_last_avatar')
    const currentUser = auth.currentUser

    if (cachedAvatar) {
      return {
        uid: effectiveUid,
        displayName: currentUser?.displayName || 'Explorer',
        email: currentUser?.email || '',
        role: 'participant',
        avatarId: cachedAvatar,
        avatar: getAvatarById(cachedAvatar),
      }
    }

    return null
  })

  const [loading, setLoading] = useState(() => !profile)

  useEffect(() => {
    const targetUid = uid || auth.currentUser?.uid
    if (!targetUid) {
      setLoading(false)
      return
    }

    let cancelled = false
    let unsub: (() => void) | null = null

    getUserProfileRef(targetUid).then((userDocRef) => {
      if (cancelled) return
      if (!userDocRef) {
        setLoading(false)
        return
      }

      unsub = onSnapshot(
        userDocRef,
        (snap) => {
        const cachedAvatar = localStorage.getItem(`campus_quest_avatar_${targetUid}`)
        const currentUser = auth.currentUser

        if (snap.exists()) {
          const data = snap.data()
          const avatarId = data.avatarId || cachedAvatar || DEFAULT_AVATAR.id
          const displayName = data.displayName || currentUser?.displayName || 'Explorer'
          const email = data.email || currentUser?.email || ''
          const role = data.role || 'participant'
          const participantId = role === 'participant'
            ? (/^\d{6}$/.test(userDocRef.id) ? userDocRef.id : data.participantId)
            : undefined

          // Keep localStorage updated
          localStorage.setItem(`campus_quest_avatar_${targetUid}`, avatarId)
          localStorage.setItem('campus_quest_last_avatar', avatarId)

          setProfile({
            uid: targetUid,
            participantId,
            displayName,
            email,
            role,
            avatarId,
            avatar: getAvatarById(avatarId),
          })
        } else {
          // If Firestore doc does not exist yet, construct from auth + local cache
          const avatarId = cachedAvatar || DEFAULT_AVATAR.id
          const displayName = currentUser?.displayName || 'Explorer'
          const email = currentUser?.email || ''

          localStorage.setItem(`campus_quest_avatar_${targetUid}`, avatarId)
          localStorage.setItem('campus_quest_last_avatar', avatarId)

          setProfile({
            uid: targetUid,
            displayName,
            email,
            role: 'participant',
            avatarId,
            avatar: getAvatarById(avatarId),
          })
        }
        setLoading(false)
      },
      (err) => {
        console.warn('Error listening to user profile:', err)
        setLoading(false)
        }
      )
    }).catch((err) => {
      console.warn('Could not locate the participant profile:', err)
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [uid])

  const selectAvatar = useCallback(
    async (newAvatarId: string): Promise<boolean> => {
      const targetUid = uid || auth.currentUser?.uid
      if (!targetUid) return false

      const chosen = getAvatarById(newAvatarId)

      // 1. Optimistically update local state & localStorage immediately
      localStorage.setItem(`campus_quest_avatar_${targetUid}`, newAvatarId)
      localStorage.setItem('campus_quest_last_avatar', newAvatarId)

      setProfile((prev) => ({
        uid: targetUid,
        displayName: prev?.displayName || auth.currentUser?.displayName || 'Explorer',
        email: prev?.email || auth.currentUser?.email || '',
        role: prev?.role || 'participant',
        avatarId: newAvatarId,
        avatar: chosen,
      }))

      try {
        // 2. Persist to Firestore
        const userDocRef = await getUserProfileRef(targetUid)
        if (!userDocRef) return false
        await setDoc(
          userDocRef,
          {
            avatarId: newAvatarId,
            avatarUrl: chosen.url,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )

        // 3. Update Firebase Auth profile
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
            photoURL: chosen.url,
          }).catch(() => {})
        }

        return true
      } catch (err) {
        console.error('Failed to update avatar in Firestore:', err)
        return false
      }
    },
    [uid]
  )

  return {
    profile,
    avatar: profile?.avatar || null,
    displayName: profile?.displayName || auth.currentUser?.displayName || '',
    email: profile?.email || auth.currentUser?.email || '',
    loading,
    selectAvatar,
  }
}
