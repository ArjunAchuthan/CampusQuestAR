import React from 'react'
import { useAuth } from '@/lib/useAuth'
import { useUserProfile } from '@/lib/useUserProfile'
import { useQuestProgress } from '@/lib/progress'
import { Skel } from '@/components/common/Skeleton'
import { IcoCamera } from '@/components/icons'

export interface DashboardScreenProps {
  onOpenCamera: () => void
}

export function DashboardScreen({ onOpenCamera }: DashboardScreenProps) {
  const { user } = useAuth()
  const { avatar, displayName, loading: loadingProfile } = useUserProfile(user?.uid)
  const { currentLocation, currentLocationIndex, loading: loadingProgress } = useQuestProgress(user?.uid)

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="screen-body">
      {/* ── Greeting Header with Equipped Avatar ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 26,
        }}
      >
        <div>
          <div className="label-caps" style={{ marginBottom: 4 }}>
            {greeting}
          </div>
          {loadingProfile || !displayName ? (
            <Skel w="168px" h="28px" r="8px" />
          ) : (
            <div style={{ fontSize: 24, fontWeight: 700, color: '#F2F2F7', letterSpacing: '-0.02em' }}>
              {displayName}
            </div>
          )}
        </div>

        {/* Equipped Avatar Badge */}
        {!avatar || loadingProfile ? (
          <Skel w="56px" h="56px" r="50%" />
        ) : (
          <div
            style={{
              position: 'relative',
              width: 56,
              height: 56,
              borderRadius: '50%',
              padding: 2.5,
              background: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5), 0 0 16px rgba(247, 107, 28, 0.2)',
              flexShrink: 0,
            }}
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
                background: '#12141a',
              }}
            />
          </div>
        )}
      </div>

      {/* ── Progress Card ── */}
      <div className="glass-card" style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 16,
          }}
        >
          <div>
            <div className="label-caps" style={{ marginBottom: 6 }}>
              Current Target
            </div>
            {loadingProgress ? (
              <Skel w="144px" h="22px" r="8px" />
            ) : (
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F2F2F7' }}>
                {currentLocation?.name || `Location ${currentLocationIndex + 1}`}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: 'rgba(139,188,212,0.85)',
              letterSpacing: '0.04em',
              paddingTop: 2,
            }}
          >
            Location {currentLocationIndex + 1} of 7
          </div>
        </div>

        {/* 7-segment progress bar */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background:
                  i < currentLocationIndex
                    ? '#34C759'
                    : i === currentLocationIndex
                    ? '#8BBCD4'
                    : 'rgba(255,255,255,0.09)',
                boxShadow:
                  i === currentLocationIndex
                    ? '0 0 8px rgba(139,188,212,0.5)'
                    : i < currentLocationIndex
                    ? '0 0 6px rgba(52,199,89,0.3)'
                    : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: 'rgba(242,242,247,0.5)',
          }}
        >
          <span>{currentLocationIndex} Completed</span>
          <span>{7 - currentLocationIndex} Remaining</span>
        </div>
      </div>

      {/* ── CTA: Open Camera ── */}
      <div
        className="glass-card cta-card"
        onClick={onOpenCamera}
        style={{ padding: '28px 24px', textAlign: 'center', marginBottom: 14 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(139,188,212,0.11)',
            border: '1px solid rgba(139,188,212,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#8BBCD4',
          }}
        >
          <IcoCamera size={24} />
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#F2F2F7',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
          Open AR Camera
        </div>
        <div style={{ fontSize: 13, color: 'rgba(242,242,247,0.4)', lineHeight: 1.5 }}>
          Scan your surroundings when in range to reveal clues
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="glass-card" style={{ padding: '16px 16px' }}>
          <div className="label-caps" style={{ marginBottom: 6 }}>
            Quest Status
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#34C759' }}>
            In Progress
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 16px' }}>
          <div className="label-caps" style={{ marginBottom: 6 }}>
            Target Checkpoint
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#8BBCD4' }}>
            #{currentLocationIndex + 1}
          </div>
        </div>
      </div>
    </div>
  )
}
