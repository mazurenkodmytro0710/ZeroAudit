export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getEvidenceByControl } from '@/services/dbService';

const CONTROL_ID_REGEX = /^[A-Z]{1,2}\d+\.\d+$/;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const controlId = searchParams.get('controlId');

  if (!orgId || !controlId) {
    return NextResponse.json(
      { error: 'orgId and controlId are required' },
      { status: 400 }
    );
  }

  if (!CONTROL_ID_REGEX.test(controlId)) {
    return NextResponse.json({ error: 'Invalid controlId format' }, { status: 400 });
  }

  try {
    const evidence = await getEvidenceByControl(orgId, controlId);

    return NextResponse.json(
      {
        controlId,
        artifacts: evidence,
        summary: {
          total: evidence.length,
          covered: evidence.filter((e) => e.coverageStatus === 'covered').length,
          partial: evidence.filter((e) => e.coverageStatus === 'partial').length,
          missing: evidence.filter((e) => e.coverageStatus === 'missing').length,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json(
      { error: '[GET /evidence/control] ' + error.message },
      { status: 500 }
    );
  }
}
