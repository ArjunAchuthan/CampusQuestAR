import React, { useState } from 'react'
import { CHECKPOINT_GAMES, CheckpointGame } from '@/components/games/CheckpointGame'

const energyColors = ['#21e6ff', '#ff4b65', '#b3ff3b', '#ff9e30', '#b575ff', '#35f2a0', '#ff4dcc']

export function GameShowcaseScreen() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [round, setRound] = useState(0)
  const activeGame = CHECKPOINT_GAMES[activeIndex]

  return (
    <main style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'radial-gradient(circle at 76% 23%,rgba(255,251,192,.86) 0 1.5%,rgba(255,232,147,.28) 2%,transparent 18%),linear-gradient(180deg,#5597b7 0%,#a8c6c6 43%,#526951 58%,#182c23 100%)', color: '#fff', fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Simple campus-like preview backdrop. In the Camera tab, the live camera replaces this scene. */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg,transparent 0 44%,rgba(18,37,38,.12) 45%,transparent 61%),linear-gradient(90deg,transparent 0 13%,rgba(28,48,49,.48) 13% 16%,transparent 16% 29%,rgba(31,53,52,.52) 29% 33%,transparent 33% 68%,rgba(29,48,50,.42) 68% 72%,transparent 72%),linear-gradient(0deg,rgba(8,23,19,.62),transparent 43%)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', left: '-12%', right: '-12%', bottom: '20%', height: '17%', borderRadius: '50%', background: 'linear-gradient(180deg,rgba(78,112,75,.2),rgba(21,49,36,.76))', filter: 'blur(4px)' }} />

      <header style={{ position: 'absolute', top: 'max(12px,env(safe-area-inset-top))', left: 17, right: 17, zIndex: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', textShadow: '0 2px 8px #07121a' }}>
        <span style={{ color: '#ddfbff', fontSize: 9, fontWeight: 900, letterSpacing: '.17em' }}>FIELD SIMULATION · {activeGame.type.toUpperCase()}</span>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '.12em' }}>{String(activeIndex + 1).padStart(2, '0')} / 07</span>
      </header>

      <CheckpointGame key={`${activeIndex}-${round}`} locationIndex={activeIndex} preview onComplete={async () => { /* Preview only: do not write quest progress. */ }} />

      <nav aria-label="Select a checkpoint game" style={{ position: 'absolute', zIndex: 9, left: 12, right: 12, bottom: 'max(13px,env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(7px,2.4vw,16px)', pointerEvents: 'auto' }}>
        {CHECKPOINT_GAMES.map((game, index) => {
          const active = index === activeIndex
          const color = energyColors[index]
          return <button key={game.type} type="button" aria-label={`Checkpoint ${index + 1}: ${game.title}`} aria-pressed={active} title={game.title} onClick={() => { setActiveIndex(index); setRound((value) => value + 1) }} style={{ width: active ? 38 : 29, height: active ? 38 : 29, padding: 0, borderRadius: '50%', border: `1px solid ${active ? '#ffffff' : `${color}a8`}`, color: '#fff', font: 'inherit', fontSize: active ? 12 : 10, fontWeight: 900, cursor: 'pointer', background: `radial-gradient(circle at 31% 24%,#fff,${color} 20%,${color}b5 48%,#17223a 100%)`, boxShadow: active ? `0 0 20px ${color},0 7px 14px #000a` : `0 0 10px ${color}a0,0 4px 10px #0009`, transform: active ? 'translateY(-4px)' : 'none', transition: 'all .18s ease' }}>{index + 1}</button>
        })}
      </nav>
    </main>
  )
}
