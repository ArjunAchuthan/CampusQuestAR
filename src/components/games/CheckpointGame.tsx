import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CheckpointGameType, SceneState } from './ARScene3D'

const ARScene3D = lazy(() => import('./ARScene3D').then((module) => ({ default: module.ARScene3D })))

export const CHECKPOINT_GAMES: { title: string; type: CheckpointGameType; story: string }[] = [
  { title: 'Reroute the coolant', type: 'pipe', story: 'Turn the four elbow joints to carry coolant from the inlet through the zigzag to the outlet.' },
  { title: 'Reconnect the wires', type: 'wires', story: 'Drag each of the four colored leads to its matching socket. A wrong socket leaves the lead loose.' },
  { title: 'Redirect the beam', type: 'mirror', story: 'Turn each prism 45° to relay light into the far receiver. A wrong angle spills the beam off course.' },
  { title: 'Intercept the drones', type: 'drone', story: 'Tag cyan, gold, then coral in order. The hostile red drone repeatedly dives through the live target—avoid it.' },
  { title: 'Load the reactor cores', type: 'cargo', story: 'Drag each glowing core into its matching color dock. The docks are shuffled.' },
  { title: 'Reboot the sentinel', type: 'pulse', story: 'Watch the six-pulse signal, then repeat its order across the four floating memory nodes.' },
  { title: 'Orb toss: ring sequence', type: 'toss', story: 'Drag the glowing orb up toward ring 3, ring 1, then ring 2. Release with a steady pull; short or wild throws reset the sequence.' },
]

const PIPE_SOLUTION = [0, 2, 0, 2]
const MIRROR_SOLUTION = [1, 3, 2]
const DRONE_SEQUENCE = ['cyan', 'gold', 'coral']
const CARGO_DOCKS = [1, 3, 0, 2]
const PULSE_SEQUENCE = [2, 0, 3, 1, 2, 3]
const TOSS_SEQUENCE = [2, 0, 1]

type Props = { locationIndex: number; alreadyDone?: boolean; preview?: boolean; screenSpace?: boolean; onComplete: () => Promise<void> }

