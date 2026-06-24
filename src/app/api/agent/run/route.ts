// Requires: GEMINI_API_KEY in .env.local
// Requires: GROK_API_KEY in .env.local (only when AI_PROVIDER=grok)

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import OpenAI from 'openai'
import {
  createAgentRun,
  updateAgentRun,
  saveEvidenceArtifact,
} from '@/services/dbService'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })

if (!process.env.GEMINI_API_KEY) {
  console.error('[ZeroAudit] GEMINI_API_KEY is not set — agent will fail at runtime')
}

const AI_PROVIDER = process.env.AI_PROVIDER ?? 'gemini' // 'gemini' | 'grok'

const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY ?? '',
  baseURL: 'https://api.x.ai/v1',
})

const COMPLIANCE_SYSTEM_PROMPT = `You are an expert AI Compliance Auditor for SOC 2 Type II.
Analyze evidence artifacts against SOC 2 controls.
Respond ONLY with valid JSON: {"status": "covered"|"partial"|"missing", "reasoning": "...", "riskLevel": "low"|"medium"|"high"|"critical"}`

type GeminiAuditResult = {
  status: 'covered' | 'partial' | 'missing'
  reasoning: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

const MOCK_CONTROLS = [
  {
    controlId: 'CC6.1',
    controlName: 'Logical and Physical Access Controls',
    artifactType: 'log' as const,
    mockEvidence: `Access control review (last 30 days):
- MFA enforced for all 47 user accounts including service accounts ✓
- SSO via Okta configured for all production systems ✓
- Privileged access review completed 2026-06-01 ✓
- 1 anomaly detected: contractor account active 3 days after offboarding (remediated 2026-06-15)
- Automated deprovisioning via Okta Lifecycle Management enabled ✓
- Access logs retained for 365 days in CloudTrail ✓`,
  },
  {
    controlId: 'CC6.2',
    controlName: 'New Entity Access Registration and Deregistration',
    artifactType: 'log' as const,
    mockEvidence: `User provisioning/deprovisioning log (last 60 days):
- 12 new employees onboarded with role-based access (principle of least privilege) ✓
- 3 departures: 2 deprovisioned within 24h, 1 deprovisioned after 3 days (policy requires 24h)
- No shared accounts detected ✓
- Quarterly access review completed by IT manager on 2026-05-15 ✓
- 4 contractors: all have time-limited access tokens expiring within contract period ✓
- Access request workflow documented in Confluence ✓`,
  },
  {
    controlId: 'CC7.2',
    controlName: 'Vulnerability Management',
    artifactType: 'pr' as const,
    mockEvidence: `GitHub Security and CI pipeline review (last 30 days):
- Dependabot enabled: 2 critical CVEs identified, both patched within 14 days ✓
- SAST (CodeQL) runs on every PR — 0 critical findings in last 30 days ✓
- Penetration test completed 2026-04-20 by third-party vendor, report available ✓
- 1 medium severity finding from pentest open for 45 days (SLA is 30 days) ✗
- Container image scanning enabled via ECR ✓
- Dependency review policy blocks PRs with critical vulnerabilities ✓`,
  },
  {
    controlId: 'CC7.4',
    controlName: 'Incident Response',
    artifactType: 'log' as const,
    mockEvidence: `Incident management review (last 90 days):
- Incident response plan documented and last reviewed 2026-03-01 ✓
- 3 incidents logged in PagerDuty:
  * P2 database latency spike (2026-04-12): resolved in 2.5h, RCA completed ✓
  * P3 failed deployment (2026-05-03): rolled back in 15min ✓
  * P1 data pipeline failure (2026-06-10): took 6h to resolve, RCA pending (SLA: 48h)
- On-call rotation covers 24/7 with documented escalation path ✓
- No customer data affected in any incident ✓
- Annual tabletop exercise not yet completed for 2026 (due Q3) — partial`,
  },
  {
    controlId: 'CC8.1',
    controlName: 'Change Management',
    artifactType: 'commit' as const,
    mockEvidence: `Change management review (last 30 days):
- Branch protection enabled on main: requires 1 approval + passing CI ✓
- 47 PRs merged: 45 with ≥1 approval, 2 emergency hotfixes with post-merge review ✓
- All production deployments via CI/CD pipeline (no manual deploys) ✓
- Change tickets in Jira linked to 43/47 PRs (4 missing ticket reference)
- Rollback procedure documented and tested 2026-05-20 ✓
- CAB review for major changes: 3/3 major changes reviewed this month ✓`,
  },
  {
    controlId: 'A1.2',
    controlName: 'Availability — Recovery Time Objective',
    artifactType: 'log' as const,
    mockEvidence: `Business continuity and availability review:
- RTO defined as 4 hours, RPO defined as 1 hour in BCP document ✓
- Last DR test: 2026-02-15 — RTO achieved in 2h 45min ✓
- Multi-AZ deployment in AWS eu-north-1 ✓
- Automated backups: daily snapshots retained 30 days, tested monthly ✓
- Uptime last 90 days: 99.94% (SLA target: 99.9%) ✓
- No DR test conducted in last 4 months — next scheduled 2026-07-30 (overdue by company policy requiring semi-annual)`,
  },
]

const GEMINI_RESPONSE_SCHEMA = {
  responseMimeType: 'application/json',
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        enum: ['covered', 'partial', 'missing'],
      },
      reasoning: {
        type: Type.STRING,
      },
      riskLevel: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high', 'critical'],
      },
    },
    required: ['status', 'reasoning', 'riskLevel'],
  },
  systemInstruction: `You are an expert AI Compliance Auditor for SOC 2 Type II assessments.

Analyze the provided evidence artifact against the specified control requirement.
Be critical and realistic — partial compliance is common, perfect compliance is rare.

Scoring guidance:
- "covered": strong evidence of control with no significant gaps
- "partial": some controls in place but with notable exceptions
- "missing": no evidence of control, or evidence of active violations

riskLevel guidance:
- "critical": active security violations present
- "high": significant gaps that would cause audit failure
- "medium": gaps that require remediation before audit
- "low": minor gaps that should be documented`,
}

