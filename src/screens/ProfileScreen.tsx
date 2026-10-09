import React, { useState, Fragment } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useUserProfile } from '@/lib/useUserProfile'
import { useQuestProgress } from '@/lib/progress'
import { Skel } from '@/components/common/Skeleton'
import { IcoSignOut, IcoPen } from '@/components/icons'
import { AvatarModal } from '@/components/profile/AvatarModal'

export interface ProfileScreenProps {
  onLogout: () => void
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { user } = useAuth()
  const { profile, avatar, displayName, email, loading: loadingProfile, selectAvatar } = useUserProfile(user?.uid)
  const { currentLocationIndex, loading: loadingProgress } = useQuestProgress(user?.uid)

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  const completedCount = currentLocationIndex

  return (
    <div className="screen-body">
      {/* ── Sign out button (top right per design reference) ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(242,242,247,0.36)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            padding: '4px 2px',
            transition: 'color 0.2s',
          }}
        >
          <IcoSignOut size={15} />
          Sign Out
        </button>
      </div>

      {/* ── Avatar + Name ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 34,
        }}
      >
        {/* Avatar circle with pen icon (or skeleton during initial load) */}
        {!avatar || loadingProfile ? (
          <div style={{ marginBottom: 16 }}>
            <Skel w="78px" h="78px" r="50%" />
          </div>
        ) : (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div
              onClick={() => setIsAvatarModalOpen(true)}
              title="Choose Avatar"
              style={{
                width: 78,
                height: 78,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.055)',
                border: '1px solid rgba(255,255,255,0.09)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="cta-card"
            >
              <img
                src={avatar.url}
                alt={displayName}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>

            {/* Small pen icon attached to avatar */}
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              title="Edit Avatar"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: '#0E1118',
                border: '1.5px solid #8BBCD4',
                color: '#8BBCD4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              <IcoPen size={12} />
            </button>
          </div>
        )}

        {/* Display name and subtitle */}
        {loadingProfile || !displayName ? (
          <>
            <Skel w="148px" h="24px" r="9px" style={{ marginBottom: 9 }} />
            <Skel w="104px" h="14px" r="5px" />
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#F2F2F7',
                letterSpacing: '-0.01em',
                marginBottom: 4,
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(242,242,247,0.45)' }}>
              {email || 'Player'}
            </div>
          </>
        )}
      </div>

      {/* ── Progress Stepper — 7 steps ── */}
      <div className="glass-card" style={{ marginBottom: 14 }}>
        <div className="label-caps" style={{ marginBottom: 18 }}>
          Quest Progress
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const isDone = i < completedCount
            const isCurrent = i === completedCount

            return (
              <Fragment key={i}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isDone
                      ? '#34C759'
                      : isCurrent
                      ? 'rgba(139, 188, 212, 0.2)'
                      : 'rgba(255, 255, 255, 0.06)',
                    border: isDone
                      ? '1px solid #34C759'
                      : isCurrent
                      ? '1px solid #8BBCD4'
                      : '1px solid rgba(255, 255, 255, 0.09)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isCurrent ? '0 0 10px rgba(139, 188, 212, 0.35)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      color: isDone ? '#07090e' : isCurrent ? '#8BBCD4' : 'rgba(242, 242, 247, 0.28)',
                      fontWeight: 600,
                    }}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                </div>
                {i < 6 && (
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: isDone ? '#34C759' : 'rgba(255, 255, 255, 0.08)',
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </Fragment>
            )
          })}
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(242, 242, 247, 0.30)' }}>
            {loadingProgress
              ? 'Location _ of 7 completed'
              : `Location ${completedCount} of 7 completed`}
          </span>
        </div>
      </div>

      {/* ── Stats Row: Best Time, Attempts, Rank ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Best Time', val: '—' },
          { label: 'Attempts', val: completedCount > 0 ? `${completedCount}` : '—' },
          { label: 'Rank', val: completedCount > 0 ? `#${Math.max(1, 8 - completedCount)}` : '—' },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="glass-card"
            style={{ padding: '16px 14px', textAlign: 'center' }}
          >
            <div
              className="label-caps"
              style={{ marginBottom: 10, fontSize: 9.5, letterSpacing: '0.11em' }}
            >
              {label}
            </div>
            {loadingProgress ? (
              <Skel w="100%" h="22px" r="7px" />
            ) : (
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F2F2F7', letterSpacing: '-0.01em' }}>
                {val}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Avatar Selection Modal ── */}
      {avatar && (
        <AvatarModal
          isOpen={isAvatarModalOpen}
          currentAvatarId={avatar.id}
          onSelectAvatar={(id) => {
            selectAvatar(id)
          }}
          onClose={() => setIsAvatarModalOpen(false)}
        />
      )}
    </div>
  )
}
