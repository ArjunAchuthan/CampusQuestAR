import React from 'react'
import { IcoSignOut } from '@/components/icons'

export function SignOutButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Sign out"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        minHeight: 36,
        padding: '0 12px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,.12)',
        background: 'rgba(255,255,255,.055)',
        color: 'rgba(242,242,247,.78)',
        font: 'inherit',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      <IcoSignOut size={15} />
      <span>Sign out</span>
    </button>
  )
}

export function TopBanner({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="banner">
      <div className="banner-inner">
        <span className="wordmark">Campus Quest AR</span>
        <SignOutButton onClick={onLogout} />
      </div>
    </div>
  )
}