async function callGeminiWithRetry(
  prompt: string,
  retries = 2
): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash']

  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: GEMINI_RESPONSE_SCHEMA,
        })
        if (response.text) return response.text
      } catch (e: any) {
        const is503 = e?.status === 503 || e?.message?.includes('503')
        const isRateLimit = e?.status === 429 || e?.message?.includes('RESOURCE_EXHAUSTED')
        const isNotFound = e?.status === 404 || e?.message?.includes('NOT_FOUND')
        const isLastAttempt = attempt === retries
        const isLastModel = model === models[models.length - 1]

        if ((is503 || isRateLimit) && !isLastAttempt) {
          // Wait before retry: 1s, 2s
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000))
          continue
        }
        if ((is503 || isRateLimit || isNotFound) && !isLastModel) {
          console.warn(`[Gemini] ${model} failed (${e?.status}), trying next model`)
          break // try next model
        }
        throw e // non-retryable error or exhausted all models
      }
    }
  }
  throw new Error('All Gemini models unavailable')
}

async function analyzeControlWithGemini(
  control: (typeof MOCK_CONTROLS)[number]
): Promise<GeminiAuditResult> {
  const prompt = `SOC 2 Control: ${control.controlId} — ${control.controlName}

Evidence artifact type: ${control.artifactType}

Raw evidence:
${control.mockEvidence}

Analyze this evidence and determine compliance status for control ${control.controlId}.`

  const raw = await callGeminiWithRetry(prompt)
  if (!raw) {
    throw new Error(`Gemini returned empty response for ${control.controlId}`)
  }

  let result: GeminiAuditResult
  try {
    result = JSON.parse(raw) as GeminiAuditResult
  } catch {
    throw new Error(
      `Gemini response was not valid JSON for ${control.controlId}: ${raw.slice(0, 200)}`
    )
  }

  if (!['covered', 'partial', 'missing'].includes(result.status)) {
    throw new Error(
      `Invalid status "${result.status}" from Gemini for ${control.controlId}`
    )
  }

  return result
}

