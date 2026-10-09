import React, { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import type { CheckpointGameType, SceneState } from './ARScene3D'

const ARScene3D = lazy(() => import('./ARScene3D').then((module) => ({ default: module.ARScene3D })))

export const CHECKPOINT_GAMES: { title: string; type: CheckpointGameType; story: string }[] = [
  { title: 'Reroute the coolant', type: 'pipe', story: 'Rotate the elbow pipes to carry coolant from the inlet to the outlet.' },
  { title: 'Reconnect the wires', type: 'wires', story: 'Connect each colored lead to its matching socket.' },
  { title: 'Restore auxiliary power', type: 'power', story: 'Switch the two outer breakers on. Keep the center channel off.' },
  { title: 'Reboot the signal', type: 'memory', story: 'Repeat the beacon’s startup pulse: cyan, amber, red, cyan.' },
  { title: 'Sort the data packets', type: 'sort', story: 'Tap the floating packets in ascending order, from 1 to 4.' },
  { title: 'Clear the intake filter', type: 'filter', story: 'Tap each glowing shard of debris to clear the intake.' },
  { title: 'Calibrate the reactor', type: 'reactor', story: 'Rotate each phase dial until its marker reaches the green target.' },
]

type Props = { locationIndex: number; alreadyDone?: boolean; preview?: boolean; onComplete: () => Promise<void> }

export function CheckpointGame({ locationIndex, alreadyDone = false, preview = false, onComplete }: Props) {
  const index = Math.max(0, Math.min(locationIndex, 6))
  const game = CHECKPOINT_GAMES[index]
  const [anchored, setAnchored] = useState(false)
  const [done, setDone] = useState(alreadyDone)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [pipeTurns, setPipeTurns] = useState([2, 0])
  const [wireSource, setWireSource] = useState<string | null>(null)
  const [wires, setWires] = useState<Record<string, string>>({})
  const [breakers, setBreakers] = useState([false, false, false])
  const [memoryInput, setMemoryInput] = useState<string[]>([])
  const [memoryStarted, setMemoryStarted] = useState(false)
  const [packets, setPackets] = useState<number[]>([])
  const [vents, setVents] = useState([false, false, false, false])
  const [reactor, setReactor] = useState([10, 40, 90])
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  const finishTask = useCallback(async () => {
    if (saving || done) return
    setSaving(true)
    setNotice('Signal stabilizing…')
    try {
      await completeRef.current()
      setDone(true)
      setNotice('Signal fragment recovered')
    } catch {
      setNotice('Could not save progress. Check your connection and retry.')
    } finally {
      setSaving(false)
    }
  }, [saving, done])

  const handleAction = useCallback((action: string) => {
    if (action === 'beacon') {
      if (!anchored && !done) setAnchored(true)
      return
    }
    if (!anchored || done || saving) return

    if (action.startsWith('pipe:')) {
      const pipeIndex = Number(action.split(':')[1])
      setPipeTurns((current) => {
        const next = [...current]
        next[pipeIndex] = (next[pipeIndex] + 1) % 4
        if (next[0] === 0 && next[1] === 3) void finishTask()
        return next
      })
    } else if (action.startsWith('source:')) {
      const color = action.split(':')[1]
      setWireSource(color)
    } else if (action.startsWith('port:')) {
      if (!wireSource) return
      const port = action.split(':')[1]
      const expected: Record<string, string> = { coral: '2', blue: '3', gold: '1' }
      if (port !== expected[wireSource]) { setNotice('Wrong socket · follow the lead color'); return }
      setWires((current) => {
        const next = { ...current, [wireSource]: port }
        setWireSource(null)
        if (Object.keys(next).length === 3) void finishTask()
        return next
      })
      setNotice('Lead connected')
    } else if (action.startsWith('breaker:')) {
      const breaker = Number(action.split(':')[1])
      setBreakers((current) => {
        const next = [...current]
        next[breaker] = !next[breaker]
        if (next[0] && !next[1] && next[2]) void finishTask()
        return next
      })
    } else if (action === 'memory:start') {
      setMemoryStarted(true)
      setMemoryInput([])
    } else if (action.startsWith('pulse:')) {
      const sequence = ['blue', 'gold', 'coral', 'blue']
      const value = action.split(':')[1]
      setMemoryStarted(true)
      setMemoryInput((current) => {
        const next = [...current, value]
        if (next[next.length - 1] !== sequence[next.length - 1]) {
          setNotice('Sequence reset · try again')
          return []
        }
        if (next.length === sequence.length) void finishTask()
        return next
      })
    } else if (action.startsWith('packet:')) {
      const packet = Number(action.split(':')[1])
      setPackets((current) => {
        if (packet !== current.length + 1) { setNotice('Order scrambled · start at packet 1'); return [] }
        const next = [...current, packet]
        if (next.length === 4) void finishTask()
        return next
      })
    } else if (action.startsWith('vent:')) {
      const vent = Number(action.split(':')[1])
      setVents((current) => {
        const next = [...current]
        next[vent] = true
        if (next.every(Boolean)) void finishTask()
        return next
      })
    } else if (action.startsWith('dial:')) {
      const dial = Number(action.split(':')[1])
      setReactor((current) => {
        const next = [...current]
        next[dial] = (next[dial] + 10) % 100
        const target = [30, 50, 80]
        if (next.every((value, i) => Math.abs(value - target[i]) <= 1)) void finishTask()
        return next
      })
    }
  }, [anchored, done, saving, wireSource, finishTask])

  const sceneState = useMemo<SceneState>(() => ({
    pipeTurns, wireSource, wires, breakers, memoryStarted, memoryInput, packets, vents, reactor, done,
  }), [pipeTurns, wireSource, wires, breakers, memoryStarted, memoryInput, packets, vents, reactor, done])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', color: '#fff' }}>
      <style>{`@keyframes arPulse{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:.95;transform:scale(1.08)}}`}</style>
      <Suspense fallback={null}><ARScene3D gameType={game.type} locationIndex={index} anchored={anchored} state={sceneState} onAction={handleAction} /></Suspense>
      <div style={{ position: 'absolute', left: 16, right: 16, top: 'max(84px,calc(var(--safe-top) + var(--banner-h) + 40px))', display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 900, letterSpacing: '.15em', textShadow: '0 2px 9px #000,0 0 10px rgba(37,218,255,.8)', pointerEvents: 'none' }}>
        <span style={{ color: '#baf8ff' }}>BEACON {String(index + 1).padStart(2, '0')}</span>
        <span style={{ color: '#fff2a6' }}>{anchored ? 'POSITION LOCKED' : 'SIGNAL DETECTED'}</span>
      </div>
      {!anchored && <div style={{ position: 'absolute', left: 18, right: 18, bottom: preview ? '17vh' : 'calc(var(--safe-bottom) + var(--nav-h) + 24px)', textAlign: 'center', fontSize: 10, fontWeight: 850, letterSpacing: '.13em', color: '#fff5a8', textShadow: '0 0 12px #ff7131,0 2px 7px #000', pointerEvents: 'none' }}>TAP THE 3D BEACON TO LOCK ITS POSITION</div>}
      {anchored && <div style={{ position: 'absolute', left: 16, right: 16, bottom: preview ? '17vh' : 'calc(var(--safe-bottom) + var(--nav-h) + 18px)', display: 'grid', gap: 5, justifyItems: 'center', textAlign: 'center', pointerEvents: 'none', textShadow: '0 2px 8px #000,0 0 13px rgba(0,0,0,.8)' }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-.015em' }}>{done ? 'SIGNAL RESTORED' : game.title}</span>
        <span style={{ color: '#f5fbff', fontSize: 11, lineHeight: 1.4, maxWidth: 370 }}>{done ? 'Task complete · fragment recovered' : game.story}</span>
        {notice && !done && <span role="status" aria-live="polite" style={{ color: saving ? '#c6fbff' : '#fff2a6', fontSize: 10 }}>{notice}</span>}
      </div>}
    </div>
  )
}
