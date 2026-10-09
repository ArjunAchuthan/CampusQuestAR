import React, { useState } from 'react'
import type { NavTab } from '@/types'
import { NAV_TABS, NAV_LABELS } from '@/types'
import { NAV_ICONS } from '@/components/icons'

export interface BottomNavProps {
  active: NavTab | null
  onNav: (tab: NavTab) => void
}

export function BottomNav({ active, onNav }: BottomNavProps) {
  const [hovered, setHovered] = useState<NavTab | null>(null)
  const activeIdx = active ? NAV_TABS.indexOf(active) : -1

  // precise capsule metrics (nav pill has 6px horizontal padding)
  const capsuleLeft = (i: number) => `calc(6px + ${i} * (100% - 12px) / 5)`
  const capsuleWidth = 'calc((100% - 12px) / 5)'

  return (
    <div className="nav-outer">
      <div className="nav-pill">
        {/* active capsule — slides with spring easing */}
        {activeIdx >= 0 && (
          <div
            className="nav-capsule"
            style={{ left: capsuleLeft(activeIdx), width: capsuleWidth }}
          />
        )}

        {/* hover glow for inactive tabs */}
        {hovered && hovered !== active && (
          <div
            className="nav-hover-glow"
            style={{
              left: capsuleLeft(NAV_TABS.indexOf(hovered)),
              width: capsuleWidth,
            }}
          />
        )}

        {NAV_TABS.map((tab) => {
          const isActive = tab === active
          const isHovered = tab === hovered && !isActive
          const Icon = NAV_ICONS[tab]

          return (
            <button
              key={tab}
              className="nav-item"
              onClick={() => onNav(tab)}
              onMouseEnter={() => setHovered(tab)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(tab)}
              onTouchEnd={() => setHovered(null)}
            >
              <div
                className="nav-icon-wrap"
                style={{
                  color: isActive
                    ? '#8BBCD4'
                    : isHovered
                    ? 'rgba(242,242,247,0.72)'
                    : 'rgba(242,242,247,0.36)',
                  transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                <Icon size={22} />
              </div>
              {isActive && (
                <span className="nav-label">{NAV_LABELS[tab]}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
