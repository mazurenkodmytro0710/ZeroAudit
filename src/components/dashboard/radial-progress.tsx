"use client"

import { useEffect, useState } from "react"

export function RadialProgress({
  value,
  size = 92,
  strokeWidth = 8,
}: {
  value: number
  size?: number
  strokeWidth?: number
}) {
  const [progress, setProgress] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setProgress(value), 120)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Overall readiness score ${value} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums tracking-tight">
          {progress}%
        </span>
      </div>
    </div>
  )
}
