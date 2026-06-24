'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { showToast } from '@/components/ui/toast'

type Repo = {
  id: number
  full_name: string
  private: boolean
  updated_at: string
  language: string | null
  default_branch: string
}

type GitHubUser = {
  login: string
  avatar_url: string
  name: string | null
}

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [search, setSearch] = useState('')

  const loadGithub = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/github/repos')
      const data = await res.json()
      if (data.connected) {
        setConnected(true)
        setUser(data.user)
        setRepos(data.repos)
      } else {
        setConnected(false)
      }
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGithub()
    const saved = localStorage.getItem('github_repo')
    if (saved) setSelectedRepo(saved)
    if (searchParams.get('connected') === 'true') showToast('GitHub connected!', 'success')
    if (searchParams.get('error')) showToast('GitHub connection failed. Try again.', 'warning')
  }, [loadGithub, searchParams])

  const handleSelectRepo = (repoName: string) => {
    setSelectedRepo(repoName)
    localStorage.setItem('github_repo', repoName)
    showToast(`Repository set to ${repoName}`, 'success')
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    await fetch('/api/github/disconnect', { method: 'POST' })
    localStorage.removeItem('github_repo')
    setConnected(false)
    setUser(null)
    setRepos([])
    setSelectedRepo('')
    setDisconnecting(false)
    showToast('GitHub disconnected', 'info')
  }

  const filtered = repos.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your tools to enable automated evidence collection
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Dashboard
          </a>
        </div>

        {/* GitHub card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-zinc-900 p-2.5">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold">GitHub</div>
                <div className="text-sm text-muted-foreground">
                  Pull requests · Dependabot alerts · Branch protection
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {loading ? (
                <span className="text-xs text-muted-foreground">Checking...</span>
              ) : connected ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                    Connected
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <a
                  href="/api/auth/github"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  Connect GitHub
                </a>
              )}
            </div>
          </div>

          {connected && user && (
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full" />
                <div>
                  <div className="text-sm font-medium">{user.name ?? user.login}</div>
                  <div className="text-xs text-muted-foreground">@{user.login}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Select repository to scan</label>
                  {selectedRepo && (
                    <span className="text-xs text-muted-foreground">
                      Active:{' '}
                      <span className="font-mono font-semibold text-foreground">
                        {selectedRepo}
                      </span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground"
                />
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No repositories found
                    </div>
                  ) : (
                    filtered.map(repo => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => handleSelectRepo(repo.full_name)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors hover:bg-muted/40 ${
                          selectedRepo === repo.full_name ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {selectedRepo === repo.full_name && (
                            <span className="text-primary">✓</span>
                          )}
                          <span
                            className={`font-mono ${
                              selectedRepo === repo.full_name
                                ? 'text-primary font-semibold'
                                : ''
                            }`}
                          >
                            {repo.full_name}
                          </span>
                          {repo.language && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {repo.language}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {repo.private ? '🔒' : '🌐'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {selectedRepo && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-sm font-medium text-green-800">
                    ✓ Agent will scan{' '}
                    <span className="font-mono">{selectedRepo}</span> on next run
                  </p>
                  <p className="mt-0.5 text-xs text-green-700">
                    Collects: PRs, Dependabot alerts, branch protection, collaborators
                  </p>
                </div>
              )}
            </div>
          )}

          {!loading && !connected && (
            <div className="px-6 py-8 text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Connect GitHub to scan real repositories
              </p>
              <p className="text-xs text-muted-foreground">
                Required scopes:{' '}
                <span className="font-mono">repo, security_events, read:org</span>
              </p>
            </div>
          )}
        </div>

        {/* Coming soon integrations */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Coming Soon
          </h2>
          {[
            {
              name: 'AWS CloudTrail',
              desc: 'IAM events, S3 access logs, CloudTrail audit trail',
              icon: '☁️',
              controls: 'CC6.1, CC6.2, A1.2',
            },
            {
              name: 'Okta',
              desc: 'User provisioning, MFA enforcement, SSO audit logs',
              icon: '🔐',
              controls: 'CC6.1, CC6.2',
            },
            {
              name: 'Jira',
              desc: 'Change tickets, incident tracking, sprint history',
              icon: '📋',
              controls: 'CC7.4, CC8.1',
            },
            {
              name: 'PagerDuty',
              desc: 'Incident history, on-call rotation, escalation policies',
              icon: '🚨',
              controls: 'CC7.4',
            },
          ].map(item => (
            <div
              key={item.name}
              className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="font-medium text-muted-foreground">{item.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    Coming Soon
                  </span>
                  <div className="mt-1 text-xs text-muted-foreground">{item.controls}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <IntegrationsContent />
    </Suspense>
  )
}
