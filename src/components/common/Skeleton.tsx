import React from 'react'

export interface SkeletonProps {
  w?: string
  h?: string
  r?: string
  style?: React.CSSProperties
}

export function Skeleton({
  w = '100%',
  h = '16px',
  r = '8px',
  style = {},
}: SkeletonProps) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: 'rgba(255,255,255,0.07)',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

// Named alias matching Figma export shorthand
export const Skel = Skeleton
