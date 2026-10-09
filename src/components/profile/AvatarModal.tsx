import React from 'react'
import { AVATARS } from '@/lib/avatars'
import { IcoCheck } from '@/components/icons'

export interface AvatarModalProps {
  isOpen: boolean
  currentAvatarId: string
  onSelectAvatar: (id: string) => void
  onClose: () => void
}

export function AvatarModal({
  isOpen,
  currentAvatarId,
  onSelectAvatar,
  onClose,
}: AvatarModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(5, 7, 10, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 380,
          padding: '24px 22px',
          background: 'rgba(16, 18, 24, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(139, 188, 212, 0.1)',
          animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F2F2F7', letterSpacing: '-0.01em' }}>
            Choose Profile Picture
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(242, 242, 247, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            ✕
          </button>
        </div>

        {/* 5 Avatars Grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 24,
            padding: '4px 0',
          }}
        >
          {AVATARS.map((avatar) => {
            const isSelected = avatar.id === currentAvatarId

            return (
              <div
                key={avatar.id}
                onClick={() => onSelectAvatar(avatar.id)}
                style={{
                  position: 'relative',
                  width: 82,
                  height: 82,
                  borderRadius: '50%',
                  padding: 3,
                  cursor: 'pointer',
                  background: isSelected
                    ? 'linear-gradient(135deg, #34C759 0%, #007AFF 100%)'
                    : 'rgba(255, 255, 255, 0.12)',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(52, 199, 89, 0.4), 0 4px 16px rgba(0,0,0,0.5)'
                    : '0 4px 12px rgba(0,0,0,0.3)',
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <img
                  src={avatar.url}
                  alt="Avatar"
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    background: '#12141a',
                  }}
                />

                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#34C759',
                      color: '#07090e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #101218',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    }}
                  >
                    <IcoCheck size={13} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="primary-btn"
          style={{ padding: '13px 20px', fontSize: 14.5, fontWeight: 600 }}
        >
          Done
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.94); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
