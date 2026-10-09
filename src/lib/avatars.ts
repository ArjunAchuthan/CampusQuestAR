export interface AvatarOption {
  id: string
  url: string
}

export const AVATARS: AvatarOption[] = [
  { id: 'avatar-1', url: '/avatars/avatar-1.png' },
  { id: 'avatar-2', url: '/avatars/avatar-2.png' },
  { id: 'avatar-3', url: '/avatars/avatar-3.png' },
  { id: 'avatar-4', url: '/avatars/avatar-4.png' },
  { id: 'avatar-5', url: '/avatars/avatar-5.png' },
]

export const DEFAULT_AVATAR = AVATARS[0]

export function getAvatarById(id?: string | null): AvatarOption {
  if (!id) return DEFAULT_AVATAR
  const found = AVATARS.find((a) => a.id === id)
  return found || DEFAULT_AVATAR
}
