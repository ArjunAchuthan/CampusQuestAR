import React, { useState, useEffect } from 'react'
import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { Screen, NavTab } from '@/types'
import { AppShell } from '@/components/shell'
import { PrologueModal } from '@/components/story/PrologueModal'
import { GameShowcaseScreen } from '@/screens/GameShowcaseScreen'
import { useAuth } from '@/lib/useAuth'
import { getUserProfileRef } from '@/lib/participantId'
import {
  LoginScreen,
  DashboardScreen,
  CameraScreen,
  MapScreen,
  ClueScreen,
  ProfileScreen,
  LeaderboardScreen,
  AdminRegisterScreen,
  RegistrationDeskScreen,
} from '@/screens'

// ---------------------------------------------------------------------------
// Route detection helpers (called outside hook-bearing components)
// ---------------------------------------------------------------------------

function isRegistrationDeskRoute(): boolean {
  const path = window.location.pathname
  const hash = window.location.hash
  return path === '/register' || hash === '#/register'
}

function isGameShowcaseRoute(): boolean {
  return window.location.pathname === '/games' || window.location.hash === '#/games'
}

// ---------------------------------------------------------------------------
// Root — decides which top-level component to render based on URL.
// No hooks live here so conditional returns are safe.
// ---------------------------------------------------------------------------

export default function AppRouter() {
  if (isRegistrationDeskRoute()) {
    return <RegistrationDeskScreen />
  }
  if (isGameShowcaseRoute()) {
    return <GameShowcaseScreen />
  }
  return <App />
}

// ---------------------------------------------------------------------------
// Main authenticated app — all hooks live inside here.
// ---------------------------------------------------------------------------

function App() {
  const { user, isAdmin, loading: authLoading, signIn, signOut } = useAuth()
  const [screen, setScreen] = useState<Screen>('profile')
  const [activeTab, setActiveTab] = useState<NavTab | null>('profile')
  const [showClueUnlockedNotice, setShowClueUnlockedNotice] = useState(false)
  const [prologueState, setPrologueState] = useState<'checking' | 'show' | 'done'>('checking')
  const [prologueUserId, setPrologueUserId] = useState<string | null>(null)

  // A manually registered candidate sees the story once per account, on their first app login.
  useEffect(() => {
    if (!user || isAdmin) {
      setPrologueState('done')
      setPrologueUserId(null)
      return
    }

    let cancelled = false
    setPrologueState('checking')
    setPrologueUserId(null)
    const seenKey = `campus-quest-prologue-seen:${user.uid}`

    try {
      if (window.localStorage.getItem(seenKey) === '1') {
        setPrologueState('done')
        setPrologueUserId(user.uid)
        return () => { cancelled = true }
      }
    } catch {
      // Storage can be disabled; Firestore remains the account-wide source of truth.
    }

    void (async () => {
      try {
        const userProfileRef = await getUserProfileRef(user.uid)
        if (cancelled) return
        const snapshot = userProfileRef ? await getDoc(userProfileRef) : null
        if (snapshot?.data()?.prologueSeenAt) {
          try { window.localStorage.setItem(seenKey, '1') } catch { /* optional local cache */ }
          setPrologueState('done')
        } else {
          setPrologueState('show')
        }
        setPrologueUserId(user.uid)
      } catch (error) {
        console.warn('Could not check the prologue read state; showing it for this session.', error)
        if (!cancelled) {
          setPrologueState('show')
          setPrologueUserId(user.uid)
        }
      }
    })()

    return () => { cancelled = true }
  }, [user?.uid, isAdmin])

  async function finishPrologue() {
    setScreen('clue')
    setActiveTab('clue')
    setPrologueState('done')
    if (!user) {
      return
    }
    const seenKey = `campus-quest-prologue-seen:${user.uid}`
    setPrologueUserId(user.uid)
    try {
      const userProfileRef = await getUserProfileRef(user.uid)
      if (userProfileRef) {
        await setDoc(userProfileRef, { prologueSeenAt: serverTimestamp() }, { merge: true })
      }
    } catch (error) {
      console.warn('Could not save the prologue read state; keeping a local record.', error)
    }
    try { window.localStorage.setItem(seenKey, '1') } catch { /* optional local cache */ }
  }

  // Handle URL hash / path routing for /admin or /admin/register
  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname
      const hash = window.location.hash
      if (path === '/admin/register' || path === '/admin' || hash === '#/admin/register' || hash === '#/admin') {
        setScreen('admin-register')
      }
    }

    handleRoute()
    window.addEventListener('hashchange', handleRoute)
    window.addEventListener('popstate', handleRoute)
    return () => {
      window.removeEventListener('hashchange', handleRoute)
      window.removeEventListener('popstate', handleRoute)
    }
  }, [])

  // When admin status is detected upon login, navigate to admin registration
  useEffect(() => {
    if (user && isAdmin && screen === 'profile') {
      const path = window.location.pathname
      const hash = window.location.hash
      if (path === '/admin/register' || path === '/admin' || hash === '#/admin/register' || hash === '#/admin') {
        setScreen('admin-register')
      }
    }
  }, [user, isAdmin, screen])

  // 1. While Firebase Auth initializes on page refresh, prevent flashing the login screen
  if (authLoading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(139, 188, 212, 0.15)',
            borderTopColor: '#8BBCD4',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // 2. Unauthenticated state: show login screen
  if (!user) {
    return (
      <LoginScreen
        onLogin={async (email, pass) => {
          const res = await signIn(email, pass)
          if (res.isAdmin) {
            setScreen('admin-register')
          } else {
            setScreen('profile')
            setActiveTab('profile')
          }
          return { error: res.error }
        }}
      />
    )
  }

  // Wait for the one-time first-login story check before showing the candidate app.
  if (!isAdmin && (prologueState === 'checking' || prologueUserId !== user.uid)) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(139,188,212,.15)', borderTopColor: '#8BBCD4', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Access Control: Non-admins cannot access admin panel
  if (screen === 'admin-register' && !isAdmin) {
    setScreen('profile')
    setActiveTab('profile')
    return null
  }

  function handleNav(tab: NavTab) {
    if (tab !== 'clue') setShowClueUnlockedNotice(false)
    setActiveTab(tab)
    setScreen(tab)
  }

  function handleGameComplete() {
    setShowClueUnlockedNotice(true)
    handleNav('clue')
  }

  async function handleLogout() {
    await signOut()
    setScreen('profile')
    setActiveTab('profile')
  }

  if (screen === 'admin-register') {
    return (
      <AdminRegisterScreen onLogout={handleLogout} />
    )
  }

  function renderScreen() {
    switch (screen) {
      case 'profile':
        return <ProfileScreen />
      case 'dashboard':
        return <DashboardScreen onOpenCamera={() => handleNav('camera')} />
      case 'camera':
        return <CameraScreen onClueUnlocked={handleGameComplete} />
      case 'map':
        return <MapScreen />
      case 'clue':
        return <ClueScreen showUnlockedNotice={showClueUnlockedNotice} />
      case 'leaderboard':
        return <LeaderboardScreen />
      default:
        return <ProfileScreen />
    }
  }

  return (
    <>
      <AppShell active={activeTab} onNav={handleNav} onLogout={handleLogout}>
        {renderScreen()}
      </AppShell>
      {!isAdmin && prologueState === 'show' && <PrologueModal onClose={() => { void finishPrologue() }} />}
    </>
  )
}
