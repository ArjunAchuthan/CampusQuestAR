import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useGeofence } from '@/lib/useGeofence'

/**
 * Creates custom divIcon for the live user location with a pulsing halo on OpenStreetMap.
 */
function createUserIcon(): L.DivIcon {
  return L.divIcon({
    className: 'leaflet-custom-div-icon',
    html: `
      <div class="user-map-pin">
        <div class="user-map-pulse"></div>
        <div class="user-map-core"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

export function MapScreen() {
  // Geolocation tracker for user's live position
  const {
    userCoords,
    accuracy,
    status: geoStatus,
    errorMessage: geoError,
    retry: retryGeo,
  } = useGeofence(null)

  // Map and layer references
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)

  // Auto-follow navigation state
  const [isAutoFollowing, setIsAutoFollowing] = useState(true)
  const hasCenteredOnUserRef = useRef(false)

  // Recenter / Focus on user position
  const handleRecenter = useCallback(() => {
    setIsAutoFollowing(true)
    const map = mapRef.current
    if (!map) return

    if (userCoords) {
      map.flyTo([userCoords.lat, userCoords.lng], 17, { animate: true, duration: 0.8 })
    }
  }, [userCoords])

  // ── 1. Initialize Leaflet Map Instance with Default OpenStreetMap ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const initialCenter: [number, number] = userCoords
      ? [userCoords.lat, userCoords.lng]
      : [37.4275, -122.1697]

    const initialZoom = userCoords ? 17 : 15

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    })

    // Default Crisp Standard OpenStreetMap Tiles (clean light/white theme)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Attribution control positioned at bottom-left so top-right is completely free
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)

    // Disable auto-following if the user manually drags the map
    map.on('dragstart', () => {
      setIsAutoFollowing(false)
    })

    mapRef.current = map

    // Ensure Leaflet calculates dimensions correctly after mount
    requestAnimationFrame(() => {
      map.invalidateSize()
    })
    const t1 = setTimeout(() => map.invalidateSize(), 150)
    const t2 = setTimeout(() => map.invalidateSize(), 500)

    // ResizeObserver for dynamic layout/orientation changes
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      observer.disconnect()
      map.remove()
      mapRef.current = null
      userMarkerRef.current = null
      accuracyCircleRef.current = null
      hasCenteredOnUserRef.current = false
    }
  }, [])

  // ── 2. Sync User Location & Accuracy Marker ──
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (userCoords) {
      const userLatLng: [number, number] = [userCoords.lat, userCoords.lng]

      // User Marker
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLatLng)
      } else {
        const marker = L.marker(userLatLng, {
          icon: createUserIcon(),
          zIndexOffset: 1000,
        }).addTo(map)
        userMarkerRef.current = marker
      }

      // Accuracy Circle
      if (typeof accuracy === 'number' && accuracy > 0) {
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(userLatLng)
          accuracyCircleRef.current.setRadius(accuracy)
        } else {
          const circle = L.circle(userLatLng, {
            radius: accuracy,
            color: 'rgba(0, 122, 255, 0.55)',
            fillColor: 'rgba(0, 122, 255, 0.12)',
            fillOpacity: 1,
            weight: 1.5,
            dashArray: '4, 4',
          }).addTo(map)
          accuracyCircleRef.current = circle
        }
      }

      // Center on user upon first GPS lock
      if (!hasCenteredOnUserRef.current) {
        hasCenteredOnUserRef.current = true
        map.setView(userLatLng, 17, { animate: true })
      } else if (isAutoFollowing) {
        map.panTo(userLatLng, { animate: true })
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove()
        accuracyCircleRef.current = null
      }
    }
  }, [userCoords, accuracy, isAutoFollowing])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f2efe9', zIndex: 10, overflow: 'hidden' }}>
      {/* ── 1. Full-bleed Leaflet Map Viewport ── */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(var(--safe-top) + var(--banner-h))',
          left: 0,
          right: 0,
          bottom: 0,
          background: '#f2efe9',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Leaflet map base container */}
        <div
          ref={mapContainerRef}
          id="quest-leaflet-map"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: '#f2efe9',
            zIndex: 1,
          }}
        />

        {/* ── Top GPS Status Pill (Always above map tiles, z-index: 1100) ── */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(18, 20, 24, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 100,
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            zIndex: 1100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: userCoords ? '#34C759' : '#007AFF',
              boxShadow: `0 0 8px ${userCoords ? '#34C759' : '#007AFF'}`,
              animation: userCoords ? 'none' : 'pulseIndicator 1.5s infinite alternate',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: userCoords ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
              letterSpacing: '-0.01em',
            }}
          >
            {userCoords
              ? `My Location: ${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}`
              : geoStatus === 'loading'
              ? 'Acquiring GPS signal…'
              : 'GPS Waiting for fix'}
          </span>
        </div>

        {/* ── Floating Map Controls (Top-Right, Always above all Leaflet layers, z-index: 1100) ── */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            title="Recenter on My Location"
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: isAutoFollowing
                ? '#007AFF'
                : 'rgba(24, 26, 32, 0.92)',
              border: `1px solid ${
                isAutoFollowing ? '#007AFF' : 'rgba(255, 255, 255, 0.18)'
              }`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="7" />
              <line x1="12" y1="1" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="1" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="23" y2="12" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </button>

          {/* Zoom In */}
          <button
            onClick={() => mapRef.current?.zoomIn()}
            title="Zoom In"
            style={{
              width: 44,
              height: 44,
              borderRadius: '14px 14px 6px 6px',
              background: 'rgba(24, 26, 32, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
              fontSize: 20,
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            +
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => mapRef.current?.zoomOut()}
            title="Zoom Out"
            style={{
              width: 44,
              height: 44,
              borderRadius: '6px 6px 14px 14px',
              background: 'rgba(24, 26, 32, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              marginTop: -4,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: 'auto',
              fontSize: 20,
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}
          >
            −
          </button>
        </div>
      </div>

      {/* ── 2. Geolocation Permission Denied / Error Overlay ── */}
      {geoStatus === 'denied' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(7, 9, 14, 0.92)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 28px',
          }}
        >
          <div className="glass-card" style={{ maxWidth: 360, width: '100%', textAlign: 'center', padding: '28px 22px' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255, 69, 58, 0.14)',
                border: '1px solid rgba(255, 69, 58, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#FF453A',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#F2F2F7', marginBottom: 6 }}>
              GPS Location Required
            </div>
            <p style={{ fontSize: 13, color: 'rgba(242, 242, 247, 0.6)', lineHeight: 1.5, margin: '0 0 20px' }}>
              {geoError || 'Please allow location access in your browser to view your coordinates on the map.'}
            </p>
            <button onClick={retryGeo} className="primary-btn" style={{ padding: '12px 20px', fontSize: 13.5 }}>
              Enable Location & Retry
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Map Marker & Leaflet CSS Custom Overrides ── */}
      <style>{`
        /* Leaflet Container */
        .leaflet-container {
          background: #f2efe9 !important;
          font-family: inherit !important;
          width: 100% !important;
          height: 100% !important;
        }

        /* Default clean OpenStreetMap tiles with no filters */
        .leaflet-tile {
          filter: none !important;
        }

        /* Clean attribution badge at bottom */
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.85) !important;
          color: rgba(0, 0, 0, 0.6) !important;
          font-size: 9px !important;
          border-radius: 6px !important;
          padding: 2px 6px !important;
          margin: 10px !important;
          backdrop-filter: blur(8px);
          border: 0.5px solid rgba(0, 0, 0, 0.1);
        }
        .leaflet-control-attribution a {
          color: #007AFF !important;
          text-decoration: none;
        }

        /* DivIcon Reset */
        .leaflet-custom-div-icon {
          background: transparent !important;
          border: none !important;
        }

        /* ── Live User Marker on Light Map ── */
        .user-map-pin {
          position: relative;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-map-pulse {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(0, 122, 255, 0.25);
          border: 1.5px solid rgba(0, 122, 255, 0.6);
          animation: userMapPulseRing 2.2s ease-out infinite;
        }

        .user-map-core {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #007AFF;
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 10px rgba(0, 122, 255, 0.8), 0 2px 6px rgba(0,0,0,0.35);
          z-index: 2;
        }

        @keyframes userMapPulseRing {
          0% { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(1.9); opacity: 0; }
        }

        @keyframes pulseIndicator {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
