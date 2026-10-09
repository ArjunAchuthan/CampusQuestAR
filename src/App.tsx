import React, { useState, useEffect } from 'react'
import type { Screen, NavTab } from '@/types'
import { AppShell } from '@/components/shell'
import { GameShowcaseScreen } from '@/screens/GameShowcaseScreen'
import { useAuth } from '@/lib/useAuth'
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

  // Access Control: Non-admins cannot access admin panel
  if (screen === 'admin-register' && !isAdmin) {
    setScreen('profile')
    setActiveTab('profile')
    return null
  }

  function handleNav(tab: NavTab) {
    setActiveTab(tab)
    setScreen(tab)
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
        return <ProfileScreen onLogout={handleLogout} />
      case 'dashboard':
        return <DashboardScreen onOpenCamera={() => handleNav('camera')} />
      case 'camera':
        return <CameraScreen />
      case 'map':
        return <MapScreen />
      case 'clue':
        return <ClueScreen />
      case 'leaderboard':
        return <LeaderboardScreen />
      default:
        return <ProfileScreen onLogout={handleLogout} />
    }
  }

  return (
    <AppShell active={activeTab} onNav={handleNav}>
      {renderScreen()}
    </AppShell>
  )
}
