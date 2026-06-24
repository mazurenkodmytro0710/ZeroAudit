'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default function HomePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const orgId = localStorage.getItem('zeroaudit_org_id')
    if (!orgId) {
      router.replace('/onboarding')
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  return <DashboardShell />
}
