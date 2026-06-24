export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAgentRun } from '@/services/dbService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const runId = searchParams.get('runId');

  if (!orgId || !runId) {
    return NextResponse.json(
      { error: 'orgId and runId are required' },
      { status: 400 }
    );
  }

  try {
    const agentRun = await getAgentRun(orgId, runId);

    if (!agentRun) {
      return NextResponse.json({ error: 'Agent run not found' }, { status: 404 });
    }

    return NextResponse.json(agentRun, { status: 200 });
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json(
      { error: '[GET /agent/status] ' + error.message },
      { status: 500 }
    );
  }
}
