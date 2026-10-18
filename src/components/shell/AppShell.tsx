import React from 'react'
import type { NavTab } from '@/types'
import { TopBanner } from './TopBanner'
import { BottomNav } from './BottomNav'

export interface AppShellProps {
  active: NavTab | null
  onNav: (tab: NavTab) => void
  onLogout: () => void
  children: React.ReactNode
}

export function AppShell({ active, onNav, onLogout, children }: AppShellProps) {
  return (
    <div style={{ background: '#000', minHeight: '100dvh', position: 'relative' }}>
      <TopBanner onLogout={onLogout} />
      <BottomNav active={active} onNav={onNav} />
      {children}
    </div>
  )
}
