import React, { useState, useEffect } from 'react'
import {
  registerParticipant,
  fetchRegisteredParticipants,
  generateTemporaryPassword,
  deleteParticipant,
} from '@/lib/admin'
import type { ParticipantUser } from '@/types'
import { Skel } from '@/components/common/Skeleton'
import { SignOutButton } from '@/components/shell/TopBanner'

export interface AdminRegisterScreenProps {
  onLogout: () => void
}

export function AdminRegisterScreen({ onLogout }: AdminRegisterScreenProps) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Last registered user credentials banner for easy copying
  const [lastCreated, setLastCreated] = useState<{
    name: string
    participantId: string
    email: string
    password: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Delete confirmation modal state
  const [userToDelete, setUserToDelete] = useState<ParticipantUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Participants list
  const [participants, setParticipants] = useState<ParticipantUser[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadParticipants = async () => {
    setLoadingList(true)
    const list = await fetchRegisteredParticipants()
    setParticipants(list)
    setLoadingList(false)
  }

  useEffect(() => {
    loadParticipants()
  }, [])

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const res = await deleteParticipant(userToDelete.uid)
      if (!res.success) {
        setDeleteError(res.error || 'Failed to delete participant.')
      } else {
        setUserToDelete(null)
        loadParticipants()
      }
    } catch {
      setDeleteError('An unexpected error occurred while deleting.')
    } finally {
      setDeleting(false)
    }
  }

  const handleGeneratePassword = () => {
    const newPass = generateTemporaryPassword()
    setPassword(newPass)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCopied(false)

    if (!displayName.trim() || !email.trim()) {
      setError('Please provide both a participant name and email.')
      return
    }

    const passToUse = password.trim() || generateTemporaryPassword()
    setPassword(passToUse)
    setSubmitting(true)

    try {
      const res = await registerParticipant({
        displayName,
        email,
        password: passToUse,
      })

      if (!res.success) {
        setError(res.error || 'Failed to register participant.')
      } else {
        setLastCreated({
          name: displayName.trim(),
          participantId: res.participantId || '',
          email: email.trim().toLowerCase(),
          password: passToUse,
        })
        // Reset form fields
        setDisplayName('')
        setEmail('')
        setPassword('')
        // Refresh participants table
        loadParticipants()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyCredentials = () => {
    if (!lastCreated) return
    const text = `Campus Quest AR Credentials\nName: ${lastCreated.name}\nPlayer ID: ${lastCreated.participantId}\nEmail: ${lastCreated.email}\nPassword: ${lastCreated.password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const filteredParticipants = participants.filter((p) => {
    const q = searchQuery.toLowerCase()
    return (
      p.displayName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.participantId?.includes(q)
    )
  })

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#000',
        padding: '24px 20px 60px',
        paddingTop: 'calc(var(--safe-top) + 24px)',
        paddingBottom: 'calc(var(--safe-bottom) + 40px)',
        maxWidth: 680,
        margin: '0 auto',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#F2F2F7',
              letterSpacing: '-0.02em',
            }}
          >
            Participant Registration
          </div>
          <div className="label-caps" style={{ color: 'var(--accent)', marginTop: 4 }}>
            Admin Panel
          </div>
        </div>
        <SignOutButton onClick={onLogout} />
      </div>

      {/* Registration Form Card */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#F2F2F7',
            marginBottom: 4,
            letterSpacing: '-0.01em',
          }}
        >
          Register New Participant
        </div>
        <p
          style={{
            fontSize: 12.5,
            color: 'rgba(242,242,247,0.4)',
            marginBottom: 18,
            lineHeight: 1.4,
          }}
        >
          Create an event account and initialize their quest progress.
        </p>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: 6 }}>
              Participant Full Name
            </label>
            <input
              className="glass-input"
              type="text"
              placeholder="e.g. Alex Rivera"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: 6 }}>
              Participant Email
            </label>
            <input
              className="glass-input"
              type="email"
              placeholder="e.g. player@campusquest.test"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <label className="label-caps">Temporary Password</label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8BBCD4',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                Auto-generate
              </button>
            </div>
            <input
              className="glass-input"
              type="text"
              placeholder="Leave blank to auto-generate"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(255, 70, 70, 0.12)',
                border: '1px solid rgba(255, 70, 70, 0.28)',
                color: '#FF8A8A',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: 6 }}>
            <button
              type="submit"
              className="primary-btn"
              disabled={submitting}
              style={submitting ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
            >
              {submitting ? 'Registering Participant...' : 'Create Participant Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Banner / Credentials to hand over */}
      {lastCreated && (
        <div
          style={{
            padding: '18px 20px',
            background: 'rgba(139, 188, 212, 0.09)',
            border: '1px solid rgba(139, 188, 212, 0.28)',
            borderRadius: 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#8BBCD4',
                }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#F2F2F7' }}>
                Account Created Successfully
              </span>
            </div>

            <button
              onClick={handleCopyCredentials}
              style={{
                background: copied ? '#8BBCD4' : 'rgba(139, 188, 212, 0.16)',
                border: '1px solid rgba(139, 188, 212, 0.3)',
                color: copied ? '#000' : '#8BBCD4',
                borderRadius: 10,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: 'inherit',
              }}
            >
              {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '12px 14px',
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: 'rgba(242,242,247,0.4)', display: 'block', fontSize: 11 }}>
                NAME
              </span>
              <span style={{ color: '#F2F2F7', fontWeight: 500 }}>{lastCreated.name}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(242,242,247,0.4)', display: 'block', fontSize: 11 }}>
                PLAYER ID
              </span>
              <code style={{ color: '#8BBCD4', fontWeight: 700, fontFamily: 'monospace' }}>{lastCreated.participantId || 'Assigning…'}</code>
            </div>
            <div>
              <span style={{ color: 'rgba(242,242,247,0.4)', display: 'block', fontSize: 11 }}>
                EMAIL
              </span>
              <span style={{ color: '#F2F2F7', fontWeight: 500 }}>{lastCreated.email}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(242,242,247,0.4)', display: 'block', fontSize: 11 }}>
                TEMPORARY PASSWORD
              </span>
              <code style={{ color: '#8BBCD4', fontWeight: 600, fontFamily: 'monospace' }}>
                {lastCreated.password}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Registered Participants Directory */}
      <div className="glass-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div className="label-caps" style={{ marginBottom: 2 }}>
              Event Roster
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#F2F2F7' }}>
              Registered Participants ({participants.length})
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(26, 26, 30, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                color: '#F2F2F7',
                padding: '6px 12px',
                fontSize: 12.5,
                outline: 'none',
                width: 170,
              }}
            />
            <button
              onClick={loadParticipants}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: 10,
                color: '#8BBCD4',
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {loadingList ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel h="44px" r="10px" />
            <Skel h="44px" r="10px" />
            <Skel h="44px" r="10px" />
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: 'rgba(242, 242, 247, 0.35)',
              fontSize: 13,
            }}
          >
            {searchQuery
              ? 'No matching participants found.'
              : 'No participants registered yet. Use the form above to add your first player.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredParticipants.map((p, idx) => (
              <div
                key={p.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(139, 188, 212, 0.12)',
                      border: '1px solid rgba(139, 188, 212, 0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#8BBCD4',
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: '#F2F2F7' }}>
                      {p.displayName}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'rgba(242, 242, 247, 0.4)' }}>
                      {p.email}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'rgba(139, 188, 212, 0.8)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                      Player ID · {p.participantId || 'Assigning…'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(139, 188, 212, 0.7)',
                      background: 'rgba(139, 188, 212, 0.08)',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Active
                  </div>

                  <button
                    type="button"
                    onClick={() => setUserToDelete(p)}
                    title={`Delete ${p.displayName}`}
                    style={{
                      background: 'rgba(255, 69, 58, 0.08)',
                      border: '1px solid rgba(255, 69, 58, 0.22)',
                      borderRadius: 8,
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF453A',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: 'rgba(22, 20, 24, 0.98)',
              border: '1px solid rgba(255, 69, 58, 0.35)',
              borderRadius: 24,
              padding: '26px 24px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.85)',
              position: 'relative',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#F2F2F7', marginBottom: 6 }}>
                Delete Participant?
              </div>
              <p style={{ fontSize: 13, color: 'rgba(242, 242, 247, 0.55)', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{userToDelete.displayName}</strong> ({userToDelete.email})? This permanently deletes their account from Authentication and Firestore database.
              </p>
            </div>

            {deleteError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255, 69, 58, 0.12)',
                  border: '1px solid rgba(255, 69, 58, 0.3)',
                  color: '#FF8A8A',
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 14,
                  color: '#F2F2F7',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  background: '#FF453A',
                  border: 'none',
                  borderRadius: 14,
                  color: '#FFFFFF',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 18px rgba(255, 69, 58, 0.35)',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
