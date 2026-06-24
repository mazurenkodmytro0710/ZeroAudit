# ZeroAudit

AI-powered SOC 2 compliance automation. Built for the H0: Hack the Zero Stack hackathon (AWS + Vercel, June 2026).

**Live demo:** https://zero-audit-red.vercel.app  
**GitHub:** https://github.com/mazurenkodmytro0710/ZeroAudit

## What it does

SOC 2 Type II audits are painful. Auditors want evidence for 42 controls — who has access, are vulnerabilities patched on time, does every deployment go through review. Normally you pay a consultant $15-50k and spend months collecting screenshots and logs manually.

ZeroAudit connects to your tools and has an AI agent collect that evidence automatically, then classifies it against SOC 2 controls and generates an audit-ready report.

## Why DynamoDB (for the judges)

I chose DynamoDB over Aurora for this because every query I need is org-scoped:
- "Give me all evidence for org X" → `PK = ORG#<orgId>`
- "Give me all CC6.1 artifacts sorted by time" → GSI1
- "Give me all missing controls" → GSI2

There are no cross-org queries anywhere in the app. Single-table design with two GSIs covers all access patterns without joins. Aurora would've been overkill — and slower to set up for a hackathon.

The schema:

```
PK: ORG#<orgId>   SK: EVIDENCE#<controlId>#<artifactId>
PK: ORG#<orgId>   SK: AGENTRUN#<runId>
PK: ORG#<orgId>   SK: INTEGRATION#<provider>#<id>
PK: ORG#<orgId>   SK: METADATA

GSI1PK: ORG#<orgId>#CONTROL#<controlId>   GSI1SK: collectedAt
GSI2PK: ORG#<orgId>#STATUS#<status>       GSI2SK: controlId
```

## What's real vs simulated

I want to be honest about this:

**Real data (live API calls):**
- CC7.2 — Dependabot alerts, code scanning alerts from GitHub API
- CC8.1 — Pull requests, branch protection rules from GitHub API
- CC6.1 — Repository collaborators from GitHub API
- A1.2 — IAM events, console logins from AWS CloudTrail
- CC7.4 — Incident history from PagerDuty API

**Simulated (mock evidence text, AI still analyzes it):**
- CC6.2 — Would need Okta integration for real user provisioning data
- Parts of CC6.1/CC6.2 — MFA status would need identity provider

The AI classification runs on whatever evidence it gets — real or mock. For demo purposes the mock data is realistic enough that Grok generates meaningful gap analysis.

## AI agent architecture

The agent runs as a fire-and-forget background process (POST /api/agent/run returns 202 immediately). I tried doing it synchronously but Vercel functions timeout at 10 seconds and 6 controls + AI calls take ~2 minutes.

Each control goes through:
1. Fetch real evidence from connected integrations
2. Merge with mock evidence for context
3. Send to Grok (grok-3-mini via OpenAI-compatible API) with structured output schema
4. Parse response: coverageStatus, riskLevel, reasoning
5. Save artifact to DynamoDB

The UI polls /api/agent/status every 3 seconds while showing a terminal animation. The animation is local (pre-scripted per control) — it doesn't wait for the actual API responses. This was an intentional UX decision.

## Stack

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS
- **Database:** AWS DynamoDB (eu-north-1), single-table design
- **AI:** Grok API (grok-3-mini) via OpenAI-compatible client
- **Auth:** GitHub OAuth (custom, no NextAuth)
- **Integrations:** GitHub API, AWS CloudTrail, PagerDuty API
- **Deploy:** Vercel

I switched from Gemini to Grok mid-development because Gemini's free tier hit daily quota limit. Grok's OpenAI-compatible API made the switch a one-line change.

## Running locally

```bash
git clone https://github.com/mazurenkodmytro0710/ZeroAudit
cd ZeroAudit
npm install
```

Create `.env.local`:

```
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
DYNAMODB_TABLE_NAME=soc2-autopilot
AI_PROVIDER=grok
GROK_API_KEY=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback
PAGERDUTY_API_KEY=...  # optional
```

```bash
npm run dev
```

## DynamoDB setup

Table name: `soc2-autopilot`, region: `eu-north-1`

- GSI1: partition key `GSI1PK` (String), sort key `GSI1SK` (String)
- GSI2: partition key `GSI2PK` (String), sort key `GSI2SK` (String)

Note: DynamoDB only allows creating one GSI at a time while another is being backfilled. I hit this limit during setup — had to wait ~5 minutes between GSI creations.

## What I'd do with more time

- Okta integration for real user provisioning data (CC6.2)
- Scheduled scans via Vercel Cron (currently manual only)
- Actually fix the deduplication at the write level instead of at read time
- Search that actually filters the evidence map (currently just navigates to the tab)
- Export evidence as CSV for auditors who prefer spreadsheets
