export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json()
  if (!apiKey) return NextResponse.json({ error: 'Missing apiKey' }, { status: 400 })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('pd_api_key', apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('pd_api_key')
  return response
}
