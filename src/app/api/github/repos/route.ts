export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('github_token')?.value
  if (!token) return NextResponse.json({ connected: false, repos: [] })

  const [userRes, reposRes] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    }),
    fetch('https://api.github.com/user/repos?sort=updated&per_page=50&type=all', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    }),
  ])

  if (!userRes.ok) return NextResponse.json({ connected: false, repos: [], error: 'token_invalid' })

  const [user, repos] = await Promise.all([userRes.json(), reposRes.json()])

  return NextResponse.json({
    connected: true,
    user: { login: user.login, avatar_url: user.avatar_url, name: user.name },
    repos: Array.isArray(repos)
      ? repos.map((r: any) => ({
          id: r.id,
          full_name: r.full_name,
          private: r.private,
          updated_at: r.updated_at,
          language: r.language,
          default_branch: r.default_branch,
        }))
      : [],
  })
}
