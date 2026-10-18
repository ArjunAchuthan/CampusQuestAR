import React, { useState, useEffect, useRef } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { registerParticipant, fetchRegisteredParticipants, deleteParticipant } from '@/lib/admin'
import { getUserProfileRef } from '@/lib/participantId'
import type { ParticipantUser } from '@/types'
import { Skel } from '@/components/common/Skeleton'

/**
 * RegistrationDeskScreen
 *
 * Accessible at /register (or #/register) — no admin login required.
 * Uses isolated secondary Firebase Auth instance so the registration desk browser
 * never gets logged in as the new player.
 */
export function RegistrationDeskScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Success popup modal data
  const [successData, setSuccessData] = useState<{
    name: string
    participantId?: string
    email: string
    password?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Delete confirmation modal state
  const [userToDelete, setUserToDelete] = useState<ParticipantUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Quick toast message (e.g. for deleted user)
  const [toast, setToast] = useState<string | null>(null)

  // Participants roster
  const [participants, setParticipants] = useState<ParticipantUser[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const nameInputRef = useRef<HTMLInputElement>(null)

  // Realtime subscription to users collection for instant roster updates
  useEffect(() => {
    setLoadingList(true)
    const usersCol = collection(db, 'users')

    const unsubscribe = onSnapshot(
      usersCol,
      async (snap) => {
        // Migrate every legacy user profile, including admin profiles, so this
        // public registration desk can complete the one-time document ID change.
        const migratedProfiles = await Promise.all(snap.docs.map(async (docSnap) => {
          const data = docSnap.data() as ParticipantUser
          const uid = data.uid || docSnap.id
          const numericId = /^\d{6}$/.test(docSnap.id)
          if (!numericId) {
            try { await getUserProfileRef(uid) } catch (error) { console.warn('Could not migrate user profile:', error) }
          }
          return { docSnap, data, uid }
        }))

        const list = migratedProfiles
          .filter(({ data }) => data.role === 'participant')
          .map(({ docSnap, data, uid }): ParticipantUser => {
            const participantId = /^\d{6}$/.test(docSnap.id) ? docSnap.id : undefined
            return {
              uid,
              participantId,
              email: data.email || '',
              displayName: data.displayName || 'Unnamed Player',
              role: data.role,
              createdAt: data.createdAt,
            }
          })

        // Sort descending by registration date
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)
          const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)
          return timeB - timeA
        })

        setParticipants(list)
        setLoadingList(false)
      },
      async (err) => {
        console.warn('Realtime snapshot listener error, falling back to fetch:', err)
        const fallbackList = await fetchRegisteredParticipants()
        setParticipants(fallbackList)
        setLoadingList(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleManualRefresh = async () => {
    setLoadingList(true)
    const list = await fetchRegisteredParticipants()
    setParticipants(list)
    setLoadingList(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCopied(false)

    const trimmedName = displayName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError("Please enter the participant's full name.")
      return
    }
    if (!trimmedEmail) {
      setError("Please enter the participant's email address.")
      return
    }
    if (!password.trim()) {
      setError('Please enter a password for the participant.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.')
      return
    }

    setSubmitting(true)

    try {
      const res = await registerParticipant({
        displayName: trimmedName,
        email: trimmedEmail,
        password: password.trim(),
      })

      if (!res.success) {
        setError(res.error || 'Failed to register participant. Please try again.')
        setSubmitting(false)
      } else {
        // Reset form immediately
        setDisplayName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setError(null)
        setSubmitting(false)

        // Trigger Success Popup Modal
        setSuccessData({
          name: trimmedName,
          participantId: res.participantId,
          email: trimmedEmail,
          password: res.password || password.trim(),
        })
      }
    } catch {
      setError('An unexpected error occurred while registering. Please try again.')
      setSubmitting(false)
    }
  }

  const handleCloseSuccessModal = () => {
    setSuccessData(null)
    setCopied(false)
    // Refocus name input for fast registration of the next player
    setTimeout(() => {
      nameInputRef.current?.focus()
    }, 100)
  }

  const handleCopyCredentials = () => {
    if (!successData) return
    const text = `Campus Quest AR\nPlayer: ${successData.name}\nPlayer ID: ${successData.participantId || ''}\nEmail: ${successData.email}\nPassword: ${successData.password || ''}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const res = await deleteParticipant(userToDelete.uid)
      if (!res.success) {
        setDeleteError(res.error || 'Failed to delete participant.')
        setDeleting(false)
      } else {
        const deletedName = userToDelete.displayName
        setUserToDelete(null)
        setDeleting(false)
        setToast(`Deleted "${deletedName}" successfully.`)
        setTimeout(() => setToast(null), 3500)
      }
    } catch {
      setDeleteError('An unexpected error occurred while deleting.')
      setDeleting(false)
    }
  }

  const passwordMismatch = !!confirmPassword && password !== confirmPassword
  const passwordMatch = !!confirmPassword && password === confirmPassword

  const filteredParticipants = participants.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return p.displayName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.participantId?.includes(q)
  })

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(145deg, #090b10 0%, #0d121c 50%, #080c14 100%)',
        paddingBottom: 80,
        position: 'relative',
        color: '#F2F2F7',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Toast Notification Banner ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            background: 'rgba(28, 32, 44, 0.95)',
            border: '1px solid rgba(139, 188, 212, 0.35)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
            borderRadius: 14,
            padding: '12px 20px',
            fontSize: 13.5,
            fontWeight: 500,
            color: '#F2F2F7',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeIn 0.2s ease',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759' }} />
          <span>{toast}</span>
        </div>
      )}

      {/* ── 1. Snappy Sub-Second Loading Screen Overlay ── */}
      {submitting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(5, 7, 12, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            animation: 'fadeIn 0.12s ease',
          }}
        >
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid rgba(139, 188, 212, 0.15)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: '#8BBCD4',
                borderRightColor: '#5a8fa8',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: '#F2F2F7',
                letterSpacing: '-0.02em',
              }}
            >
              Creating Account…
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(139, 188, 212, 0.75)', marginTop: 4 }}>
              Registering player & initializing quest data…
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Delete Confirmation Modal ── */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
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
              boxShadow: '0 24px 64px rgba(0,0,0,0.85), 0 0 35px rgba(255,69,58,0.14)',
              position: 'relative',
              animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Warning Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(255, 69, 58, 0.14)',
                  border: '2px solid rgba(255, 69, 58, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 28px rgba(255, 69, 58, 0.25)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
            </div>

            {/* Title & Warning */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#F2F2F7', marginBottom: 6 }}>
                Delete Participant?
              </div>
              <p style={{ fontSize: 13, color: 'rgba(242, 242, 247, 0.55)', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this participant? This action cannot be undone.
              </p>
            </div>

            {/* Target Player Pill */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '12px 16px',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F2F2F7', marginBottom: 2 }}>
                {userToDelete.displayName}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(242, 242, 247, 0.4)' }}>
                {userToDelete.email}
              </div>
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

            {/* Actions */}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Instant Success Popup Notification Card ── */}
      {successData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.80)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
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
              maxWidth: 460,
              background: 'rgba(18, 22, 32, 0.96)',
              border: '1px solid rgba(52, 199, 89, 0.35)',
              borderRadius: 24,
              padding: '26px 24px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 35px rgba(52,199,89,0.12)',
              position: 'relative',
              animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Top Close Button */}
            <button
              onClick={handleCloseSuccessModal}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(242, 242, 247, 0.6)',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>

            {/* Success Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  background: 'rgba(52, 199, 89, 0.14)',
                  border: '2px solid rgba(52, 199, 89, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(52, 199, 89, 0.25)',
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="#34C759"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#F2F2F7',
                  letterSpacing: '-0.02em',
                  marginBottom: 6,
                }}
              >
                Player Registered!
              </div>
              <div style={{ fontSize: 13, color: 'rgba(52, 199, 89, 0.9)', fontWeight: 500 }}>
                Account successfully created and added to Event Roster
              </div>
            </div>

            {/* Player Details Card */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 16,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242, 242, 247, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Full Name
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#F2F2F7' }}>
                  {successData.name}
                </span>
              </div>

              <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242, 242, 247, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Player ID
                </span>
                <code style={{ fontSize: 14, color: '#8BBCD4', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {successData.participantId || 'Assigning…'}
                </code>
              </div>

              <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242, 242, 247, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email
                </span>
                <span style={{ fontSize: 13.5, color: '#8BBCD4', fontWeight: 500 }}>
                  {successData.email}
                </span>
              </div>

              <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242, 242, 247, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Password
                </span>
                <code
                  style={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    color: '#F2F2F7',
                  }}
                >
                  {successData.password || '••••••••'}
                </code>
              </div>

              <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(242, 242, 247, 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34C759', boxShadow: '0 0 6px #34C759' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#34C759' }}>Active & Ready</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleCloseSuccessModal}
                className="primary-btn"
                style={{
                  background: '#34C759',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '14px 20px',
                  borderRadius: 14,
                  border: 'none',
                  boxShadow: '0 4px 18px rgba(52, 199, 89, 0.35)',
                }}
              >
                ✓ Register Next Player
              </button>

              <button
                onClick={handleCopyCredentials}
                style={{
                  background: copied ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${copied ? 'rgba(52, 199, 89, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
                  color: copied ? '#34C759' : '#8BBCD4',
                  padding: '12px 18px',
                  borderRadius: 14,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {copied ? (
                  <>✓ Copied Credentials to Clipboard</>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy Player Credentials
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div
        style={{
          background: 'rgba(139, 188, 212, 0.06)',
          borderBottom: '1px solid rgba(139, 188, 212, 0.15)',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: 'linear-gradient(135deg, #8BBCD4 0%, #4a8099 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139, 188, 212, 0.25)',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#070b12"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 17.5, fontWeight: 700, color: '#F2F2F7', letterSpacing: '-0.02em' }}>
            Campus Quest AR
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'rgba(139, 188, 212, 0.85)',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Participant Registration Desk
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'rgba(52, 199, 89, 0.12)',
            border: '1px solid rgba(52, 199, 89, 0.28)',
            borderRadius: 20,
            padding: '5px 12px',
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#34C759',
              boxShadow: '0 0 8px #34C759',
            }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#34C759' }}>Desk Active</span>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>
        {/* ── Registration Form ── */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.035)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 22,
            padding: '26px 24px',
            marginBottom: 28,
            boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#F2F2F7',
                letterSpacing: '-0.02em',
                marginBottom: 4,
              }}
            >
              New Participant Registration
            </div>
            <p style={{ fontSize: 13, color: 'rgba(242, 242, 247, 0.45)', margin: 0, lineHeight: 1.5 }}>
              Register a player to instantly grant access. Form will automatically clear after registration.
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Participant Full Name</label>
              <input
                ref={nameInputRef}
                className="glass-input"
                type="text"
                placeholder="e.g. Alex Rivera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>

            <div>
              <label style={labelStyle}>Participant Email</label>
              <input
                className="glass-input"
                type="email"
                placeholder="player@example.com"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Password{' '}
                <span style={{ color: 'rgba(242,242,247,0.35)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  — ask the player
                </span>
              </label>
              <input
                className="glass-input"
                type="password"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                className="glass-input"
                type="password"
                placeholder="Re-enter password to verify"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                style={
                  passwordMismatch
                    ? { borderColor: 'rgba(255, 70, 70, 0.6)', background: 'rgba(255, 70, 70, 0.05)' }
                    : passwordMatch
                    ? { borderColor: 'rgba(52, 199, 89, 0.5)', background: 'rgba(52, 199, 89, 0.04)' }
                    : undefined
                }
              />
              {passwordMismatch && (
                <div style={{ fontSize: 12, color: '#FF8A8A', marginTop: 6, fontWeight: 500 }}>
                  ✕ Passwords do not match
                </div>
              )}
              {passwordMatch && (
                <div style={{ fontSize: 12, color: '#34C759', marginTop: 6, fontWeight: 500 }}>
                  ✓ Passwords match
                </div>
              )}
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'rgba(255, 70, 70, 0.12)',
                  border: '1px solid rgba(255, 70, 70, 0.3)',
                  color: '#FF9E9E',
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="primary-btn"
              disabled={submitting || passwordMismatch}
              style={{
                marginTop: 6,
                opacity: submitting || passwordMismatch ? 0.6 : 1,
                cursor: submitting || passwordMismatch ? 'not-allowed' : 'pointer',
                padding: '16px',
                fontSize: 15.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {submitting ? 'Registering Participant…' : 'Register Participant'}
            </button>
          </form>
        </div>

        {/* ── 3. Live Event Roster ── */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 22,
            padding: '22px 24px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(139, 188, 212, 0.75)',
                  marginBottom: 3,
                }}
              >
                Live Event Roster
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F2F2F7' }}>
                {loadingList ? 'Updating Roster…' : `${participants.length} Registered ${participants.length === 1 ? 'Player' : 'Players'}`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                placeholder="Search roster…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  color: '#F2F2F7',
                  padding: '7px 12px',
                  fontSize: 12.5,
                  outline: 'none',
                  width: 140,
                }}
              />
              <button
                onClick={handleManualRefresh}
                disabled={loadingList}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  color: loadingList ? 'rgba(139, 188, 212, 0.4)' : '#8BBCD4',
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: loadingList ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
              >
                {loadingList ? 'Syncing…' : 'Sync'}
              </button>
            </div>
          </div>

          {loadingList ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skel h="50px" r="12px" />
              <Skel h="50px" r="12px" />
              <Skel h="50px" r="12px" />
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div
              style={{
                padding: '36px 0',
                textAlign: 'center',
                color: 'rgba(242, 242, 247, 0.35)',
                fontSize: 13.5,
              }}
            >
              {searchQuery ? 'No matching participants found.' : 'No participants registered yet. Use the form above to register players.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredParticipants.map((p, idx) => (
                <div
                  key={p.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 14,
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(139, 188, 212, 0.12)',
                        border: '1px solid rgba(139, 188, 212, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#8BBCD4',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F2F2F7', marginBottom: 2 }}>
                        {p.displayName}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(242, 242, 247, 0.42)' }}>{p.email}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(139, 188, 212, 0.8)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                        Player ID · {p.participantId || 'Assigning…'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#34C759',
                        background: 'rgba(52, 199, 89, 0.1)',
                        border: '1px solid rgba(52, 199, 89, 0.25)',
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34C759' }} />
                      Active
                    </div>

                    {/* Dustbin / Trash Delete Button */}
                    <button
                      type="button"
                      onClick={() => setUserToDelete(p)}
                      title={`Delete ${p.displayName}`}
                      style={{
                        background: 'rgba(255, 69, 58, 0.08)',
                        border: '1px solid rgba(255, 69, 58, 0.22)',
                        borderRadius: 8,
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FF453A',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 69, 58, 0.20)'
                        e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.45)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 69, 58, 0.08)'
                        e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.22)'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.88); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'rgba(139, 188, 212, 0.85)',
  marginBottom: 8,
}