async function analyzeControl(
  control: typeof MOCK_CONTROLS[number]
): Promise<GeminiAuditResult> {
  const prompt = `SOC 2 Control: ${control.controlId} — ${control.controlName}

Evidence artifact type: ${control.artifactType}

Raw evidence:
${control.mockEvidence}

Analyze this evidence and determine compliance status for control ${control.controlId}.`

  if (AI_PROVIDER === 'grok') {
    const completion = await grokClient.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: COMPLIANCE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error(`Grok returned empty response for ${control.controlId}`)
    return JSON.parse(raw) as GeminiAuditResult
  }

  // Default: Gemini
  return analyzeControlWithGemini(control)
}

async function runAgentBackground(orgId: string, runId: string): Promise<void> {
  let controlsProcessed = 0
  let gapsFound = 0

  for (const control of MOCK_CONTROLS) {
    let auditResult: GeminiAuditResult

    // Step 1: Call AI provider
    try {
      auditResult = await analyzeControl(control)
    } catch (aiError) {
      console.error(
        `[runAgentBackground] AI analysis failed for ${control.controlId}:`,
        aiError
      )
      // Fallback result — do not stop the entire run
      auditResult = {
        status: 'missing',
        reasoning: 'AI analysis unavailable — manual review required.',
        riskLevel: 'high',
      }
    }

    // Step 2: Persist to DynamoDB
    const artifactId = crypto.randomUUID()
    const collectedAt = new Date().toISOString()
    try {
      await saveEvidenceArtifact({
        PK: `ORG#${orgId}`,
        SK: `EVIDENCE#${control.controlId}#${artifactId}`,
        controlId: control.controlId,
        artifactType: control.artifactType,
        sourceUrl: `mock://agent-run/${runId}/${control.controlId}`,
        rawData: control.mockEvidence,
        aiClassification: JSON.stringify(auditResult),
        coverageStatus: auditResult.status,
        collectedAt,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        GSI1PK: `ORG#${orgId}#CONTROL#${control.controlId}`,
        GSI1SK: collectedAt,
        GSI2PK: `ORG#${orgId}#STATUS#${auditResult.status}`,
        GSI2SK: control.controlId,
      })
    } catch (dbError) {
      // Non-fatal: log and continue — agent run survives DB hiccups
      console.warn(
        `[runAgentBackground] DynamoDB save failed for ${control.controlId} — continuing:`,
        dbError
      )
    }

    // Step 3: Update run progress
    controlsProcessed++
    if (auditResult.status !== 'covered') gapsFound++

    try {
      await updateAgentRun(orgId, runId, {
        controlsProcessed,
        gapsFound,
        agentMemory: JSON.stringify({
          lastProcessed: control.controlId,
          lastStatus: auditResult.status,
          lastRiskLevel: auditResult.riskLevel,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (updateError) {
      console.error(
        `[runAgentBackground] updateAgentRun failed after ${control.controlId}:`,
        updateError
      )
      // Non-fatal — progress tracking failed but audit continues
    }

    // Free tier rate limit: 5 req/min — wait 20s between controls
    const isLastControl = MOCK_CONTROLS.indexOf(control) === MOCK_CONTROLS.length - 1
    if (!isLastControl) {
      await new Promise(r => setTimeout(r, 20000))
    }
  }

  // Step 4: Mark completed
  await updateAgentRun(orgId, runId, {
    status: 'completed',
    agentMemory: JSON.stringify({
      completedAt: new Date().toISOString(),
      summary: `Processed ${controlsProcessed} controls, found ${gapsFound} gap(s)`,
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const runId = crypto.randomUUID()
    await createAgentRun(orgId, runId)

    void runAgentBackground(orgId, runId).catch(async (fatalError) => {
      console.error('[POST /api/agent/run] Fatal unhandled error:', fatalError)
      try {
        await updateAgentRun(orgId, runId, { status: 'failed' })
      } catch {
        // best-effort status update
      }
    })

    return NextResponse.json({ success: true, runId }, { status: 202 })
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    return NextResponse.json({ error: '[POST /agent/run] ' + error.message }, { status: 500 })
  }
}
