export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { getAllEvidenceByOrg } from '@/services/dbService'
import type { EvidenceArtifact } from '@/types/db'

const TOTAL_CONTROLS = 42

const SOC2_TO_ISO: Record<string, { isoIds: string[]; isoName: string }> = {
  'CC6.1': { isoIds: ['A.9.1.1', 'A.9.4.1'], isoName: 'Access Control Policy' },
  'CC6.2': { isoIds: ['A.9.2.1', 'A.9.2.6'], isoName: 'User Registration and Deregistration' },
  'CC7.2': { isoIds: ['A.12.6.1', 'A.18.2.3'], isoName: 'Management of Technical Vulnerabilities' },
  'CC7.4': { isoIds: ['A.16.1.1', 'A.16.1.5'], isoName: 'Management of Information Security Incidents' },
  'CC8.1': { isoIds: ['A.12.1.2', 'A.14.2.2'], isoName: 'Change Management' },
  'A1.2':  { isoIds: ['A.17.1.1', 'A.17.2.1'], isoName: 'Information Security Continuity' },
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildCrosswalkRow(artifact: EvidenceArtifact): string {
  const iso = SOC2_TO_ISO[artifact.controlId]
  if (!iso) return ''
  return `<tr>
      <td><span class="control-id">${artifact.controlId}</span></td>
      <td>${iso.isoIds.map(id => `<span class="iso-id">${id}</span>`).join(' ')}</td>
      <td>${escapeHtml(iso.isoName)}</td>
      <td><span class="badge ${artifact.coverageStatus}">${artifact.coverageStatus}</span></td>
    </tr>`
}

function buildArtifactRow(artifact: EvidenceArtifact): string {
  let classification: { reasoning?: string; riskLevel?: string } = {}
  try {
    classification = JSON.parse(artifact.aiClassification ?? '{}')
  } catch {}

  const iso = SOC2_TO_ISO[artifact.controlId]
  const isoDisplay = iso ? iso.isoIds.join(', ') : artifact.controlId

  const reasoning = escapeHtml(classification.reasoning ?? 'N/A')
  const riskLevel = classification.riskLevel ?? 'medium'
  const date = new Date(artifact.collectedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return `<tr>
      <td>
        <span class="iso-id">${isoDisplay}</span>
        <div class="artifact-type">${artifact.controlId}</div>
      </td>
      <td>${artifact.artifactType}</td>
      <td><span class="badge ${artifact.coverageStatus}">${artifact.coverageStatus}</span></td>
      <td><span class="risk ${riskLevel}">${riskLevel}</span></td>
      <td><div class="reasoning">${reasoning}</div></td>
      <td>${date}</td>
    </tr>`
}

function buildReport(orgId: string, artifacts: EvidenceArtifact[]): string {
  const missingCount = artifacts.filter((a) => a.coverageStatus === 'missing').length
  const partialCount = artifacts.filter((a) => a.coverageStatus === 'partial').length
  const coveredCount = Math.max(0, TOTAL_CONTROLS - partialCount - missingCount)

  let verdictHTML: string
  if (missingCount === 0) {
    verdictHTML = `<div class="verdict pass">
      <div class="verdict-icon">&#x2705;</div>
      <div class="verdict-text">
        <strong>ISO 27001 Controls — No Critical Gaps</strong>
        <span>All monitored controls map to ISO 27001 Annex A requirements</span>
      </div>
    </div>`
  } else if (missingCount <= 1) {
    verdictHTML = `<div class="verdict partial">
      <div class="verdict-icon">&#x26A0;&#xFE0F;</div>
      <div class="verdict-text">
        <strong>Substantially Aligned &#x2014; Minor Gaps Found</strong>
        <span>${missingCount + partialCount} ISO control(s) require attention</span>
      </div>
    </div>`
  } else {
    verdictHTML = `<div class="verdict fail">
      <div class="verdict-icon">&#x274C;</div>
      <div class="verdict-text">
        <strong>Gaps Identified &#x2014; Remediation Required</strong>
        <span>${missingCount} ISO control area(s) lack sufficient evidence</span>
      </div>
    </div>`
  }

  const crosswalkRows = artifacts.length > 0
    ? artifacts.map(buildCrosswalkRow).join('')
    : `<tr><td colspan="4" style="text-align:center;padding:24px;color:#94a3b8;">No evidence artifacts — run the AI agent first.</td></tr>`

  const artifactRows = artifacts.length > 0
    ? artifacts.map(buildArtifactRow).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">No evidence artifacts collected yet.</td></tr>`

  const missingArtifacts = artifacts.filter((a) => a.coverageStatus === 'missing')
  const partialArtifacts = artifacts.filter((a) => a.coverageStatus === 'partial')

  let recommendationsHTML: string
  if (missingArtifacts.length === 0 && partialArtifacts.length === 0) {
    recommendationsHTML = '<p>All mapped ISO 27001 Annex A controls show adequate evidence coverage.</p>'
  } else {
    const items = [
      ...missingArtifacts.map((a) => {
        const iso = SOC2_TO_ISO[a.controlId]
        const isoRef = iso ? iso.isoIds.join(', ') : a.controlId
        return `<li>Implement <strong>${isoRef}</strong> (${a.controlId}) &#x2014; no evidence of compliance found.</li>`
      }),
      ...partialArtifacts.map((a) => {
        const iso = SOC2_TO_ISO[a.controlId]
        const isoRef = iso ? iso.isoIds.join(', ') : a.controlId
        return `<li>Strengthen <strong>${isoRef}</strong> (${a.controlId}) &#x2014; partial compliance, gaps require remediation.</li>`
      }),
    ]
    recommendationsHTML = `<ul style="padding-left:20px;margin-top:8px;">${items.join('')}</ul>`
  }

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const periodStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US')
  const periodEnd = new Date().toLocaleDateString('en-US')
  const currentYear = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZeroAudit &#x2014; ISO 27001:2022 Annex A Compliance Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           color: #0f172a; background: #fff; padding: 48px; max-width: 960px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start;
               border-bottom: 2px solid #0f172a; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .logo span { color: #6366f1; }
    .report-meta { text-align: right; font-size: 12px; color: #64748b; line-height: 1.6; }
    .report-meta strong { display: block; font-size: 14px; color: #0f172a; }
    .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
                   padding: 24px; margin-bottom: 32px; }
    .summary-box h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;
                      color: #64748b; margin-bottom: 16px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .summary-stat { text-align: center; }
    .summary-stat .value { font-size: 32px; font-weight: 700; line-height: 1; }
    .summary-stat .label { font-size: 11px; color: #64748b; margin-top: 4px; }
    .value.green { color: #16a34a; }
    .value.yellow { color: #ca8a04; }
    .value.red { color: #dc2626; }
    .value.blue { color: #6366f1; }
    .verdict { padding: 16px 24px; border-radius: 8px; margin-bottom: 32px;
               display: flex; align-items: center; gap: 12px; }
    .verdict.pass { background: #f0fdf4; border: 1px solid #86efac; }
    .verdict.fail { background: #fef2f2; border: 1px solid #fca5a5; }
    .verdict.partial { background: #fffbeb; border: 1px solid #fcd34d; }
    .verdict-icon { font-size: 24px; }
    .verdict-text strong { display: block; font-size: 16px; }
    .verdict-text span { font-size: 13px; color: #64748b; }
    h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px;
         border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
    thead th { background: #f8fafc; padding: 10px 12px; text-align: left;
               font-weight: 600; font-size: 11px; text-transform: uppercase;
               letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 12px; vertical-align: top; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px;
             font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge.covered { background: #dcfce7; color: #16a34a; }
    .badge.partial { background: #fef9c3; color: #854d0e; }
    .badge.missing { background: #fee2e2; color: #991b1b; }
    .risk { display: inline-block; padding: 2px 8px; border-radius: 4px;
            font-size: 11px; font-weight: 500; }
    .risk.low { background: #f0fdf4; color: #166534; }
    .risk.medium { background: #fffbeb; color: #92400e; }
    .risk.high { background: #fff7ed; color: #9a3412; }
    .risk.critical { background: #fef2f2; color: #7f1d1d; }
    .reasoning { font-size: 12px; color: #475569; line-height: 1.5; max-width: 400px; }
    .control-id { font-weight: 600; font-family: monospace; font-size: 12px; }
    .iso-id { font-family: monospace; font-size: 12px; font-weight: 600; color: #6366f1;
              background: #eef2ff; padding: 1px 6px; border-radius: 4px;
              display: inline-block; margin: 1px 2px 1px 0; }
    .artifact-type { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0;
              font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 24px; }
      .no-print { display: none; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:24px;text-align:right;">
    <button onclick="window.print()"
      style="background:#6366f1;color:#fff;border:none;padding:10px 20px;
             border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;">
      &#x2B07; Download / Print PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="logo">Zero<span>Audit</span></div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;">
        AI-Powered SOC 2 Compliance Platform
      </div>
    </div>
    <div class="report-meta">
      <strong>ISO 27001:2022 Annex A Compliance Report</strong>
      Organization: ${orgId}<br>
      Generated: ${generatedDate}<br>
      Audit Period: ${periodStart} &#x2014; ${periodEnd}
    </div>
  </div>

  <div class="summary-box">
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-stat">
        <div class="value blue">${TOTAL_CONTROLS}</div>
        <div class="label">Total Controls</div>
      </div>
      <div class="summary-stat">
        <div class="value green">${coveredCount}</div>
        <div class="label">Covered</div>
      </div>
      <div class="summary-stat">
        <div class="value yellow">${partialCount}</div>
        <div class="label">Partial</div>
      </div>
      <div class="summary-stat">
        <div class="value red">${missingCount}</div>
        <div class="label">Missing</div>
      </div>
    </div>
  </div>

  ${verdictHTML}

  <h3>SOC 2 &#x2192; ISO 27001:2022 Control Mapping</h3>
  <table>
    <thead>
      <tr>
        <th>SOC 2 Control</th>
        <th>ISO 27001 Controls</th>
        <th>Domain</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${crosswalkRows}
    </tbody>
  </table>

  <h3>Control Evidence Detail (ISO 27001 View)</h3>
  <table>
    <thead>
      <tr>
        <th>ISO Control</th>
        <th>Artifact Type</th>
        <th>Status</th>
        <th>Risk Level</th>
        <th>AI Reasoning</th>
        <th>Collected</th>
      </tr>
    </thead>
    <tbody>
      ${artifactRows}
    </tbody>
  </table>

  <h3>Recommendations</h3>
  <div style="font-size:13px;color:#475569;line-height:1.8;">
    ${recommendationsHTML}
  </div>

  <div class="footer">
    <span>Generated by ZeroAudit AI Compliance Platform</span>
    <span>Confidential &#x2014; For Internal Use Only</span>
    <span>ZeroAudit &copy; ${currentYear}</span>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')

  if (!orgId) {
    return Response.json({ error: 'orgId is required' }, { status: 400 })
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

    const html = buildReport(orgId, deduplicated)

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    return Response.json({ error: error.message }, { status: 500 })
  }
}
