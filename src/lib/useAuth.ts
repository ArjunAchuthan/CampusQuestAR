import { useState, useEffect } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  AuthError,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { checkIsAdmin } from '@/lib/admin'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      if (currentUser) {
        try {
          const adminStatus = await checkIsAdmin(currentUser)
          setIsAdmin(adminStatus)
        } catch {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass)
      const adminStatus = await checkIsAdmin(cred.user)
      setIsAdmin(adminStatus)
      return { user: cred.user, isAdmin: adminStatus, error: null }
    } catch (err) {
      const authErr = err as AuthError
      let message = 'Invalid email or password. Please check your credentials.'

      if (
        authErr.code === 'auth/network-request-failed' ||
        authErr.message?.includes('network')
      ) {
        message = 'Network error. Please check your internet connection and try again.'
      } else if (
        authErr.code === 'auth/too-many-requests'
      ) {
        message = 'Too many failed attempts. Please wait a moment and try again.'
      } else if (
        authErr.code === 'auth/invalid-email'
      ) {
        message = 'Please enter a valid email address.'
      } else if (
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid email or password. Accounts are issued by your event administrator.'
      } else if (authErr.code === 'auth/configuration-not-found') {
        message = 'Authentication service is initializing. Please verify Email/Password is enabled in console.'
      }

      return { user: null, isAdmin: false, error: message }
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setIsAdmin(false)
  }

  return {
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
  }
}
