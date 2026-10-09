import { useState, useEffect, useRef, useCallback } from 'react'
import type { LatLng } from '@/types'
import { haversineDistance, calculateBearing, bearingToCardinal } from '@/lib/geo'

export type GeofenceStatus = 'loading' | 'active' | 'denied' | 'unavailable' | 'error'

export interface UseGeofenceResult {
  userCoords: LatLng | null
  distance: number | null
  bearing: number | null
  cardinal: string | null
  withinRange: boolean
  accuracy: number | null
  status: GeofenceStatus
  errorMessage: string | null
  retry: () => void
}

/**
 * useGeofence Hook
 *
 * Realtime GPS tracking and geofence distance calculation.
 * Filters out jumpy readings by requiring consecutive in-range readings or high accuracy.
 * Automatically cleans up the watch on unmount to preserve device battery.
 */
export function useGeofence(
  targetCoords: LatLng | null | undefined,
  unlockRadius: number = 20
): UseGeofenceResult {
  const [userCoords, setUserCoords] = useState<LatLng | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [bearing, setBearing] = useState<number | null>(null)
  const [cardinal, setCardinal] = useState<string | null>(null)
  const [withinRange, setWithinRange] = useState(false)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [status, setStatus] = useState<GeofenceStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Track consecutive in-range readings to prevent accidental GPS drift triggers
  const inRangeCountRef = useRef(0)
  const watchIdRef = useRef<number | null>(null)

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const startWatch = useCallback(() => {
    stopWatch()
    setStatus('loading')
    setErrorMessage(null)
    setWithinRange(false)
    setDistance(null)
    setBearing(null)
    setCardinal(null)
    inRangeCountRef.current = 0

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      setErrorMessage('Geolocation is not supported by your browser.')
      return
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy: acc } = position.coords
      const currentLoc: LatLng = { lat: latitude, lng: longitude }

      setUserCoords(currentLoc)
      setAccuracy(acc)
      setStatus('active')
      setErrorMessage(null)

      if (targetCoords) {
        const dist = haversineDistance(currentLoc, targetCoords)
        const brg = calculateBearing(currentLoc, targetCoords)
        const card = bearingToCardinal(brg)

        setDistance(dist)
        setBearing(brg)
        setCardinal(card)

        const isClose = dist <= unlockRadius

        // If reading has high accuracy (<= 10m) or we have 2 consecutive in-range fixes
        if (isClose) {
          inRangeCountRef.current += 1
          if (inRangeCountRef.current >= 2 || acc <= 12) {
            setWithinRange(true)
          }
        } else {
          inRangeCountRef.current = 0
          setWithinRange(false)
        }
      }
    }

    const handleError = (err: GeolocationPositionError) => {
      console.warn('Geolocation watch error:', err)
      if (err.code === err.PERMISSION_DENIED) {
        setStatus('denied')
        setErrorMessage(
          'Location permission was denied. Campus Quest requires GPS to detect campus locations. Please enable location permissions in your browser settings and tap Retry.'
        )
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setStatus('unavailable')
        setErrorMessage('Location information is currently unavailable. Please check your GPS signal.')
      } else if (err.code === err.TIMEOUT) {
        // Soft timeout — retry
        setStatus('loading')
      } else {
        setStatus('error')
        setErrorMessage(err.message || 'Error obtaining GPS fix.')
      }
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      })
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err?.message || 'Failed to start GPS tracker.')
    }
  }, [targetCoords, unlockRadius, stopWatch])

  useEffect(() => {
    startWatch()
    return () => {
      stopWatch()
    }
  }, [startWatch, stopWatch])

  return {
    userCoords,
    distance,
    bearing,
    cardinal,
    withinRange,
    accuracy,
    status,
    errorMessage,
    retry: startWatch,
  }
}
