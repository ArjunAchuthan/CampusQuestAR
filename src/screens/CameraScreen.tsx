import React, { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/useAuth'
import { useCamera } from '@/lib/useCamera'
import { useQuestProgress } from '@/lib/progress'
import { useGeofence } from '@/lib/useGeofence'
import { completeLocationGame } from '@/lib/progress'
import { CheckpointGame } from '@/components/games/CheckpointGame'

/**
 * CameraScreen
 *
 * Full-bleed AR camera viewfinder gated by Geofence:
 * - In plain scanning mode when outside geofence radius without leaking distances.
 * - Opens the current checkpoint mini-game when withinRange is true.
 */
export function CameraScreen({ onClueUnlocked }: { onClueUnlocked: () => void }) {
  const { user } = useAuth()
  const { videoRef, status: cameraStatus, errorMessage: cameraError, retry: retryCamera } = useCamera()

  const {
    currentLocation,
    currentLocationIndex,
    progress,
    isCurrentUnlocked,
    unlockCurrent,
    loading: progressLoading,
  } = useQuestProgress(user?.uid)

  const {
    withinRange,
  } = useGeofence(currentLocation?.coords, currentLocation?.unlockRadius || 20)
  const showActiveCheckpoint = withinRange

  // Auto-stamp unlockedAt in Firestore upon first reaching the checkpoint geofence
  const hasUnlockedRef = useRef<string | null>(null)

  useEffect(() => {
    if (withinRange && !isCurrentUnlocked && currentLocation && hasUnlockedRef.current !== currentLocation.id && user?.uid) {
      hasUnlockedRef.current = currentLocation.id
      unlockCurrent().catch(console.error)
    }
  }, [withinRange, isCurrentUnlocked, currentLocation, unlockCurrent, user?.uid])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0d',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* ── 1. Live Camera Video Element (Full-Bleed) ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Keep the inline camera stream alive beneath the transparent WebXR canvas.
          // This avoids a black view on browsers whose AR compositor temporarily drops passthrough.
          display: cameraStatus === 'active' ? 'block' : 'none',
          zIndex: 11,
        }}
      />

      {/* ── 2. Loading State ── */}
      {cameraStatus === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 12,
            background: 'linear-gradient(160deg, #0a0a0d 0%, #0f0f14 60%, #0c0c0f 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(139, 188, 212, 0.15)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: '#8BBCD4',
                animation: 'spin 0.85s linear infinite',
              }}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#F2F2F7', letterSpacing: '-0.01em' }}>
              Starting AR Camera…
            </div>
            <div style={{ fontSize: 12, color: 'rgba(139, 188, 212, 0.65)', marginTop: 4 }}>
              Connecting to rear video stream
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Permission Denied / Error States ── */}
      {(cameraStatus === 'denied' || cameraStatus === 'not-found' || cameraStatus === 'error') && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 14,
            background: 'rgba(10, 10, 13, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 28px',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 380,
              width: '100%',
              textAlign: 'center',
              padding: '30px 24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: cameraStatus === 'denied' ? 'rgba(255, 69, 58, 0.14)' : 'rgba(139, 188, 212, 0.12)',
                border: `1px solid ${cameraStatus === 'denied' ? 'rgba(255, 69, 58, 0.4)' : 'rgba(139, 188, 212, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px',
              }}
            >
              {cameraStatus === 'denied' ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8BBCD4" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>

            <div style={{ fontSize: 18, fontWeight: 700, color: '#F2F2F7', marginBottom: 8 }}>
              {cameraStatus === 'denied' ? 'Camera Access Required' : 'Camera Unavailable'}
            </div>

            <p style={{ fontSize: 13, color: 'rgba(242, 242, 247, 0.6)', lineHeight: 1.5, margin: '0 0 22px' }}>
              {cameraError || 'Unable to start camera feed.'}
            </p>

            <button
              onClick={retryCamera}
              className="primary-btn"
              style={{ padding: '13px 22px', fontSize: 14 }}
            >
              Retry Camera
            </button>
          </div>
        </div>
      )}

      {/* ── 4. AR Scan Reticle ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 13,
        }}
      >
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          <div
            className="reticle-corner tl"
            style={{
              borderColor: showActiveCheckpoint ? '#34C759' : undefined,
              opacity: showActiveCheckpoint ? 1 : 0.85,
              transition: 'border-color 0.3s ease',
            }}
          />
          <div
            className="reticle-corner tr"
            style={{
              borderColor: showActiveCheckpoint ? '#34C759' : undefined,
              opacity: showActiveCheckpoint ? 1 : 0.85,
              transition: 'border-color 0.3s ease',
            }}
          />
          <div
            className="reticle-corner bl"
            style={{
              borderColor: showActiveCheckpoint ? '#34C759' : undefined,
              opacity: showActiveCheckpoint ? 1 : 0.85,
              transition: 'border-color 0.3s ease',
            }}
          />
          <div
            className="reticle-corner br"
            style={{
              borderColor: showActiveCheckpoint ? '#34C759' : undefined,
              opacity: showActiveCheckpoint ? 1 : 0.85,
              transition: 'border-color 0.3s ease',
            }}
          />

          {/* Center Target Dot */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: showActiveCheckpoint ? '#34C759' : '#8BBCD4',
              boxShadow: `0 0 12px ${showActiveCheckpoint ? '#34C759' : '#8BBCD4'}`,
              animation: 'pulse 1.8s ease-in-out infinite',
            }}
          />

          {/* Sweep scan */}
          <div
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              height: 2,
              background: showActiveCheckpoint
                ? 'linear-gradient(90deg, transparent, rgba(52,199,89,0.9), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(139,188,212,0.8), transparent)',
              boxShadow: `0 0 10px ${showActiveCheckpoint ? 'rgba(52,199,89,0.6)' : 'rgba(139,188,212,0.5)'}`,
              animation: 'scanSweep 2.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* ── 5. Instruction / Status Pill (Top) ── */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-top) + var(--banner-h) + 14px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: showActiveCheckpoint ? 'rgba(20, 36, 26, 0.85)' : 'rgba(14, 14, 16, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${showActiveCheckpoint ? 'rgba(52, 199, 89, 0.35)' : 'rgba(255, 255, 255, 0.1)'}`,
          borderRadius: 100,
          padding: '8px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
          zIndex: 15,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: showActiveCheckpoint ? '#34C759' : '#8BBCD4',
            boxShadow: `0 0 8px ${showActiveCheckpoint ? '#34C759' : '#8BBCD4'}`,
            flexShrink: 0,
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: showActiveCheckpoint ? '#34C759' : 'rgba(242, 242, 247, 0.85)',
            letterSpacing: '-0.01em',
          }}
        >
          {showActiveCheckpoint ? '✨ Checkpoint reached · signal puzzle active' : 'Reach the marked checkpoint to activate its signal'}
        </span>
      </div>

      {/* ── 6. Checkpoint mini-game (only active at the current location) ── */}
      {!progressLoading && progress && showActiveCheckpoint && currentLocation && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 16,
            animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
          }}
        >
          <CheckpointGame
            key={currentLocation.id}
            locationIndex={currentLocationIndex}
            screenSpace
            alreadyDone={progress?.completedGameIds?.includes(currentLocation.id)}
            onComplete={async () => {
              if (!user?.uid) throw new Error('Sign in to save quest progress.')
              const saved = await completeLocationGame(user.uid, currentLocationIndex, currentLocation.id)
              if (!saved) throw new Error('Could not save quest progress.')
              onClueUnlocked()
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes scanSweep {
          0% { top: 12px; opacity: 0.2; }
          50% { top: 206px; opacity: 1; }
          100% { top: 12px; opacity: 0.2; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.85); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes popIn {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
