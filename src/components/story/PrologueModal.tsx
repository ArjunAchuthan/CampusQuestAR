import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PROLOGUE_PARAGRAPHS } from '@/lib/story'

interface PrologueModalProps {
  onClose: () => void
}

type PrologueStage = 'repair' | 'folder' | 'story'
const storyText = PROLOGUE_PARAGRAPHS.join('\n\n')

function FolderGlyph() {
  return (
    <svg width="132" height="108" viewBox="0 0 132 108" fill="none" aria-hidden="true">
      <path d="M10 24a9 9 0 0 1 9-9h32l12 12h50a9 9 0 0 1 9 9v53a9 9 0 0 1-9 9H19a9 9 0 0 1-9-9V24Z" fill="url(#folder-front)" stroke="#FFD77A" strokeWidth="2" />
      <path d="M11 44h108l-10 41a9 9 0 0 1-9 7H21a9 9 0 0 1-9-9l-1-39Z" fill="url(#folder-body)" />
      <path d="M52 39h40a5 5 0 0 1 5 5v32H51V44a5 5 0 0 1 5-5Z" fill="#F5F0E4" stroke="#D8CDB7" strokeWidth="1.5" />
      <path d="M60 50h25M60 57h25M60 64h19" stroke="#A7B0B3" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="folder-front" x1="17" y1="17" x2="109" y2="88" gradientUnits="userSpaceOnUse"><stop stopColor="#FFE49B" /><stop offset="1" stopColor="#E9A93F" /></linearGradient>
        <linearGradient id="folder-body" x1="27" y1="43" x2="88" y2="105" gradientUnits="userSpaceOnUse"><stop stopColor="#FFD56F" /><stop offset="1" stopColor="#D98A32" /></linearGradient>
      </defs>
    </svg>
  )
}

