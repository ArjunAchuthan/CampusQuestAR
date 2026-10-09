import React, { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/useAuth'
import type { ParticipantUser } from '@/types'

type Run = { uid: string; startedAt?: any; finishedAt?: any }

function toMillis(value: any): number | null {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  return null
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function LeaderboardScreen() {
  const { user } = useAuth()
  const [runs, setRuns] = useState<Run[]>([])
  const [participants, setParticipants] = useState<Record<string, ParticipantUser>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let gotRuns = false
    let gotUsers = false
    const syncLoading = () => { if (gotRuns && gotUsers) setLoading(false) }
    const stopRuns = onSnapshot(collection(db, 'progress'), (snapshot) => {
      setRuns(snapshot.docs.map((item) => ({ uid: item.id, ...item.data() } as Run)))
      gotRuns = true
      syncLoading()
    }, (err) => { console.error('Leaderboard progress listener failed:', err); setError('Leaderboard data could not be loaded.'); setLoading(false) })
    const stopUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const next: Record<string, ParticipantUser> = {}
      snapshot.docs.forEach((item) => {
        const data = item.data() as ParticipantUser
        if (data.role === 'participant') next[item.id] = { ...data, uid: item.id }
      })
      setParticipants(next)
      gotUsers = true
      syncLoading()
    }, (err) => { console.error('Leaderboard participant listener failed:', err); setError('Player names could not be loaded.'); setLoading(false) })
    return () => { stopRuns(); stopUsers() }
  }, [])

  const ranked = useMemo(() => runs.flatMap((run) => {
    const started = toMillis(run.startedAt)
    const finished = toMillis(run.finishedAt)
    if (!started || !finished || finished < started) return []
    return [{ uid: run.uid, name: participants[run.uid]?.displayName || 'Player', avatarUrl: participants[run.uid]?.avatarUrl, duration: finished - started, finished }]
  }).sort((a, b) => a.duration - b.duration || a.finished - b.finished || a.name.localeCompare(b.name)), [runs, participants])

  const ownRank = ranked.findIndex((entry) => entry.uid === user?.uid)
  const colGrid = '36px minmax(0,1fr) auto'

  const row = (entry: typeof ranked[number], index: number, own = false) => (
    <div key={entry.uid} style={{ display: 'grid', gridTemplateColumns: colGrid, gap: 12, padding: '12px 14px', background: own ? 'rgba(139,188,212,.08)' : 'rgba(255,255,255,.038)', border: own ? '1px solid rgba(139,188,212,.18)' : '1px solid transparent', borderRadius: 14, alignItems: 'center' }}>
      <div style={{ color: index < 3 ? '#F5CB65' : 'rgba(242,242,247,.45)', fontWeight: 700, fontSize: 13 }}>#{index + 1}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(139,188,212,.12)', display: 'grid', placeItems: 'center', color: '#8BBCD4', fontSize: 12, fontWeight: 700 }}>{entry.name.charAt(0).toUpperCase()}</div>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: own ? 650 : 500 }}>{entry.name}{own ? ' · You' : ''}</span>
      </div>
      <div style={{ textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: own ? '#8BBCD4' : 'rgba(242,242,247,.74)', fontWeight: 600 }}>{formatDuration(entry.duration)}</div>
    </div>
  )

  return (
    <div className="screen-body">
      <div style={{ marginBottom: 20 }}>
        <div className="label-caps" style={{ marginBottom: 5 }}>Campus Quest</div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.025em' }}>Leaderboard</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: colGrid, gap: 12, padding: '0 14px 10px', alignItems: 'center', fontSize: 10.5, letterSpacing: '.11em', textTransform: 'uppercase', color: 'rgba(242,242,247,.32)' }}>
        <span>Rank</span><span>Participant</span><span style={{ textAlign: 'right' }}>Time</span>
      </div>
      {loading ? <div className="glass-card" style={{ textAlign: 'center', color: 'rgba(242,242,247,.5)', fontSize: 13 }}>Loading live standings…</div>
        : error ? <div className="glass-card" role="alert" style={{ color: '#FF9E9E', fontSize: 13 }}>{error}</div>
        : ranked.length === 0 ? <div className="glass-card" style={{ textAlign: 'center', color: 'rgba(242,242,247,.58)', fontSize: 13, lineHeight: 1.5 }}>No completed runs yet. Finish all seven checkpoint games to claim the first place.</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{ranked.map((entry, index) => row(entry, index))}</div>}

      <div style={{ height: 22 }} />
      <div className="label-caps" style={{ color: 'rgba(139,188,212,.62)', margin: '0 0 9px 4px' }}>Your Position</div>
      {ownRank >= 0 ? row(ranked[ownRank], ownRank, true) : <div style={{ padding: '14px', background: 'rgba(139,188,212,.05)', border: '1px solid rgba(139,188,212,.12)', borderRadius: 14, fontSize: 12.5, color: 'rgba(242,242,247,.5)' }}>Your run appears here after you complete all seven checkpoint games.</div>}
    </div>
  )
}
