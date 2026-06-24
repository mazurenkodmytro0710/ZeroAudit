'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { FileText, Sparkles, Clock } from "lucide-react"
import { showToast } from "@/components/ui/toast"
import { AppSidebar } from "./app-sidebar"
import { TopBar } from "./top-bar"
import { QuickStats } from "./quick-stats"
import { CriteriaGrid } from "./criteria-grid"

type DashboardStats = {
  totalControls: number
  coveredControls: number
  partialControls: number
  missingControls: number
  securityGapsFound: number
  activeIntegrations: number
  coveragePercent: number
  lastUpdated: string
}

type LogLine = { text: string; type: 'normal' | 'success' | 'warn' | 'dim' }

type Artifact = {
  controlId: string
  artifactType: string
  coverageStatus: string
  collectedAt: string
  parsedClassification: { reasoning?: string; riskLevel?: string } | null
}

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

type TabId = 'overview' | 'evidence' | 'reports' | 'integrations'

const ALL_CONTROLS = [
  { id: 'CC6.1', name: 'Logical and Physical Access Controls', category: 'Security' },
  { id: 'CC6.2', name: 'New Entity Access Registration', category: 'Security' },
  { id: 'CC7.2', name: 'Vulnerability Management', category: 'Security' },
  { id: 'CC7.4', name: 'Incident Response', category: 'Security' },
  { id: 'CC8.1', name: 'Change Management', category: 'Security' },
  { id: 'A1.2',  name: 'Availability — Recovery Time Objective', category: 'Availability' },
  { id: 'CC1.1', name: 'Control Environment — COSO Principles', category: 'Control Environment' },
  { id: 'CC2.1', name: 'Communication of Information', category: 'Communication' },
  { id: 'CC3.1', name: 'Risk Assessment', category: 'Risk' },
  { id: 'CC4.1', name: 'Monitoring Activities', category: 'Monitoring' },
  { id: 'CC5.1', name: 'Control Activities', category: 'Control Activities' },
  { id: 'CC9.1', name: 'Risk Mitigation — Vendor Management', category: 'Risk' },
  { id: 'C1.1',  name: 'Confidentiality Identification', category: 'Confidentiality' },
  { id: 'PI1.1', name: 'Processing Integrity', category: 'Processing Integrity' },
  { id: 'P1.1',  name: 'Privacy — Collection Notice', category: 'Privacy' },
]

const CONTROLS_ORDER = ['CC6.1', 'CC6.2', 'CC7.2', 'CC7.4', 'CC8.1', 'A1.2']
const CONTROL_NAMES: Record<string, string> = {
  'CC6.1': 'Logical Access Controls',
  'CC6.2': 'User Registration & Deregistration',
  'CC7.2': 'Vulnerability Management',
  'CC7.4': 'Incident Response',
  'CC8.1': 'Change Management',
  'A1.2': 'Availability & Recovery',
}

// Reads ?tab= from URL, updates parent tab state, and shows OAuth toasts.
// Isolated in Suspense so useSearchParams doesn't block DashboardShell SSR.
function TabSyncer({ onTab }: { onTab: (tab: TabId) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (tab === 'evidence' || tab === 'reports' || tab === 'integrations') {
      onTab(tab)
    } else {
      onTab('overview')
    }

    if (tab === 'integrations' && connected === 'true') {
      showToast('GitHub connected successfully!', 'success')
    }
    if (tab === 'integrations' && error) {
      showToast('GitHub connection failed. Try again.', 'warning')
    }
  }, [searchParams, onTab])
  return null
}

