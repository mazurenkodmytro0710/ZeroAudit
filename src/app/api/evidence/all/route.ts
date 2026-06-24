export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAllEvidenceByOrg } from '@/services/dbService'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
  }

  try {
    const artifacts = await getAllEvidenceByOrg(orgId)

    const latestByControl = new Map<string, typeof artifacts[number]>()
    for (const artifact of artifacts) {
      const existing = latestByControl.get(artifact.controlId)
      if (!existing || artifact.collectedAt > existing.collectedAt) {
        latestByControl.set(artifact.controlId, artifact)
      }
    }
    const deduplicated = Array.from(latestByControl.values())

    const enrichedArtifacts = deduplicated.map((artifact) => {
      let parsedClassification: {
        reasoning?: string
        riskLevel?: string
        status?: string
      } | null = null
      try {
        parsedClassification = JSON.parse(artifact.aiClassification ?? '{}')
      } catch {}
      return { ...artifact, parsedClassification }
    })

    return NextResponse.json({ artifacts: enrichedArtifacts }, { status: 200 })
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
