export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('github_token')
  return response
}
