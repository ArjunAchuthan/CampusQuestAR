import React, { useState } from 'react'

export interface LoginScreenProps {
  onLogin: (email: string, pass: string) => Promise<{ error: string | null }>
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both your email and password.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const res = await onLogin(email, password)
      if (res.error) {
        setError(res.error)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 28px',
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
      }}
    >
      {/* Wordmark block */}
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: '0.20em',
            color: 'rgba(242,242,247,0.35)',
            textTransform: 'uppercase',
            marginBottom: 14,
            fontWeight: 500,
          }}
        >
          Welcome to
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#F2F2F7',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}
        >
          Campus Quest AR
        </div>
        {/* accent rule */}
        <div
          style={{
            width: 36,
            height: 2,
            background: '#8BBCD4',
            margin: '18px auto 0',
            borderRadius: 2,
            opacity: 0.65,
          }}
        />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <input
          className="glass-input"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          style={error ? { borderColor: 'rgba(255, 100, 100, 0.45)' } : undefined}
          disabled={submitting}
        />
        <input
          className="glass-input"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError(null)
          }}
          style={error ? { borderColor: 'rgba(255, 100, 100, 0.45)' } : undefined}
          disabled={submitting}
        />

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
              letterSpacing: '-0.01em',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <button
            type="submit"
            className="primary-btn"
            disabled={submitting}
            style={submitting ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'rgba(242,242,247,0.26)',
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Accounts are issued by your campus administrator
        </p>
      </form>
    </div>
  )
}
