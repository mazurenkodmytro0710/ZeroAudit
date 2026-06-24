'use client'

import { ListChecks, Plug, ShieldAlert, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { RadialProgress } from "./radial-progress"

type DashboardStats = {
  totalControls: number
  coveredControls: number
  partialControls: number
  missingControls: number
  securityGapsFound: number
  activeIntegrations: number
  coveragePercent: number
  lastUpdated: string
}

interface QuickStatsProps {
  stats: DashboardStats | null
  statsLoading: boolean
  isMounted: boolean
}

function Trend({ value, positive }: { value: string; positive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
        positive
          ? "bg-success/10 text-success"
          : "bg-danger/10 text-danger"
      }`}
    >
      {positive ? (
        <ArrowUpRight className="size-3" />
      ) : (
        <ArrowDownRight className="size-3" />
      )}
      {value}
    </span>
  )
}

export function QuickStats({ stats: apiStats, statsLoading, isMounted }: QuickStatsProps) {
  const isLoading = !isMounted || statsLoading

  const gaps = isLoading ? 0 : (apiStats?.securityGapsFound ?? 0)
  const integrations = isLoading ? 0 : (apiStats?.activeIntegrations ?? 0)
  const missing = isLoading ? 0 : (apiStats?.missingControls ?? 0)
  const partial = isLoading ? 0 : (apiStats?.partialControls ?? 0)
  const coveragePercent = isLoading ? 0 : (apiStats?.coveragePercent ?? 0)

  const statCards = [
    {
      label: "Total Controls",
      value: isLoading ? '—' : `${apiStats?.coveredControls ?? 0}/${apiStats?.totalControls ?? 6}`,
      icon: ListChecks,
      iconClass: "text-primary bg-primary/10",
      trend: <Trend value="SOC 2 Type II" positive />,
      sub: "Controls scanned this session",
    },
    {
      label: "Active Integrations",
      value: isLoading ? '—' : String(integrations),
      icon: Plug,
      iconClass: "text-success bg-success/10",
      trend: <Trend value={integrations > 0 ? "GitHub connected" : "None connected"} positive={integrations > 0} />,
      sub: "of 5 available integrations",
    },
    {
      label: "Security Gaps Found",
      value: isLoading ? '—' : String(gaps),
      icon: ShieldAlert,
      iconClass: "text-danger bg-danger/10",
      trend: <Trend value={gaps === 0 ? "All clear" : `${gaps} need attention`} positive={gaps === 0} />,
      sub: `${missing} high · ${partial} medium severity`,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="flex flex-row items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Overall Readiness</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {isLoading ? '—' : `${coveragePercent}%`}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">On track for audit</p>
        </div>
        <RadialProgress value={coveragePercent} />
      </Card>

      {statCards.map((s) => (
        <Card key={s.label} className="flex flex-col justify-between gap-4 p-5">
          <div className="flex items-start justify-between">
            <div className={`flex size-9 items-center justify-center rounded-md ${s.iconClass}`}>
              <s.icon className="size-4.5" />
            </div>
            {s.trend}
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</p>
            <p className="text-sm font-medium">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
