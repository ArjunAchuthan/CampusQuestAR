import React from 'react'
import { useAuth } from '@/lib/useAuth'
import { useQuestProgress } from '@/lib/progress'
import { Skel } from '@/components/common/Skeleton'
import { IcoMap } from '@/components/icons'

export function ClueScreen() {
  const { user } = useAuth()
  const { currentLocation, currentLocationIndex, isCurrentUnlocked, loading } = useQuestProgress(user?.uid)

  return (
    <div
      className="screen-body"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: 360, padding: '32px 26px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div className="label-caps">Current Clue</div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(139,188,212,0.85)',
              letterSpacing: '0.04em',
            }}
          >
            {loading ? 'Location _ of 7' : `Location ${currentLocationIndex + 1} of 7`}
          </div>
        </div>

        {/* Clue Text Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
            <Skel h="15px" r="6px" />
            <Skel w="88%" h="15px" r="6px" />
            <Skel w="74%" h="15px" r="6px" />
          </div>
        ) : (
          <div style={{ marginBottom: 26 }}>
            <p
              style={{
                fontSize: 15.5,
                lineHeight: 1.65,
                color: '#F2F2F7',
                margin: 0,
                fontWeight: 450,
                letterSpacing: '-0.01em',
              }}
            >
              {currentLocation?.clue || 'Search your campus surroundings to locate the secret checkpoint.'}
            </p>

            {currentLocation?.hint && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: 'rgba(139, 188, 212, 0.08)',
                  border: '1px solid rgba(139, 188, 212, 0.2)',
                  borderRadius: 12,
                  fontSize: 12.5,
                  color: 'rgba(139, 188, 212, 0.9)',
                  lineHeight: 1.4,
                }}
              >
                💡 <strong>Hint:</strong> {currentLocation.hint}
              </div>
            )}
          </div>
        )}

        <div className="divider" style={{ margin: '0 0 20px' }} />

        {/* Footer row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label-caps" style={{ marginBottom: 4 }}>
              Location Name
            </div>
            {loading ? (
              <Skel w="108px" h="16px" r="6px" />
            ) : (
              <div style={{ fontSize: 14.5, fontWeight: 600, color: '#F2F2F7' }}>
                {currentLocation?.name || `Checkpoint ${currentLocationIndex + 1}`}
              </div>
            )}
          </div>

          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: isCurrentUnlocked ? 'rgba(52,199,89,0.12)' : 'rgba(139,188,212,0.09)',
              border: `1px solid ${isCurrentUnlocked ? 'rgba(52,199,89,0.3)' : 'rgba(139,188,212,0.17)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCurrentUnlocked ? '#34C759' : 'rgba(139,188,212,0.75)',
            }}
          >
            <IcoMap size={16} />
          </div>
        </div>
      </div>
    </div>
  )
}