export function CheckpointGame({ locationIndex, alreadyDone = false, preview = false, screenSpace = false, onComplete }: Props) {
  const index = Math.max(0, Math.min(locationIndex, 6))
  const game = CHECKPOINT_GAMES[index]
  const [anchored, setAnchored] = useState(false)
  const [done, setDone] = useState(alreadyDone)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [pipeTurns, setPipeTurns] = useState([1, 0, 3, 1])
  const [wireSource, setWireSource] = useState<string | null>(null)
  const [wires, setWires] = useState<Record<string, string>>({})
  const [mirrors, setMirrors] = useState([0, 1, 0])
  const [droneProgress, setDroneProgress] = useState(0)
  const [cargoSource, setCargoSource] = useState<number | null>(null)
  const [cargoDocked, setCargoDocked] = useState<boolean[]>([false, false, false, false])
  const [pulseProgress, setPulseProgress] = useState(0)
  const [pulseStep, setPulseStep] = useState(-1)
  const [pulseMode, setPulseMode] = useState<'intro' | 'watch' | 'input'>('intro')
  const [tossProgress, setTossProgress] = useState(0)
  const [lastToss, setLastToss] = useState<{ lane: number; power: number; hit: boolean; missType: 'short' | 'overpowered' | 'wrong-ring' | null } | null>(null)
  const completeRef = useRef(onComplete)
  const completionStarted = useRef(alreadyDone)
  const startARRef = useRef<(() => Promise<void>) | null>(null)
  const [arState, setARState] = useState<'checking' | 'unsupported' | 'ready' | 'searching' | 'placed' | 'error'>(preview || screenSpace ? 'placed' : 'checking')
  const [arMessage, setARMessage] = useState('')
  completeRef.current = onComplete

  useEffect(() => {
    if (!anchored || game.type !== 'pulse' || pulseMode !== 'intro') return
    let seconds = 5
    let timer = 0
    setNotice(`Read the task · signal starts in ${seconds}s`)
    const countdown = () => {
      seconds -= 1
      if (seconds === 0) {
        setNotice('Signal starting…')
        setPulseMode('watch')
        return
      }
      setNotice(`Read the task · signal starts in ${seconds}s`)
      timer = window.setTimeout(countdown, 1000)
    }
    timer = window.setTimeout(countdown, 1000)
    return () => window.clearTimeout(timer)
  }, [anchored, game.type, pulseMode])

  useEffect(() => {
    if (!anchored || game.type !== 'pulse' || pulseMode !== 'watch') return
    let timer = 0
    let cursor = 0
    const showNextPulse = () => {
      if (cursor >= PULSE_SEQUENCE.length) {
        setPulseStep(-1)
        setPulseMode('input')
        setNotice('Your turn · repeat all six pulses')
        return
      }
      setPulseStep(PULSE_SEQUENCE[cursor])
      setNotice(`Memorize pulse ${cursor + 1} / ${PULSE_SEQUENCE.length}`)
      timer = window.setTimeout(() => {
        setPulseStep(-1)
        timer = window.setTimeout(() => { cursor += 1; showNextPulse() }, 170)
      }, 480)
    }
    timer = window.setTimeout(showNextPulse, 350)
    return () => window.clearTimeout(timer)
  }, [anchored, game.type, pulseMode])

  const finishTask = useCallback(async () => {
    if (completionStarted.current) return
    completionStarted.current = true
    setSaving(true)
    setNotice('Signal stabilizing…')
    try {
      await completeRef.current()
      setDone(true)
      setNotice('Signal fragment recovered')
    } catch {
      completionStarted.current = false
      setNotice('Could not save progress. Check your connection and retry.')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleAction = useCallback((action: string) => {
    if (action === 'beacon') {
      if (!anchored && !done) setAnchored(true)
      return
    }
    if (!anchored || done || saving) return

    if (action.startsWith('pipe:')) {
      const pipeIndex = Number(action.split(':')[1])
      const next = [...pipeTurns]
      next[pipeIndex] = (next[pipeIndex] + 1) % 4
      setPipeTurns(next)
      if (next.every((turns, i) => turns === PIPE_SOLUTION[i])) void finishTask()
    } else if (action.startsWith('source:')) {
      const color = action.slice('source:'.length)
      setWireSource(color)
      setNotice(`Lead selected · drop ${color} into its matching socket`)
    } else if (action.startsWith('port:')) {
      if (!wireSource) { setNotice('Choose a colored lead first'); return }
      const port = Number(action.slice('port:'.length))
      const expected: Record<string, number> = { coral: 2, blue: 0, gold: 3, lime: 1 }
      if (port !== expected[wireSource]) { setNotice('Wrong socket · the lead is still selected'); return }
      const next = { ...wires, [wireSource]: String(port) }
      setWires(next)
      setWireSource(null)
      setNotice('Lead locked into its socket')
      if (Object.keys(next).length === 4) void finishTask()
    } else if (action.startsWith('mirror:')) {
      const mirror = Number(action.slice('mirror:'.length))
      const next = [...mirrors]
      next[mirror] = (next[mirror] + 1) % 4
      setMirrors(next)
      if (next.every((turn, i) => turn === MIRROR_SOLUTION[i])) void finishTask()
    } else if (action.startsWith('drone:')) {
      const color = action.slice('drone:'.length)
      if (color !== DRONE_SEQUENCE[droneProgress]) {
        setDroneProgress(0)
        setNotice(color === 'red' ? 'Decoy hit · sequence reset' : 'Wrong target · sequence reset')
        return
      }
      const next = droneProgress + 1
      setDroneProgress(next)
      setNotice(`Drone tagged · ${next} / ${DRONE_SEQUENCE.length}`)
      if (next === DRONE_SEQUENCE.length) void finishTask()
    } else if (action.startsWith('cargo:')) {
      const source = Number(action.slice('cargo:'.length))
      if (cargoDocked[source]) return
      setCargoSource(source)
      setNotice('Core selected · drag it to its matching dock')
    } else if (action.startsWith('dock:')) {
      if (cargoSource === null) { setNotice('Pick up a reactor core first'); return }
      const dock = Number(action.slice('dock:'.length))
      if (CARGO_DOCKS[cargoSource] !== dock) { setNotice('Wrong dock · keep carrying the selected core'); return }
      const next = [...cargoDocked]
      next[cargoSource] = true
      setCargoDocked(next)
      setCargoSource(null)
      setNotice('Reactor core seated')
      if (next.every(Boolean)) void finishTask()
    } else if (action.startsWith('pulse:')) {
      if (pulseMode !== 'input') return
      const node = Number(action.slice('pulse:'.length))
      if (node !== PULSE_SEQUENCE[pulseProgress]) {
        setPulseProgress(0)
        setPulseStep(-1)
        setPulseMode('watch')
        setNotice('Signal scrambled · watch the six-pulse pattern again')
        return
      }
      const next = pulseProgress + 1
      setPulseProgress(next)
      setNotice(`Memory node aligned · ${next} / ${PULSE_SEQUENCE.length}`)
      if (next === PULSE_SEQUENCE.length) void finishTask()
    } else if (action === 'throw:orb') {
      setNotice('Drag the orb toward the next ring, then release')
    } else if (action.startsWith('throw:release:')) {
      const [, , rawX, rawY] = action.split(':')
      const deltaX = Number(rawX)
      const deltaY = Number(rawY)
      const lane = deltaX < -.38 ? 0 : deltaX > .38 ? 2 : 1
      const power = Math.hypot(deltaX, deltaY)
      const missType = deltaY < .46 ? 'short' : deltaY > 1.14 || power > 1.55 ? 'overpowered' : lane !== TOSS_SEQUENCE[tossProgress] ? 'wrong-ring' : null
      const hit = missType === null
      setLastToss({ lane, power, hit, missType })
      if (!hit) {
        setTossProgress(0)
        setNotice(missType === 'short' ? 'Too short · pull the orb higher' : missType === 'overpowered' ? 'Too much power · use a shorter pull' : 'Wrong ring · sequence reset')
        return
      }
      const next = tossProgress + 1
      setTossProgress(next)
      setNotice(`Ring caught · ${next} / ${TOSS_SEQUENCE.length}`)
      if (next === TOSS_SEQUENCE.length) void finishTask()
    }
  }, [anchored, done, saving, pipeTurns, wireSource, wires, mirrors, droneProgress, cargoSource, cargoDocked, pulseMode, pulseProgress, tossProgress, finishTask])

  const sceneState = useMemo<SceneState>(() => ({
    pipeTurns, wireSource, wires, mirrors, droneProgress, cargoSource, cargoDocked, pulseProgress, pulseStep, pulseMode, tossProgress, lastToss, done,
  }), [pipeTurns, wireSource, wires, mirrors, droneProgress, cargoSource, cargoDocked, pulseProgress, pulseStep, pulseMode, tossProgress, lastToss, done])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', color: '#fff' }}>
      <Suspense fallback={null}><ARScene3D
        gameType={game.type}
        locationIndex={index}
        screenSpace={screenSpace || preview}
        anchored={anchored}
        state={sceneState}
        onAction={handleAction}
        onARState={(next, message) => { setARState(next); setARMessage(message ?? '') }}
        onARPlaced={(placed) => setAnchored(placed)}
        startARRef={startARRef}
      /></Suspense>
      <div style={{ position: 'absolute', left: 16, right: 16, top: 'max(84px,calc(var(--safe-top) + var(--banner-h) + 40px))', display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 900, letterSpacing: '.15em', textShadow: '0 2px 9px #000,0 0 10px rgba(37,218,255,.8)', pointerEvents: 'none' }}>
        <span style={{ color: '#baf8ff' }}>BEACON {String(index + 1).padStart(2, '0')}</span>
        <span style={{ color: '#fff2a6' }}>{anchored ? 'PUZZLE ACTIVE' : 'SIGNAL DETECTED'}</span>
      </div>
      {!anchored && <div role="status" style={{ position: 'absolute', left: 16, right: 16, bottom: preview ? '17vh' : 'calc(var(--safe-bottom) + var(--nav-h) + 18px)', textAlign: 'center', fontSize: 11, fontWeight: 850, color: '#fff5a8', textShadow: '0 0 12px #ff7131,0 2px 7px #000', pointerEvents: 'none' }}>TAP THE 3D BEACON TO START</div>}
      {anchored && <div style={{ position: 'absolute', left: 16, right: 16, bottom: preview ? '17vh' : 'calc(var(--safe-bottom) + var(--nav-h) + 18px)', display: 'grid', gap: 5, justifyItems: 'center', textAlign: 'center', pointerEvents: 'none', textShadow: '0 2px 8px #000,0 0 13px rgba(0,0,0,.8)' }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-.015em' }}>{done ? 'SIGNAL RESTORED' : game.title}</span>
        <span style={{ color: '#f5fbff', fontSize: 11, lineHeight: 1.4, maxWidth: 370 }}>{done ? 'Task complete · fragment recovered' : game.story}</span>
        {notice && !done && <span role="status" aria-live="polite" style={{ color: saving ? '#c6fbff' : '#fff2a6', fontSize: 10 }}>{notice}</span>}
      </div>}
    </div>
  )
}
