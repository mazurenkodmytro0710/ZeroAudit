'use client'

import { useEffect, useState } from 'react'

type Toast = { id: number; message: string; type?: 'info' | 'success' | 'warning' }

let listeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []
let nextId = 0

export function showToast(message: string, type: Toast['type'] = 'info') {
  const toast = { id: nextId++, message, type }
  toasts = [...toasts, toast]
  listeners.forEach((l) => l(toasts))
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id)
    listeners.forEach((l) => l(toasts))
  }, 3000)
}

export function ToastContainer() {
  const [current, setCurrent] = useState<Toast[]>([])

  useEffect(() => {
    listeners.push(setCurrent)
    return () => {
      listeners = listeners.filter((l) => l !== setCurrent)
    }
  }, [])

  if (current.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {current.map((toast) => (
        <div
          key={toast.id}
          className="min-w-64 animate-in slide-in-from-bottom-2 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg"
        >
          {toast.type === 'warning' && <span className="text-yellow-500">⚠</span>}
          {toast.type === 'success' && <span className="text-green-500">✓</span>}
          {toast.type === 'info' && <span className="text-blue-500">ℹ</span>}
          {toast.message}
        </div>
      ))}
    </div>
  )
}
