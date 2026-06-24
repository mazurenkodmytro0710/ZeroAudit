'use client'

import { useState } from "react"

type CriterionStatus = 'compliant' | 'partial' | 'missing'

type Criterion = {
  title: string
  status: CriterionStatus
  description: string
  controls: string[]
  coverage: string
}

const STATUS_CONFIG: Record<CriterionStatus, { label: string; badge: string; dot: string; bar: string }> = {
  compliant: {
    label: 'Compliant',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
  },
  partial: {
    label: 'Partial Coverage',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    dot: 'bg-yellow-500',
    bar: 'bg-yellow-500',
  },
  missing: {
    label: 'Missing Evidence',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
}

const ALL_CRITERIA: Criterion[] = [
  {
    title: 'Security',
    status: 'compliant',
    description: 'Logical & physical access, system operations, change management.',
    controls: ['CC6.1', 'CC6.2', 'CC6.3', 'CC7.1', 'CC7.2'],
    coverage: '28/30',
  },
  {
    title: 'Confidentiality',
    status: 'partial',
    description: 'Identification and protection of confidential information.',
    controls: ['C1.1', 'C1.2'],
    coverage: '6/9',
  },
  {
    title: 'Availability',
    status: 'missing',
    description: 'System uptime, monitoring, and disaster recovery readiness.',
    controls: ['A1.1', 'A1.2', 'A1.3'],
    coverage: '2/7',
  },
  {
    title: 'Processing Integrity',
    status: 'partial',
    description: 'Complete, accurate, and authorized system processing.',
    controls: ['PI1.1', 'PI1.2'],
    coverage: '5/6',
  },
  {
    title: 'Privacy',
    status: 'compliant',
    description: 'Collection, use, retention, and disposal of personal data.',
    controls: ['P1.1', 'P2.1', 'P3.1'],
    coverage: '9/9',
  },
  {
    title: 'CC1 — Control Environment',
    status: 'compliant',
    description: 'COSO principles, board oversight, organizational structure, competence.',
    controls: ['CC1.1', 'CC1.2', 'CC1.3', 'CC1.4', 'CC1.5'],
    coverage: '5/5',
  },
  {
    title: 'CC2 — Communication & Information',
    status: 'compliant',
    description: 'Internal and external communication of information relevant to objectives.',
    controls: ['CC2.1', 'CC2.2', 'CC2.3'],
    coverage: '3/3',
  },
  {
    title: 'CC3 — Risk Assessment',
    status: 'partial',
    description: 'Risk identification, analysis, and fraud risk consideration.',
    controls: ['CC3.1', 'CC3.2', 'CC3.3', 'CC3.4'],
    coverage: '3/4',
  },
  {
    title: 'CC4 — Monitoring Activities',
    status: 'partial',
    description: 'Ongoing and separate evaluations; communicating deficiencies.',
    controls: ['CC4.1', 'CC4.2'],
    coverage: '1/2',
  },
  {
    title: 'CC5 — Control Activities',
    status: 'compliant',
    description: 'Policies, procedures, and technology to achieve objectives.',
    controls: ['CC5.1', 'CC5.2', 'CC5.3'],
    coverage: '3/3',
  },
  {
    title: 'CC9 — Risk Mitigation',
    status: 'compliant',
    description: 'Vendor and business partner risk management.',
    controls: ['CC9.1', 'CC9.2'],
    coverage: '2/2',
  },
]

const INITIAL_COUNT = 5

function CriteriaCard({ title, status, description, controls, coverage }: Criterion) {
  const cfg = STATUS_CONFIG[status]
  const [coveredStr, totalStr] = coverage.split('/')
  const covered = Number(coveredStr)
  const total = Number(totalStr)
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className="font-semibold text-sm truncate">{title}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

      <div className="flex flex-wrap gap-1">
        {controls.map(ctrl => (
          <span key={ctrl} className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            {ctrl}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Evidence coverage</span>
          <span className="tabular-nums">{coverage}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cfg.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function CriteriaGrid() {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? ALL_CRITERIA : ALL_CRITERIA.slice(0, INITIAL_COUNT)

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Trust Service Criteria</h2>
        <p className="text-sm text-muted-foreground">
          Coverage across the five AICPA trust categories.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map(c => (
          <CriteriaCard key={c.title} {...c} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowAll(prev => !prev)}
        className="mt-4 flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
      >
        {showAll ? '↑ Show less' : `↓ View all ${ALL_CRITERIA.length} criteria categories`}
      </button>
    </section>
  )
}
