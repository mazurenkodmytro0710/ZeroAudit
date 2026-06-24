'use client'

import { Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { recentActivity } from "@/lib/dashboard-data"
import { showToast } from "@/components/ui/toast"

export function ActivityFeed() {
  return (
    <Card className="flex h-full flex-col gap-0 p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold tracking-tight">
              Recent Activity
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Live AI agent actions
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-success">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>

      <ol className="divide-y divide-border">
        {recentActivity.map((a) => (
          <li
            key={a.id}
            className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40"
          >
            <div
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                a.iconClass,
              )}
            >
              <a.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-pretty">{a.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.meta}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {a.time}
                </span>
                {a.tag && (
                  <span className="rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground">
                    {a.tag}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-auto border-t border-border px-5 py-3">
        <button
          onClick={() => showToast('Full activity log coming soon', 'info')}
          className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View full activity log
        </button>
      </div>
    </Card>
  )
}
