'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return
    setLoading(true)
    const orgId =
      'ORG_' +
      orgName
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
        .slice(0, 20)
    localStorage.setItem('zeroaudit_org_id', orgId)
    localStorage.setItem('zeroaudit_org_name', orgName.trim())
    router.push('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="text-3xl font-bold tracking-tight">
            Zero<span className="text-primary">Audit</span>
          </div>
          <p className="text-muted-foreground">
            AI-powered SOC 2 compliance automation
          </p>
        </div>

        <div className="space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Set up your organization</h1>
            <p className="text-sm text-muted-foreground">
              Get started with automated compliance monitoring in minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="orgName">
                Organization name
              </label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Security Inc."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
                required
                autoFocus
              />
            </div>

            <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
              <p className="text-sm font-medium text-foreground">What you get:</p>
              <div className="space-y-1.5">
                <p>✓ Automated evidence collection from GitHub, Jira, Okta</p>
                <p>✓ AI analysis of 42 SOC 2 Type II controls</p>
                <p>✓ Real-time compliance dashboard</p>
                <p>✓ Audit-ready PDF reports</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={!orgName.trim() || loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Start free trial →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          No credit card required · SOC 2 Type II certified infrastructure
        </p>
      </div>
    </div>
  )
}