export function PrologueModal({ onClose }: PrologueModalProps) {
  const [stage, setStage] = useState<PrologueStage>('repair')
  const [repairProgress, setRepairProgress] = useState(0)
  const [shownChars, setShownChars] = useState(0)
  const lastTapAt = useRef(0)
  const closed = useRef(false)
  const storyRef = useRef<HTMLDivElement>(null)
  const isTyping = shownChars < storyText.length

  const closeOnce = useCallback(() => {
    if (closed.current) return
    closed.current = true
    onClose()
  }, [onClose])

  useEffect(() => {
    if (stage !== 'repair') return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      const progress = Math.min(Math.round(((Date.now() - startedAt) / 2600) * 100), 100)
      setRepairProgress(progress)
      if (progress >= 100) {
        window.clearInterval(timer)
        window.setTimeout(() => setStage('folder'), 420)
      }
    }, 40)
    return () => window.clearInterval(timer)
  }, [stage])

  useEffect(() => {
    if (stage !== 'story' || !isTyping) return
    const timer = window.setTimeout(() => {
      setShownChars((visible) => Math.min(visible + 2, storyText.length))
    }, 22)
    return () => window.clearTimeout(timer)
  }, [stage, isTyping, shownChars])

  useEffect(() => {
    if (storyRef.current) storyRef.current.scrollTop = storyRef.current.scrollHeight
  }, [shownChars])

  function openRecoveredFile() {
    setShownChars(0)
    setStage('story')
  }

  function handleStoryPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch') return
    const now = Date.now()
    if (now - lastTapAt.current < 360) {
      lastTapAt.current = 0
      closeOnce()
      return
    }
    lastTapAt.current = now
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prologue-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'grid',
        placeItems: 'center',
        padding: 'max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom))',
        background: 'radial-gradient(ellipse at 50% 8%, rgba(31,66,77,.28), transparent 58%), #05080B',
      }}
    >
      <section
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 620,
          minHeight: stage === 'story' ? 400 : 360,
          maxHeight: 'min(760px, calc(100dvh - 36px))',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(22px, 6vw, 38px)',
          border: '1px solid rgba(139,188,212,.17)',
          borderRadius: 26,
          boxShadow: '0 30px 100px rgba(0,0,0,.75), 0 0 60px rgba(71,173,205,.08)',
          background: 'linear-gradient(145deg, rgba(17,24,29,.98), rgba(7,11,15,.99))',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          aria-label="Close prologue and open first clue"
          onClick={closeOnce}
          style={{ position: 'absolute', top: 17, right: 17, width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,.11)', background: 'rgba(255,255,255,.045)', color: 'rgba(245,247,250,.66)', fontSize: 21, lineHeight: 1, cursor: 'pointer', touchAction: 'manipulation' }}
        >×</button>

        {stage !== 'story' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(225,236,242,.58)', fontFamily: 'monospace', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', paddingRight: 40 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage === 'repair' ? '#E8B84E' : '#65D6A0', boxShadow: `0 0 12px ${stage === 'repair' ? 'rgba(232,184,78,.6)' : 'rgba(101,214,160,.6)'}` }} />
              Campus client · maintenance console
            </div>
            <h1 id="prologue-title" style={{ color: '#EFF4F7', fontSize: 25, lineHeight: 1.2, letterSpacing: '-.035em', margin: '28px 0 18px' }}>
              {stage === 'repair' ? 'Fixing a bug…' : 'Patch complete'}
            </h1>

            <div style={{ padding: 17, borderRadius: 15, background: 'rgba(0,0,0,.43)', border: '1px solid rgba(255,255,255,.075)', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.9, color: '#9CB6B8' }}>
              <div><span style={{ color: '#73CDBB' }}>$</span> quest-client --repair</div>
              <div style={{ color: 'rgba(209,225,226,.62)' }}>&gt; scanning archived campus files...</div>
              <div style={{ color: 'rgba(209,225,226,.62)' }}>&gt; applying fix to legacy index...</div>
              {stage === 'folder' && <div style={{ color: '#FFD77A' }}>&gt; unexpected archive recovered</div>}
              <div style={{ height: 4, marginTop: 12, borderRadius: 8, background: 'rgba(255,255,255,.09)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stage === 'folder' ? 100 : repairProgress}%`, borderRadius: 8, background: 'linear-gradient(90deg,#42C9B6,#F6C85E)', transition: 'width .08s linear' }} />
              </div>
            </div>

            {stage === 'repair' ? (
              <div style={{ marginTop: 'auto', paddingTop: 22, color: 'rgba(225,236,242,.38)', fontSize: 12 }}>Checking one last thing…</div>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', paddingTop: 18 }}>
                <button
                  type="button"
                  onClick={openRecoveredFile}
                  aria-label="Open recovered archive_final_FINAL_v2.txt"
                  style={{ display: 'grid', justifyItems: 'center', gap: 9, padding: '13px 22px 12px', border: '1px solid rgba(255,215,122,.24)', borderRadius: 18, background: 'radial-gradient(ellipse at 50% 45%, rgba(255,198,91,.15), rgba(255,198,91,.025) 72%)', cursor: 'pointer', animation: 'folder-arrive .55s cubic-bezier(.2,.8,.2,1) both', touchAction: 'manipulation' }}
                >
                  <FolderGlyph />
                  <span style={{ color: '#FFE3A0', fontSize: 12, fontWeight: 650 }}>archive_final_FINAL_v2.txt</span>
                  <span style={{ color: 'rgba(242,242,247,.42)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>Tap to open</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'rgba(139,188,212,.78)', fontSize: 10.5, fontWeight: 600, letterSpacing: '.13em', textTransform: 'uppercase', paddingRight: 42 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8BBCD4', boxShadow: '0 0 12px rgba(139,188,212,.6)' }} />
              Recovered note
            </div>
            <h1 id="prologue-title" style={{ fontSize: 29, lineHeight: 1.1, margin: '14px 0 18px', letterSpacing: '-.04em', color: '#F5F7FA' }}>
              Prologue: The Note
            </h1>
            <div
              ref={storyRef}
              onPointerUp={handleStoryPointerUp}
              onDoubleClick={(event) => { event.preventDefault(); closeOnce() }}
              onContextMenu={(event) => event.preventDefault()}
              style={{ minHeight: 0, flex: 1, overflowY: 'auto', padding: '0 4px 4px 0', color: 'rgba(240,244,247,.88)', fontSize: 15, lineHeight: 1.82, letterSpacing: '-.01em', whiteSpace: 'pre-wrap', userSelect: 'none', touchAction: 'pan-y', cursor: 'text' }}
            >
              {storyText.slice(0, shownChars)}
              {isTyping && <span aria-hidden="true" style={{ color: '#8BBCD4', animation: 'prologue-blink .9s step-end infinite' }}>▍</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
              <div style={{ fontSize: 11, color: 'rgba(242,242,247,.42)', lineHeight: 1.5 }}>
                Double-tap to skip and close
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={() => isTyping ? setShownChars(storyText.length) : closeOnce()}
                style={{ width: 'auto', minWidth: 142, padding: '12px 17px', fontSize: 13, flexShrink: 0 }}
              >
                {isTyping ? 'Skip typing' : 'Begin the hunt'}
              </button>
            </div>
          </>
        )}
      </section>
      <style>{`@keyframes prologue-blink { 50% { opacity: 0; } } @keyframes folder-arrive { from { opacity: 0; transform: translateY(28px) scale(.82); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>
  )
}
