import { useState, useEffect, useRef, useCallback } from 'react'

export type CameraStatus = 'idle' | 'loading' | 'active' | 'denied' | 'not-found' | 'error'

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  status: CameraStatus
  errorMessage: string | null
  retry: () => void
  pause: () => void
}

/**
 * useCamera Hook
 *
 * Requests the camera stream on mount (preferring the environment rear camera),
 * binds it to a video element ref, and cleanly stops all tracks on unmount
 * so device camera indicators turn off when switching tabs.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState<CameraStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    stopStream()
    setStatus('loading')
    setErrorMessage(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setErrorMessage(
        'Camera API is not supported in this browser. Please ensure you are using a modern browser over HTTPS or localhost.'
      )
      return
    }

    try {
      // First attempt: Rear camera ('environment') for AR exploration
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
      } catch {
        // Fallback: Default video stream if environment camera query fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch {
          // Autoplay handled by loadedmetadata / playsinline
        }
      }

      setStatus('active')
    } catch (err: any) {
      console.warn('Camera access error:', err)
      const errName = err?.name || ''
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setStatus('denied')
        setErrorMessage(
          'Camera access was denied. Please allow camera permissions in your browser or site settings, then tap Retry.'
        )
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setStatus('not-found')
        setErrorMessage('No camera device was detected on your device.')
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setStatus('error')
        setErrorMessage('Camera is currently in use by another application. Please close other camera apps and retry.')
      } else {
        setStatus('error')
        setErrorMessage(err?.message || 'Unable to access camera feed.')
      }
    }
  }, [stopStream])

  useEffect(() => {
    startCamera()
    return () => {
      stopStream()
    }
  }, [startCamera, stopStream])

  return {
    videoRef,
    status,
    errorMessage,
    retry: startCamera,
    pause: stopStream,
  }
}
