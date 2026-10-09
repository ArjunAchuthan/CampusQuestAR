import React, { useState, Fragment } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = 'login' | 'dashboard' | 'camera' | 'map' | 'clue' | 'profile' | 'leaderboard'
type NavTab = 'camera' | 'map' | 'clue' | 'profile' | 'leaderboard'

const NAV_TABS: NavTab[] = ['camera', 'map', 'clue', 'profile', 'leaderboard']
const NAV_LABELS: Record<NavTab, string> = {
  camera: 'Camera', map: 'Map', clue: 'Clue', profile: 'Profile', leaderboard: 'Board',
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({
  w = '100%', h = '16px', r = '8px', style = {},
}: {
  w?: string; h?: string; r?: string; style?: React.CSSProperties
}) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'rgba(255,255,255,0.07)',
      flexShrink: 0,
      ...style,
    }} />
  )
}

// ── Icons (thin-stroke, SF-style) ─────────────────────────────────────────────

const sw = 1.5 // stroke width

function IcoCamera({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IcoMap({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  )
}

function IcoClue({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
    </svg>
  )
}

function IcoProfile({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IcoBoard({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function IcoSignOut({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

const NAV_ICONS: Record<NavTab, (p: { size?: number }) => React.ReactElement> = {
  camera: IcoCamera, map: IcoMap, clue: IcoClue, profile: IcoProfile, leaderboard: IcoBoard,
}

// ── Top Banner ────────────────────────────────────────────────────────────────

function TopBanner() {
  return (
    <div className="banner">
      <div className="banner-inner">
        <span className="wordmark">Campus Quest AR</span>
        {/* future timer / status slot */}
        <div style={{ width: 76, height: 20 }} />
      </div>
    </div>
  )
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────

function BottomNav({
  active, onNav,
}: {
  active: NavTab | null
  onNav: (tab: NavTab) => void
}) {
  const [hovered, setHovered] = useState<NavTab | null>(null)
  const activeIdx = active ? NAV_TABS.indexOf(active) : -1

  // precise capsule metrics (nav pill has 6px horizontal padding)
  const capsuleLeft = (i: number) => `calc(6px + ${i} * (100% - 12px) / 5)`
  const capsuleWidth = 'calc((100% - 12px) / 5)'

  return (
    <div className="nav-outer">
      <div className="nav-pill">
        {/* active capsule — slides with spring easing */}
        {activeIdx >= 0 && (
          <div
            className="nav-capsule"
            style={{ left: capsuleLeft(activeIdx), width: capsuleWidth }}
          />
        )}

        {/* hover glow for inactive tabs */}
        {hovered && hovered !== active && (
          <div
            className="nav-hover-glow"
            style={{
              left: capsuleLeft(NAV_TABS.indexOf(hovered)),
              width: capsuleWidth,
            }}
          />
        )}

        {NAV_TABS.map(tab => {
          const isActive = tab === active
          const isHovered = tab === hovered && !isActive
          const Icon = NAV_ICONS[tab]

          return (
            <button
              key={tab}
              className="nav-item"
              onClick={() => onNav(tab)}
              onMouseEnter={() => setHovered(tab)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(tab)}
              onTouchEnd={() => setHovered(null)}
            >
              <div
                className="nav-icon-wrap"
                style={{
                  color: isActive
                    ? '#8BBCD4'
                    : isHovered
                    ? 'rgba(242,242,247,0.72)'
                    : 'rgba(242,242,247,0.36)',
                  transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                <Icon size={22} />
              </div>
              {isActive && (
                <span className="nav-label">{NAV_LABELS[tab]}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 28px',
      paddingTop: 'var(--safe-top)',
      paddingBottom: 'var(--safe-bottom)',
    }}>
      {/* Wordmark block */}
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <div style={{
          fontSize: 10.5,
          letterSpacing: '0.20em',
          color: 'rgba(242,242,247,0.35)',
          textTransform: 'uppercase',
          marginBottom: 14,
          fontWeight: 500,
        }}>
          Welcome to
        </div>
        <div style={{
          fontSize: 30,
          fontWeight: 700,
          color: '#F2F2F7',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
        }}>
          Campus Quest AR
        </div>
        {/* accent rule */}
        <div style={{
          width: 36,
          height: 2,
          background: '#8BBCD4',
          margin: '18px auto 0',
          borderRadius: 2,
          opacity: 0.65,
        }} />
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="glass-input"
          type="email"
          placeholder="Email"
          autoComplete="email"
        />
        <input
          className="glass-input"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
        />
        <div style={{ marginTop: 8 }}>
          <button className="primary-btn" onClick={onLogin}>
            Sign In
          </button>
        </div>
        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(242,242,247,0.26)',
          marginTop: 6,
          lineHeight: 1.5,
        }}>
          Accounts are issued by your campus administrator
        </p>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardScreen({ onOpenCamera }: { onOpenCamera: () => void }) {
  return (
    <div className="screen-body">
      {/* Greeting */}
      <div style={{ marginBottom: 30 }}>
        <div className="label-caps" style={{ marginBottom: 10 }}>Good morning</div>
        <Skel w="168px" h="30px" r="10px" />
      </div>

      {/* Progress card */}
      <div className="glass-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div className="label-caps" style={{ marginBottom: 10 }}>Current Location</div>
            <Skel w="144px" h="22px" r="8px" />
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(242,242,247,0.32)',
            letterSpacing: '0.04em',
            paddingTop: 2,
          }}>
            Location _ of 7
          </div>
        </div>

        {/* 7-segment progress bar */}
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.09)',
            }} />
          ))}
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skel w="90px" h="13px" r="5px" />
          <Skel w="64px" h="13px" r="5px" />
        </div>
      </div>

      {/* CTA: open camera */}
      <div
        className="glass-card cta-card"
        onClick={onOpenCamera}
        style={{ padding: '30px 24px', textAlign: 'center', marginBottom: 14 }}
      >
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(139,188,212,0.11)',
          border: '1px solid rgba(139,188,212,0.20)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 18px',
          color: '#8BBCD4',
        }}>
          <IcoCamera size={24} />
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#F2F2F7',
          letterSpacing: '-0.02em',
          marginBottom: 6,
        }}>
          Open Camera
        </div>
        <div style={{ fontSize: 13, color: 'rgba(242,242,247,0.38)', lineHeight: 1.5 }}>
          Scan your surroundings to reveal clues
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[['Time Elapsed', '86px'], ['Current Rank', '58px']].map(([label, w]) => (
          <div key={label} className="glass-card" style={{ padding: '18px 16px' }}>
            <div className="label-caps" style={{ marginBottom: 10 }}>{label}</div>
            <Skel w={w} h="24px" r="8px" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Camera / AR Scan ──────────────────────────────────────────────────────────

function CameraScreen() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      /* neutral viewport placeholder — real camera feed attached in code */
      background: 'linear-gradient(160deg, #0a0a0d 0%, #0f0f12 60%, #0c0c0f 100%)',
      zIndex: 10,
    }}>
      {/* Scan reticle — thin corner brackets */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ position: 'relative', width: 196, height: 196 }}>
          <div className="reticle-corner tl" style={{ opacity: 0.75 }} />
          <div className="reticle-corner tr" style={{ opacity: 0.75 }} />
          <div className="reticle-corner bl" style={{ opacity: 0.75 }} />
          <div className="reticle-corner br" style={{ opacity: 0.75 }} />
          {/* center dot */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'rgba(139,188,212,0.55)',
          }} />
        </div>
      </div>

      {/* Instruction pill — sits just below the fixed banner */}
      <div style={{
        position: 'absolute',
        top: 'calc(var(--safe-top) + var(--banner-h) + 14px)',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(14,14,16,0.74)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 100,
        padding: '8px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        zIndex: 15,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#8BBCD4',
          opacity: 0.8,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12.5,
          fontWeight: 450,
          color: 'rgba(242,242,247,0.72)',
          letterSpacing: '-0.01em',
        }}>
          Point camera at surroundings
        </span>
      </div>
    </div>
  )
}

// ── Map ───────────────────────────────────────────────────────────────────────

function MapScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 10 }}>
      {/* Empty dark map container */}
      <div style={{
        position: 'absolute',
        top: 'calc(var(--safe-top) + var(--banner-h))',
        inset: 'auto 0 0 0',
        background: '#0d0d10',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Bottom sheet card — sits above the nav bar */}
      <div style={{
        position: 'fixed',
        inset: 'auto 20px calc(var(--safe-bottom) + var(--nav-h) + 12px) 20px',
        zIndex: 20,
      }}>
        <div className="glass-card" style={{ padding: '18px 20px 22px' }}>
          {/* drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.14)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="label-caps">Nearest Waypoint</div>
              <Skel w="56px" h="13px" r="5px" />
            </div>
            <Skel w="176px" h="22px" r="8px" />
            <div className="divider" style={{ margin: '2px 0' }} />
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>Distance</div>
                <Skel w="68px" h="18px" r="6px" />
              </div>
              <div>
                <div className="label-caps" style={{ marginBottom: 8 }}>Direction</div>
                <Skel w="68px" h="18px" r="6px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Clue ──────────────────────────────────────────────────────────────────────

function ClueScreen() {
  return (
    <div className="screen-body" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 348, padding: '32px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div className="label-caps">Current Clue</div>
          <div style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(242,242,247,0.30)',
            letterSpacing: '0.04em',
          }}>
            Location _ of 7
          </div>
        </div>

        {/* Placeholder text lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
          <Skel h="15px" r="6px" />
          <Skel w="88%" h="15px" r="6px" />
          <Skel w="74%" h="15px" r="6px" />
          <Skel h="15px" r="6px" style={{ marginTop: 8 }} />
          <Skel w="92%" h="15px" r="6px" />
          <Skel w="60%" h="15px" r="6px" />
        </div>

        <div className="divider" style={{ margin: '0 0 22px' }} />

        {/* Footer row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label-caps" style={{ marginBottom: 8 }}>Location</div>
            <Skel w="108px" h="16px" r="6px" />
          </div>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: 'rgba(139,188,212,0.09)',
            border: '1px solid rgba(139,188,212,0.17)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(139,188,212,0.75)',
          }}>
            <IcoMap size={16} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Profile ───────────────────────────────────────────────────────────────────

function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="screen-body">
      {/* Sign out button */}
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

      {/* Avatar + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 34 }}>
        <div style={{
          width: 78,
          height: 78,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.055)',
          border: '1px solid rgba(255,255,255,0.09)',
          marginBottom: 16,
        }} />
        <Skel w="148px" h="24px" r="9px" style={{ marginBottom: 9 }} />
        <Skel w="104px" h="14px" r="5px" />
      </div>

      {/* Progress stepper — 7 steps */}
      <div className="glass-card" style={{ marginBottom: 14 }}>
        <div className="label-caps" style={{ marginBottom: 18 }}>Quest Progress</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Fragment key={i}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 9.5, color: 'rgba(242,242,247,0.28)', fontWeight: 600 }}>
                  {i + 1}
                </span>
              </div>
              {i < 6 && (
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              )}
            </Fragment>
          ))}
        </div>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: 'rgba(242,242,247,0.30)' }}>
            Location _ of 7 completed
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {['Best Time', 'Attempts', 'Rank'].map(label => (
          <div key={label} className="glass-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
            <div className="label-caps" style={{ marginBottom: 10, fontSize: 9.5, letterSpacing: '0.11em' }}>{label}</div>
            <Skel w="100%" h="22px" r="7px" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

function LeaderboardScreen() {
  const colGrid = '36px 1fr 58px'

  const ColHead = ({ children, align = 'left' }: { children: string; align?: string }) => (
    <div style={{ textAlign: align as any, fontSize: 10.5, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(242,242,247,0.28)', fontWeight: 500 }}>
      {children}
    </div>
  )

  return (
    <div className="screen-body">
      <div className="label-caps" style={{ marginBottom: 20 }}>All Participants</div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: colGrid, gap: 12, padding: '0 14px 10px', alignItems: 'center' }}>
        <ColHead>#</ColHead>
        <ColHead>Participant</ColHead>
        <ColHead align="right">Time</ColHead>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Default skeleton rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: colGrid,
              gap: 12,
              padding: '13px 14px',
              background: 'rgba(255,255,255,0.038)',
              borderRadius: 14,
              alignItems: 'center',
            }}
          >
            <Skel w="22px" h="16px" r="5px" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.055)',
                flexShrink: 0,
              }} />
              <Skel w="96px" h="15px" r="6px" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Skel w="48px" h="15px" r="6px" />
            </div>
          </div>
        ))}

        {/* Spacer */}
        <div style={{ height: 14 }} />

        {/* Current user highlight row */}
        <div style={{ marginBottom: 6 }}>
          <div className="label-caps" style={{ color: 'rgba(139,188,212,0.55)', marginBottom: 8, paddingLeft: 4 }}>
            Your Position
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: colGrid,
            gap: 12,
            padding: '13px 14px',
            background: 'rgba(139,188,212,0.07)',
            border: '1px solid rgba(139,188,212,0.16)',
            borderRadius: 14,
            alignItems: 'center',
          }}>
            <Skel w="22px" h="16px" r="5px" style={{ background: 'rgba(139,188,212,0.18)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(139,188,212,0.11)',
                border: '1px solid rgba(139,188,212,0.22)',
                flexShrink: 0,
              }} />
              <Skel w="96px" h="15px" r="6px" style={{ background: 'rgba(139,188,212,0.15)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Skel w="48px" h="15px" r="6px" style={{ background: 'rgba(139,188,212,0.15)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── App Shell ─────────────────────────────────────────────────────────────────

function AppShell({
  active, onNav, children,
}: {
  active: NavTab | null
  onNav: (tab: NavTab) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ background: '#000', minHeight: '100dvh', position: 'relative' }}>
      <TopBanner />
      <BottomNav active={active} onNav={onNav} />
      {children}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [activeTab, setActiveTab] = useState<NavTab | null>(null)

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />
  }

  function handleNav(tab: NavTab) {
    setActiveTab(tab)
    setScreen(tab)
  }

  function handleLogout() {
    setLoggedIn(false)
    setScreen('dashboard')
    setActiveTab(null)
  }

  function renderScreen() {
    switch (screen) {
      case 'dashboard':
        return <DashboardScreen onOpenCamera={() => handleNav('camera')} />
      case 'camera':
        return <CameraScreen />
      case 'map':
        return <MapScreen />
      case 'clue':
        return <ClueScreen />
      case 'profile':
        return <ProfileScreen onLogout={handleLogout} />
      case 'leaderboard':
        return <LeaderboardScreen />
      default:
        return null
    }
  }

  return (
    <AppShell active={activeTab} onNav={handleNav}>
      {renderScreen()}
    </AppShell>
  )
}
