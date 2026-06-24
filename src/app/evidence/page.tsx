'use client'

import { useEffect, useState } from 'react'

const ORG_ID = 'ORG_123'

type ParsedClassification = {
  reasoning?: string
  riskLevel?: string
  status?: string
}

type EnrichedArtifact = {
  PK: string
  SK: string
  controlId: string
  artifactType: string
  coverageStatus: string
  collectedAt: string
  parsedClassification: ParsedClassification | null
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    covered: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    missing: 'bg-red-100 text-red-800',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  )
}

function RiskBadge({ risk }: { risk: string }) {
  const styles: Record<string, string> = {
    low: 'bg-green-50 text-green-700',
    medium: 'bg-yellow-50 text-yellow-700',
    high: 'bg-orange-50 text-orange-700',
    critical: 'bg-red-50 text-red-800 font-bold',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs capitalize ${styles[risk] ?? 'bg-gray-50 text-gray-700'}`}
    >
      {risk}
    </span>
  )
}

export default function EvidencePage() {
  const [artifacts, setArtifacts] = useState<EnrichedArtifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchArtifacts() {
      try {
        const res = await fetch(`/api/evidence/all?orgId=${ORG_ID}`)
        if (!res.ok) throw new Error(`Failed to fetch evidence: ${res.status}`)
        const data = await res.json()
        setArtifacts(data.artifacts ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load evidence')
      } finally {
        setLoading(false)
      }
    }
    fetchArtifacts()
  }, [])

  const coveredCount = artifacts.filter((a) => a.coverageStatus === 'covered').length
  const partialCount = artifacts.filter((a) => a.coverageStatus === 'partial').length
  const missingCount = artifacts.filter((a) => a.coverageStatus === 'missing').length

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Evidence Map</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI-analyzed compliance artifacts stored in DynamoDB
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Dashboard
          </a>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && artifacts.length > 0 && (
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700">
              ● {coveredCount} Covered
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-sm font-medium text-yellow-700">
              ● {partialCount} Partial
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-700">
              ● {missingCount} Missing
            </span>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Control
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Risk
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  AI Reasoning
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Collected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {artifacts.map((artifact) => (
                <tr
                  key={artifact.SK}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <span className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold">
                      {artifact.controlId}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {artifact.artifactType}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={artifact.coverageStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge
                      risk={artifact.parsedClassification?.riskLevel ?? 'medium'}
                    />
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {artifact.parsedClassification?.reasoning ??
                        'No reasoning available'}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(artifact.collectedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && artifacts.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-lg font-medium">No evidence collected yet</p>
              <p className="mt-1 text-sm">
                Run the AI agent from the dashboard to collect evidence
              </p>
              <a
                href="/"
                className="mt-4 inline-block text-sm text-primary hover:underline"
              >
                Go to Dashboard →
              </a>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center text-muted-foreground">
              <p>Loading evidence artifacts...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