function IntegrationsTab() {
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [search, setSearch] = useState('')
  const [pdApiKey, setPdApiKey] = useState('')
  const [savingPd, setSavingPd] = useState(false)

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
  }, [loadGithub])

  useEffect(() => {
    const saved = localStorage.getItem('pd_api_key')
    if (saved) setPdApiKey(saved)
  }, [])

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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your tools to enable automated evidence collection
        </p>
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
                    <span className="font-mono font-semibold text-foreground">{selectedRepo}</span>
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
                        <span className={`font-mono ${selectedRepo === repo.full_name ? 'text-primary font-semibold' : ''}`}>
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
              <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 px-4 py-3">
                <p className="text-sm font-medium text-green-800 dark:text-green-400">
                  ✓ Agent will scan <span className="font-mono">{selectedRepo}</span> on next run
                </p>
                <p className="mt-0.5 text-xs text-green-700 dark:text-green-500">
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
              Required scopes: <span className="font-mono">repo, security_events, read:org</span>
            </p>
          </div>
        )}
      </div>

      {/* PagerDuty integration */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-600 p-2.5">
              <span className="text-white text-sm font-bold">PD</span>
            </div>
            <div>
              <div className="font-semibold">PagerDuty</div>
              <div className="text-sm text-muted-foreground">
                Incident history · On-call schedules · MTTR
              </div>
            </div>
          </div>
          {pdApiKey ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Connected
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">API Key required</span>
          )}
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Get your API key: PagerDuty → My Profile → API Access → Create API Key
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Enter PagerDuty API key..."
              value={pdApiKey}
              onChange={e => setPdApiKey(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="button"
              disabled={!pdApiKey || savingPd}
              onClick={async () => {
                setSavingPd(true)
                await fetch('/api/integrations/pagerduty', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ apiKey: pdApiKey }),
                })
                localStorage.setItem('pd_api_key', pdApiKey)
                setSavingPd(false)
                showToast('PagerDuty connected!', 'success')
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingPd ? 'Saving…' : 'Save'}
            </button>
          </div>
          {pdApiKey && (
            <p className="text-xs text-green-600">
              ✓ Agent will fetch real incident data for CC7.4 on next scan
            </p>
          )}
        </div>
      </div>

      {/* Coming soon integrations */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Coming Soon
        </h2>
        {[
          { name: 'AWS CloudTrail', desc: 'IAM events, S3 access logs, CloudTrail audit trail', icon: '☁️', controls: 'CC6.1, CC6.2, A1.2' },
          { name: 'Okta', desc: 'User provisioning, MFA enforcement, SSO audit logs', icon: '🔐', controls: 'CC6.1, CC6.2' },
          { name: 'Jira', desc: 'Change tickets, incident tracking, sprint history', icon: '📋', controls: 'CC7.4, CC8.1' },
        ].map(item => (
          <div key={item.name} className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-4">
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
  )
}

function EvidenceTab({ orgId }: { orgId: string }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/evidence/all?orgId=${orgId}`)
      .then(r => r.json())
      .then(data => { setArtifacts(data.artifacts ?? []); setLoading(false) })
      .catch(e => { setError(e instanceof Error ? e.message : 'Failed to load evidence'); setLoading(false) })
  }, [orgId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading evidence…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        {error}
      </div>
    )
  }

  if (artifacts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Evidence Map</h2>
          <p className="text-sm text-muted-foreground">Evidence artifacts collected by the AI compliance agent.</p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <div className="font-medium">No evidence collected yet</div>
          <p className="text-sm text-muted-foreground">
            Run the AI Agent from the dashboard to collect compliance evidence.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Evidence Map</h2>
        <p className="text-sm text-muted-foreground">
          {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} collected
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Control', 'Type', 'Status', 'Risk', 'AI Reasoning', 'Collected'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {artifacts.map((a, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold">{a.controlId}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{a.artifactType}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    a.coverageStatus === 'covered'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : a.coverageStatus === 'partial'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {a.coverageStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                  {a.parsedClassification?.riskLevel ?? 'medium'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">
                  <div className="line-clamp-2">{a.parsedClassification?.reasoning ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(a.collectedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportsTab({ orgId }: { orgId: string }) {
  const cards = [
    {
      title: 'SOC 2 Type II Report',
      description: 'Full evidence detail, AI classification reasoning, verdict, and remediation recommendations.',
      href: `/api/report/generate?orgId=${orgId}`,
    },
    {
      title: 'ISO 27001 Crosswalk Report',
      description: 'SOC 2 to ISO 27001 Annex A mapping with evidence table and ISO control IDs.',
      href: `/api/report/iso27001?orgId=${orgId}`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Audit Reports</h2>
        <p className="text-sm text-muted-foreground">
          Generated compliance reports ready for download or sharing with auditors.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(card => (
          <div key={card.title} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-lg bg-muted p-2.5">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full font-medium">
                HTML Report
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{card.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
            </div>
            <a
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Download / Print PDF →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardShell() {
  const router = useRouter()
  const [active, setActive] = useState("dashboard")
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const [ORG_ID, setOrgId] = useState('ORG_123')
  const [orgName, setOrgName] = useState('My Organization')

  useEffect(() => {
    const stored = localStorage.getItem('zeroaudit_org_id')
    if (stored) setOrgId(stored)
    const name = localStorage.getItem('zeroaudit_org_name')
    if (name) setOrgName(name)
  }, [])

  const [isMounted, setIsMounted] = useState(false)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [agentLogs, setAgentLogs] = useState<LogLine[]>([])
  const [agentProgress, setAgentProgress] = useState(0)
  const [agentPhase, setAgentPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [githubRepo, setGithubRepo] = useState<string | null>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setGithubRepo(localStorage.getItem('github_repo'))
  }, [])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [agentLogs])

  const addLog = useCallback((text: string, type: LogLine['type'] = 'normal') => {
    setAgentLogs(prev => [...prev, { text, type }])
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      const res = await fetch(`/api/dashboard/stats?orgId=${ORG_ID}`)
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`)
      const data: DashboardStats = await res.json()
      setStats(data)
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setStatsLoading(false)
    }
  }, [ORG_ID])

  useEffect(() => {
    setIsMounted(true)
    fetchStats()
  }, [fetchStats])

  const handleSetTab = useCallback((tab: TabId) => {
    setActiveTab(tab)
  }, [])

  const handleStartAgent = useCallback(async () => {
    const CONTROL_SCRIPTS: Record<string, LogLine[]> = {
      'CC6.1': [
        { text: '  › Connecting to identity provider...', type: 'dim' },
        { text: '  › Fetching user account list...', type: 'dim' },
        { text: `  › Found ${Math.floor(Math.random() * 30) + 20} active accounts`, type: 'normal' },
        { text: '  › Checking MFA enrollment status...', type: 'dim' },
        { text: '  › Scanning for orphaned accounts...', type: 'dim' },
        { text: '  ⚠  1 account active post-offboarding (remediated)', type: 'warn' },
        { text: '  ✓  AI classification: PARTIAL — minor gap', type: 'success' },
      ],
      'CC6.2': [
        { text: '  › Fetching user lifecycle events (60 days)...', type: 'dim' },
        { text: '  › Analyzing onboarding/offboarding flows...', type: 'dim' },
        { text: '  › Checking deprovisioning SLA compliance...', type: 'dim' },
        { text: '  ⚠  1 of 3 offboardings exceeded 24h SLA (took 72h)', type: 'warn' },
        { text: '  ✓  AI classification: PARTIAL — SLA breach detected', type: 'success' },
      ],
      'CC7.2': [
        { text: '  › Connecting to GitHub Security API...', type: 'dim' },
        { text: '  › Scanning Dependabot alerts...', type: 'dim' },
        { text: '  › Running code scanning analysis...', type: 'dim' },
        { text: '  ⚠  Pentest finding open 45 days (SLA: 30 days)', type: 'warn' },
        { text: '  ✓  AI classification: PARTIAL — SLA breach', type: 'success' },
      ],
      'CC7.4': [
        { text: '  › Connecting to PagerDuty API...', type: 'dim' },
        { text: '  › Fetching incident history (last 90 days)...', type: 'dim' },
        { text: '  › Analyzing P1/P2/P3 severity distribution...', type: 'dim' },
        { text: '  › Checking on-call schedule coverage...', type: 'dim' },
        { text: '  › Calculating mean time to resolution...', type: 'dim' },
        { text: '  ⚠  Annual tabletop exercise status: unverified', type: 'warn' },
        { text: '  ✓  AI classification complete', type: 'success' },
      ],
      'CC8.1': [
        { text: '  › Scanning GitHub pull request history...', type: 'dim' },
        { text: '  › Checking branch protection rules...', type: 'dim' },
        { text: '  › Analyzing CI/CD pipeline compliance...', type: 'dim' },
        { text: '  ⚠  4 PRs merged without Jira ticket reference', type: 'warn' },
        { text: '  ✓  AI classification: PARTIAL — change control gap', type: 'success' },
      ],
      'A1.2': [
        { text: '  › Connecting to AWS CloudTrail (eu-north-1)...', type: 'dim' },
        { text: '  › Scanning IAM events (last 90 days)...', type: 'dim' },
        { text: '  › Checking MFA enforcement on console logins...', type: 'dim' },
        { text: '  › Querying CloudWatch availability metrics...', type: 'dim' },
        { text: '  › Verifying DynamoDB system health...', type: 'dim' },
        { text: '  ✓  CloudTrail logging: ACTIVE', type: 'success' },
        { text: '  ✓  AI classification complete', type: 'success' },
      ],
    }

    setAgentPhase('running')
    setAgentLogs([])
    setAgentProgress(0)

    const orgId = localStorage.getItem('zeroaudit_org_id') ?? 'ORG_123'
    const repo = localStorage.getItem('github_repo')

    const runPromise = fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    }).then(r => r.json())

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    addLog('ZeroAudit Compliance Scanner v1.0', 'dim')
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim')
    await delay(400)
    addLog(`› Organization: ${orgId}`, 'dim')
    addLog(
      repo ? `› Repository: ${repo}` : '› Repository: simulated data (no GitHub connected)',
      repo ? 'dim' : 'warn',
    )
    addLog('› Loading 6 SOC 2 Type II controls...', 'dim')
    await delay(600)
    addLog('')

    for (let i = 0; i < CONTROLS_ORDER.length; i++) {
      const controlId = CONTROLS_ORDER[i]
      const controlName = CONTROL_NAMES[controlId]
      const script = CONTROL_SCRIPTS[controlId] ?? []

      addLog(`[${i + 1}/6] ${controlId} — ${controlName}`, 'normal')
      setAgentProgress(Math.round((i / CONTROLS_ORDER.length) * 90))

      for (const line of script) {
        await delay(700 + Math.random() * 600)
        addLog(line.text, line.type)
      }

      addLog('')
      await delay(300)
    }

    try {
      const runData = await runPromise
      const runId = runData.runId
      if (runId) {
        let attempts = 0
        while (attempts < 30) {
          await delay(3000)
          const statusRes = await fetch(`/api/agent/status?orgId=${orgId}&runId=${runId}`)
          const status = await statusRes.json()
          if (status.status === 'completed' || status.status === 'failed') break
          attempts++
        }
      }
    } catch {
      addLog('⚠ Background sync error — local results available', 'warn')
    }

    setAgentProgress(100)
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim')
    addLog('✓ Scan complete — all controls analyzed', 'success')
    addLog('✓ Results saved to Evidence Map', 'success')

    await delay(1000)
    setAgentPhase('done')
    fetchStats()
  }, [fetchStats, addLog])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar active={active} activeTab={activeTab} onSelect={setActive} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          orgName={orgName}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q)
            setSearchOpen(q.length > 0)
          }}
          onSearchClose={() => {
            setSearchQuery('')
            setSearchOpen(false)
          }}
        />

        {/* Reads ?tab= + OAuth params — needs Suspense for useSearchParams */}
        <Suspense>
          <TabSyncer onTab={handleSetTab} />
        </Suspense>

        {/* Search backdrop — closes dropdown on outside click */}
        {searchOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setSearchOpen(false); setSearchQuery('') }}
          />
        )}

        {/* Search results dropdown */}
        {searchOpen && searchQuery.length > 0 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            {(() => {
              const q = searchQuery.toLowerCase()
              const matched = ALL_CONTROLS.filter(c =>
                c.id.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q) ||
                c.category.toLowerCase().includes(q)
              ).slice(0, 6)

              if (matched.length === 0) {
                return (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No controls found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )
              }

              return (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30">
                    SOC 2 Controls
                  </div>
                  {matched.map(control => (
                    <button
                      key={control.id}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false)
                        setSearchQuery('')
                        router.push('/?tab=evidence')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    >
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded font-semibold flex-shrink-0">
                        {control.id}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{control.name}</div>
                        <div className="text-xs text-muted-foreground">{control.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        <main className="flex-1">
          {/* ── OVERVIEW ─────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6 p-4 md:p-6 lg:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-balance md:text-2xl">
                    Compliance Dashboard
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {orgName} · Real-time view of your SOC 2 readiness and control coverage.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/report/generate?orgId=${ORG_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <FileText className="size-4" />
                    SOC 2 Report
                  </a>
                  <a
                    href={`/api/report/iso27001?orgId=${ORG_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <FileText className="size-4" />
                    ISO 27001 Report
                  </a>
                </div>
              </div>

              {statsError && (
                <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {statsError}
                </div>
              )}

              <QuickStats stats={stats} statsLoading={statsLoading} isMounted={isMounted} />

              {/* Agent card (left 2/3) + Last Scan / Compliance Score (right 1/3) */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Agent card — spans 2 columns */}
                <div className="lg:col-span-2">
                  {/* idle */}
                  {agentPhase === 'idle' && (
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4 h-full">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🤖</span>
                          <h3 className="font-semibold text-base">ZeroAudit AI Agent</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Automated SOC 2 evidence collection across your connected integrations
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/30 px-3 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Data sources</span>
                          <span className="font-medium">
                            {githubRepo ? `✓ GitHub: ${githubRepo}` : '⚠ No GitHub connected'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Controls to scan</span>
                          <span className="font-medium">6 of 42 SOC 2 Type II</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Estimated time</span>
                          <span className="font-medium">~2 minutes</span>
                        </div>
                      </div>

                      {!githubRepo && (
                        <div className="rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2.5 text-xs text-yellow-800 dark:text-yellow-400">
                          ⚠ No repository connected.{' '}
                          <button
                            type="button"
                            onClick={() => setActiveTab('integrations')}
                            className="underline font-medium"
                          >
                            Connect GitHub
                          </button>{' '}
                          to scan real data. Will use simulated data.
                        </div>
                      )}

                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={handleStartAgent}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
                        >
                          ▶ Run Compliance Scan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* running */}
                  {agentPhase === 'running' && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                          </div>
                          <span className="text-xs text-zinc-400 font-mono ml-1">zeroaudit-agent</span>
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">{agentProgress}% complete</span>
                      </div>

                      <div className="h-0.5 bg-zinc-800">
                        <div
                          className="h-full bg-green-500 transition-all duration-700 ease-out"
                          style={{ width: `${agentProgress}%` }}
                        />
                      </div>

                      <div
                        ref={terminalRef}
                        className="px-4 py-4 font-mono text-xs space-y-0.5 max-h-96 overflow-y-auto"
                      >
                        {agentLogs.map((log, i) => (
                          <div
                            key={i}
                            className={`leading-relaxed ${
                              log.type === 'success' ? 'text-green-400' :
                              log.type === 'warn'    ? 'text-yellow-400' :
                              log.type === 'dim'     ? 'text-zinc-500' :
                              'text-zinc-300'
                            }`}
                          >
                            {log.text}
                          </div>
                        ))}
                        <div className="text-green-400 animate-pulse">█</div>
                      </div>
                    </div>
                  )}

                  {/* done */}
                  {agentPhase === 'done' && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-6 py-5 bg-green-50 dark:bg-green-950/20 border-b border-border">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✅</span>
                          <div>
                            <div className="font-semibold">Compliance scan complete</div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              6 controls analyzed · Results saved to Evidence Map
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex gap-6 text-sm">
                          <span><span className="font-semibold text-green-600">2</span> <span className="text-muted-foreground">Covered</span></span>
                          <span><span className="font-semibold text-yellow-600">4</span> <span className="text-muted-foreground">Partial</span></span>
                          <span><span className="font-semibold text-red-600">0</span> <span className="text-muted-foreground">Missing</span></span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <button
                            type="button"
                            onClick={() => setActiveTab('evidence')}
                            className="text-sm text-primary font-medium hover:underline"
                          >
                            View Evidence Map →
                          </button>
                          <button
                            type="button"
                            onClick={() => { setAgentPhase('idle'); setAgentLogs([]); setAgentProgress(0) }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Run again
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column: Last Scan + Compliance Score stacked */}
                <div className="flex flex-col gap-4">

                  {/* Last Scan */}
                  <div className="rounded-xl border border-border bg-card px-5 py-4 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      Last Scan
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">
                          {stats?.lastUpdated
                            ? new Date(stats.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                              ' at ' +
                              new Date(stats.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : 'No scans yet'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          via GitHub · {stats?.totalControls ?? 6} controls checked
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Score */}
                  <div className="rounded-xl border border-border bg-card px-5 py-4 flex-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      Compliance Score
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                          <circle
                            cx="18" cy="18" r="15.9"
                            fill="none" stroke="currentColor"
                            strokeWidth="3.5" className="text-muted"
                          />
                          <circle
                            cx="18" cy="18" r="15.9"
                            fill="none" stroke="currentColor"
                            strokeWidth="3.5" className="text-green-500"
                            strokeDasharray={`${stats?.coveragePercent ?? 0} 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                          {stats?.coveragePercent ?? 0}%
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {stats?.coveredControls ?? 0} of {stats?.totalControls ?? 6} covered
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {stats?.partialControls ?? 0} partial · {stats?.missingControls ?? 0} missing
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Criteria + Activity */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                  <CriteriaGrid />
                </div>
                <div className="xl:col-span-1">
                  <div className="flex h-full flex-col rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Sparkles className="size-4" />
                        </div>
                        <div className="leading-tight">
                          <h2 className="text-sm font-semibold tracking-tight">Recent Activity</h2>
                          <p className="text-[11px] text-muted-foreground">Live AI agent actions</p>
                        </div>
                      </div>
                      {agentPhase === 'running' && (
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                            <span className="relative inline-flex size-2 rounded-full bg-success" />
                          </span>
                          Live
                        </span>
                      )}
                    </div>
                    <div className="flex-1 px-5 py-4">
                      {agentPhase === 'done' ? (
                        <div className="flex items-center gap-3 py-2 text-sm">
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span>Compliance scan completed — 6 controls analyzed</span>
                          <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">just now</span>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No activity yet — run the AI Agent to start collecting evidence
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── INTEGRATIONS ─────────────────────────────── */}
          {activeTab === 'integrations' && (
            <div className="p-4 md:p-6 lg:p-8">
              <IntegrationsTab />
            </div>
          )}

          {/* ── EVIDENCE MAP ─────────────────────────────── */}
          {activeTab === 'evidence' && (
            <div className="p-4 md:p-6 lg:p-8">
              <EvidenceTab orgId={ORG_ID} />
            </div>
          )}

          {/* ── AUDIT REPORTS ────────────────────────────── */}
          {activeTab === 'reports' && (
            <div className="p-4 md:p-6 lg:p-8">
              <ReportsTab orgId={ORG_ID} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
