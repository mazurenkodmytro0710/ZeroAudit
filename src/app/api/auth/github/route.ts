export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: process.env.GITHUB_REDIRECT_URI!,
    scope: 'repo security_events read:org',
    state: Math.random().toString(36).slice(2),
  })
  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params}`
  )
}
