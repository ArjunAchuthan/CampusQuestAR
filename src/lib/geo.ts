import type { LatLng } from '@/types'

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the standard Haversine formula.
 *
 * @returns Distance in meters
 */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000 // Earth's mean radius in meters
  const toRad = Math.PI / 180

  const dLat = (b.lat - a.lat) * toRad
  const dLng = (b.lng - a.lng) * toRad
  const lat1 = a.lat * toRad
  const lat2 = b.lat * toRad

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return R * c
}

/**
 * Calculates the forward azimuth / bearing from point A to point B in degrees (0° to 360°).
 */
export function calculateBearing(from: LatLng, to: LatLng): number {
  const toRad = Math.PI / 180
  const toDeg = 180 / Math.PI

  const y = Math.sin((to.lng - from.lng) * toRad) * Math.cos(to.lat * toRad)
  const x =
    Math.cos(from.lat * toRad) * Math.sin(to.lat * toRad) -
    Math.sin(from.lat * toRad) * Math.cos(to.lat * toRad) * Math.cos((to.lng - from.lng) * toRad)

  const bearing = Math.atan2(y, x) * toDeg
  return (bearing + 360) % 360
}

/**
 * Converts degrees into a readable cardinal direction (e.g. N, NE, E, SE, S, SW, W, NW).
 */
export function bearingToCardinal(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(deg / 45) % 8
  return directions[index]
}

/**
 * Formats a distance in meters to a clean, user-facing string (e.g. "14 m", "250 m", "1.4 km").
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return 'Calculating…'
  }
  if (meters < 1) {
    return 'Here'
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}
