"use client"

import { useState, useRef, useEffect } from "react"
import {
  Check,
  ChevronsUpDown,
  CircleCheck,
  Search,
  Bell,
  LogOut,
  User,
  CreditCard,
  Settings,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { organizations } from "@/lib/dashboard-data"
import { showToast } from "@/components/ui/toast"

interface TopBarProps {
  orgName?: string
  searchQuery?: string
  onSearchChange?: (q: string) => void
  onSearchClose?: () => void
}

export function TopBar({ orgName, searchQuery = '', onSearchChange, onSearchClose }: TopBarProps) {
  const [org, setOrg] = useState(organizations[0])
  const [orgOpen, setOrgOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const orgRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) {
        setOrgOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [])

  const displayName = orgName ?? org.name
  const displayInitials = orgName
    ? orgName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : org.initials

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Organization switcher */}
      <div className="relative" ref={orgRef}>
        <button
          type="button"
          onClick={() => setOrgOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent focus:outline-none"
        >
          <Avatar className="size-6 rounded-md">
            <AvatarFallback className="rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
              {displayInitials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{displayName}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </button>
        {orgOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-popover shadow-md">
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Organizations</p>
            {organizations.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { setOrg(o); setOrgOpen(false) }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Avatar className="size-6 rounded-md">
                  <AvatarFallback className="rounded-md bg-muted text-[11px] font-semibold">
                    {o.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left leading-tight">
                  <p className="text-sm">{o.name}</p>
                  <p className="text-[11px] text-muted-foreground">{o.plan}</p>
                </div>
                {o.id === org.id && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sync status badge */}
      <div className="hidden items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 lg:flex">
        <CircleCheck className="size-4 text-success" />
        <span className="text-xs font-medium text-success">
          All controls monitored
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search controls, evidence…"
            value={searchQuery}
            onChange={e => onSearchChange?.(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onSearchClose?.() }}
            className="h-9 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="relative size-9 bg-card"
          aria-label="Notifications"
          onClick={() => showToast('No new notifications', 'info')}
        >
          <Bell className="size-4" />
        </Button>

        {/* User profile */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md p-0.5 pr-1 transition-colors hover:bg-accent focus:outline-none"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                JD
              </AvatarFallback>
            </Avatar>
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-popover shadow-md">
              <div className="px-2 py-1.5 leading-tight">
                <p className="text-sm font-medium">Jordan Diaz</p>
                <p className="text-[11px] font-normal text-muted-foreground">
                  jordan@acme-security.io
                </p>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => { setUserOpen(false); showToast('Profile settings coming soon', 'info') }}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-accent"
              >
                <User className="size-4" /> Profile
              </button>
              <button
                type="button"
                onClick={() => { setUserOpen(false); showToast('Billing portal coming soon', 'info') }}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-accent"
              >
                <CreditCard className="size-4" /> Billing
              </button>
              <button
                type="button"
                onClick={() => { setUserOpen(false); showToast('Settings coming soon', 'info') }}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Settings className="size-4" /> Settings
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('zeroaudit_org_id')
                  localStorage.removeItem('zeroaudit_org_name')
                  window.location.href = '/onboarding'
                }}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
