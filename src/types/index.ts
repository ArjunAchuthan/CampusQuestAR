export type Screen = 'login' | 'dashboard' | 'camera' | 'map' | 'clue' | 'profile' | 'leaderboard' | 'admin-register'
export type NavTab = 'camera' | 'map' | 'clue' | 'profile' | 'leaderboard'

export const NAV_TABS: NavTab[] = ['camera', 'map', 'clue', 'profile', 'leaderboard']

export const NAV_LABELS: Record<NavTab, string> = {
  camera: 'Camera',
  map: 'Map',
  clue: 'Clue',
  profile: 'Profile',
  leaderboard: 'Board',
}

export interface ParticipantUser {
  uid: string
  email: string
  displayName: string
  role: 'participant' | 'admin'
  avatarId?: string
  avatarUrl?: string
  createdAt?: any
}

export interface LatLng {
  lat: number
  lng: number
}

export interface QuestLocation {
  id: string
  order: number
  name?: string
  clue?: string
  hint?: string
  coords: LatLng
  unlockRadius: number
}

export interface ParticipantProgress {
  uid: string
  currentLocationIndex: number
  completedGameIds: string[]
  startedAt?: any
  updatedAt?: any
  unlockedAt?: any
  unlockedLocations?: Record<string, any>
}

