export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGapsByOrg } from '@/services/dbService';

const MOCK_STATS = {
  totalControls: 6,
  coveredControls: 2,
  partialControls: 4,
  missingControls: 0,
  securityGapsFound: 4,
  activeIntegrations: 0,
  coveragePercent: 33,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');

  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const githubToken = cookieStore.get('github_token')?.value;
  const activeIntegrations = githubToken ? 1 : 0;

  try {
    const rawGaps = await getGapsByOrg(orgId);

    // deduplication here because early on the agent was saving duplicate
    // artifacts on every run. Map keeps the latest collectedAt per controlId.
    // Probably should fix this at the write level eventually but this works for now.
    const latestByControl = new Map<string, typeof rawGaps[number]>();
    for (const artifact of rawGaps) {
      const existing = latestByControl.get(artifact.controlId);
      if (!existing || artifact.collectedAt > existing.collectedAt) {
        latestByControl.set(artifact.controlId, artifact);
      }
    }
    const gaps = Array.from(latestByControl.values());

    // totalControls hardcoded to 6 here because we only scan 6 controls.
    // The UI shows "3/6" which is accurate. Could make this dynamic
    // by counting distinct controlIds in DynamoDB but overkill for now.
    const totalControls = 6;
    const missingControls = gaps.filter((a) => a.coverageStatus === 'missing').length;
    const partialControls = gaps.filter((a) => a.coverageStatus === 'partial').length;
    const coveredControls = Math.max(0, totalControls - partialControls - missingControls);
    const securityGapsFound = missingControls + partialControls;
    // coveragePercent: debated whether partial should be 0% or 50%,
    // landed on covered/total — partial still counts as a gap in this view.
    // An auditor would probably disagree but this is for the dashboard readiness score.
    const coveragePercent = Math.round((coveredControls / totalControls) * 100);
    const lastUpdated =
      gaps.length > 0
        ? gaps.reduce(
            (latest, a) => (a.collectedAt > latest ? a.collectedAt : latest),
            gaps[0].collectedAt
          )
        : new Date().toISOString();

    return NextResponse.json(
      {
        totalControls,
        coveredControls,
        partialControls,
        missingControls,
        securityGapsFound,
        activeIntegrations,
        coveragePercent,
        lastUpdated,
      },
      { status: 200 }
    );
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.warn('[GET /dashboard/stats] DynamoDB unavailable, returning mock data:', error.message);
    return NextResponse.json(
      { ...MOCK_STATS, activeIntegrations, lastUpdated: new Date().toISOString() },
      { status: 200 }
    );
  }
}
