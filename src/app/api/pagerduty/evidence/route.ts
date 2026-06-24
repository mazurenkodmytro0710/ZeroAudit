export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest) {
  const apiKey = process.env.PAGERDUTY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'PagerDuty not configured' }, { status: 401 })
  }

  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceISO = since.toISOString()

  const headers = {
    'Authorization': `Token token=${apiKey}`,
    'Accept': 'application/vnd.pagerduty+json;version=2',
    'Content-Type': 'application/json',
  }

  logger.info('PagerDuty: fetching incident evidence')

  try {
    const [incidentsRes, servicesRes, onCallRes] = await Promise.all([
      fetch(`https://api.pagerduty.com/incidents?since=${sinceISO}&limit=100&sort_by=created_at`, { headers }),
      fetch('https://api.pagerduty.com/services?limit=25', { headers }),
      fetch('https://api.pagerduty.com/oncalls?limit=25', { headers }),
    ])

    const [incidentsData, servicesData, onCallData] = await Promise.all([
      incidentsRes.json(),
      servicesRes.json(),
      onCallRes.json(),
    ])

    const incidents = incidentsData.incidents ?? []
    const services = servicesData.services ?? []
    const oncalls = onCallData.oncalls ?? []

    const p1 = incidents.filter((i: any) => i.urgency === 'high' && i.priority?.name === 'P1')
    const p2 = incidents.filter((i: any) => i.priority?.name === 'P2')
    const resolved = incidents.filter((i: any) => i.status === 'resolved')
    const triggered = incidents.filter((i: any) => i.status === 'triggered')

    const resolutionTimes = resolved
      .filter((i: any) => i.created_at && i.last_status_change_at)
      .map((i: any) => {
        const created = new Date(i.created_at).getTime()
        const resolvedAt = new Date(i.last_status_change_at).getTime()
        return (resolvedAt - created) / (1000 * 60 * 60)
      })
    const avgResolutionHours = resolutionTimes.length > 0
      ? (resolutionTimes.reduce((a: number, b: number) => a + b, 0) / resolutionTimes.length).toFixed(1)
      : null

    const evidence = {
      totalIncidents: incidents.length,
      p1Incidents: p1.length,
      p2Incidents: p2.length,
      resolvedIncidents: resolved.length,
      openIncidents: triggered.length,
      avgResolutionHours,
      services: services.length,
      onCallCoverage: oncalls.length > 0,
      onCallTeams: oncalls.map((o: any) => o.schedule?.summary).filter(Boolean),
      recentIncidents: incidents.slice(0, 5).map((i: any) => ({
        title: i.title,
        urgency: i.urgency,
        status: i.status,
        createdAt: i.created_at,
        priority: i.priority?.name ?? 'unset',
      })),
    }

    logger.info('PagerDuty: evidence fetched', {
      total: incidents.length,
      open: triggered.length,
      services: services.length,
    })

    return NextResponse.json({ evidence })
  } catch (err) {
    logger.error('PagerDuty: fetch failed', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
