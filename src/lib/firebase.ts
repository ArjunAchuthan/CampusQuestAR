import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Secondary app instance specifically used to create new participant accounts
// without mutating or logging out the admin's primary auth session in the browser.
export function getSecondaryAuth() {
  const secondaryAppName = 'SecondaryAuthAdminApp'
  const secondaryApp = getApps().some((a) => a.name === secondaryAppName)
    ? getApp(secondaryAppName)
    : initializeApp(firebaseConfig, secondaryAppName)
  return getAuth(secondaryApp)
}
