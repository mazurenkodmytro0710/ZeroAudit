"use client"

import { useState, useEffect } from "react"
import type { ElementType } from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Plug,
  Map,
  FileText,
  ShieldCheck,
  Settings,
  LifeBuoy,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { showToast } from "@/components/ui/toast"

type NavItem = {
  id: string
  label: string
  icon: ElementType
  badge?: string
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "evidence", label: "Evidence Map", icon: Map },
  { id: "reports", label: "Audit Reports", icon: FileText },
]

const bottomItems: NavItem[] = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "support", label: "Support", icon: LifeBuoy },
]

const TAB_TO_NAV_ID: Record<string, string> = {
  overview: 'dashboard',
  integrations: 'integrations',
  evidence: 'evidence',
  reports: 'reports',
}

export function AppSidebar({
  active,
  activeTab,
  onSelect,
}: {
  active: string
  activeTab?: string
  onSelect: (id: string) => void
}) {
  const router = useRouter()
  const [integrationCount, setIntegrationCount] = useState(0)
  useEffect(() => {
    const repo = localStorage.getItem('github_repo')
    setIntegrationCount(repo ? 1 : 0)
  }, [])

  const currentNavId = activeTab ? (TAB_TO_NAV_ID[activeTab] ?? 'dashboard') : 'dashboard'

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">ZeroAudit</p>
          <p className="text-[11px] text-muted-foreground">SOC 2 Automation</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Platform
        </p>
        {navItems.map((item) => {
          const isActive = item.id === currentNavId
          const itemClassName = cn(
            "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
          )
          const iconClassName = cn(
            "size-4 shrink-0",
            isActive
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground",
          )

          const handleClick = () => {
            if (item.id === 'dashboard') {
              router.push('/?tab=overview')
              return
            }
            if (item.id === 'integrations') {
              router.push('/?tab=integrations')
              return
            }
            if (item.id === 'evidence') {
              router.push('/?tab=evidence')
              return
            }
            if (item.id === 'reports') {
              router.push('/?tab=reports')
              return
            }
            onSelect(item.id)
          }

          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={itemClassName}
            >
              <item.icon className={iconClassName} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'integrations' && integrationCount > 0 && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {integrationCount}
                </span>
              )}
              {item.id !== 'integrations' && item.badge && (
                <span className="rounded-full border border-border bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-border p-3">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => showToast(`${item.label} coming soon`, 'info')}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            <item.icon className="size-4" />
            {item.label}
          </button>
        ))}
        <div className="mt-2 rounded-lg border border-sidebar-border bg-card/50 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <p className="text-xs font-medium">Audit window open</p>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Type II observation period ends in 28 days.
          </p>
        </div>
      </div>
    </aside>
  )
}
