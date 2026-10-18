import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ParticipantUser } from '@/types'

type Run = { uid: string; startedAt?: unknown; finishedAt?: unknown }

export type RankedRun = {
  uid: string
  name: string
  avatarUrl?: string
  duration: number
  finished: number
}

function toMillis(value: unknown): number | null {
  if (typeof value !== 'object' || value === null) return null
  const timestamp = value as { toMillis?: () => number; seconds?: number }
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis()
  if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000
  return null
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

/** Shared live ranking used by both the leaderboard and participant profile. */
export function useLeaderboardData() {
  const [runs, setRuns] = useState<Run[]>([])
  const [participants, setParticipants] = useState<Record<string, ParticipantUser>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let gotRuns = false
    let gotUsers = false
    const syncLoading = () => {
      if (gotRuns && gotUsers) setLoading(false)
    }

    const stopRuns = onSnapshot(collection(db, 'progress'), (snapshot) => {
      setRuns(snapshot.docs.map((item) => ({ uid: item.id, ...item.data() } as Run)))
      gotRuns = true
      syncLoading()
    }, (err) => {
      console.error('Leaderboard progress listener failed:', err)
      setError('Leaderboard data could not be loaded.')
      setLoading(false)
    })

    const stopUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const next: Record<string, ParticipantUser> = {}
      snapshot.docs.forEach((item) => {
        const data = item.data() as ParticipantUser
        if (data.role !== 'participant') return
        const uid = data.uid || item.id
        next[uid] = {
          ...data,
          uid,
          participantId: /^\d{6}$/.test(item.id) ? item.id : data.participantId,
        }
      })
      setParticipants(next)
      gotUsers = true
      syncLoading()
    }, (err) => {
      console.error('Leaderboard participant listener failed:', err)
      setError('Player names could not be loaded.')
      setLoading(false)
    })

    return () => { stopRuns(); stopUsers() }
  }, [])

  const ranked = useMemo(() => runs.flatMap((run) => {
    const started = toMillis(run.startedAt)
    const finished = toMillis(run.finishedAt)
    if (started === null || finished === null || finished < started) return []
    return [{
      uid: run.uid,
      name: participants[run.uid]?.displayName || 'Player',
      avatarUrl: participants[run.uid]?.avatarUrl,
      duration: finished - started,
      finished,
    }]
  }).sort((a, b) => a.duration - b.duration || a.finished - b.finished || a.name.localeCompare(b.name)), [runs, participants])

  return { ranked, loading, error }
}
