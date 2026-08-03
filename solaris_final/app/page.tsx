'use client'

import { useCallback, useState } from 'react'
import { BarChart3, LayoutDashboard, SunMedium } from 'lucide-react'
import { ApiStatusBadge } from '@/components/api-status'
import { GridBackdrop } from '@/components/glass'
import { ModelAnalytics } from '@/components/model-analytics'
import { OperationalDashboard } from '@/components/operational-dashboard'
import type { ApiStatus } from '@/lib/solaris'

const TABS = [
  { id: 'dashboard', label: 'Operational Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Model Analytics & Governance', icon: BarChart3 },
] as const

type TabId = (typeof TABS)[number]['id']

export default function Page() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [status, setStatus] = useState<ApiStatus>('standby')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  const handleStatusChange = useCallback(
    (next: ApiStatus, nextLatency: number | null) => {
      setStatus(next)
      if (nextLatency != null) setLatencyMs(nextLatency)
    },
    [],
  )

  return (
    <>
      <GridBackdrop />

      <div className="mx-auto flex min-h-svh w-full max-w-[100rem] flex-col px-4 py-4 sm:px-6 sm:py-6">
        {/* Header bar */}
        <header className="glass flex flex-col gap-4 rounded-2xl p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25">
              <SunMedium className="size-6" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  SOLARIS
                </h1>
                <span className="rounded-full border border-primary/30 bg-primary/12 px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-primary">
                  SDG 7 Engine
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">
                A Physics-Informed Machine Learning Pipeline for Solar Power
                Yield Forecasting and Grid Ramp Event Detection (SDG 7)
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-wider text-success">
                Backend: Live on Render
              </span>
            </div>
            <ApiStatusBadge status={status} latencyMs={latencyMs} />
          </div>
        </header>

        {/* Top navigation */}
        <nav
          aria-label="Primary"
          className="glass mt-4 flex gap-1.5 overflow-x-auto rounded-2xl p-1.5"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Tab panels */}
        {/* Both panels stay mounted so slider state and the inference history
            log survive tab switches. */}
        <main className="mt-4 flex-1">
          <div hidden={tab !== 'dashboard'}>
            <OperationalDashboard onStatusChange={handleStatusChange} />
          </div>
          <div hidden={tab !== 'analytics'}>
            <ModelAnalytics />
          </div>
        </main>

        <footer className="mt-6 border-t border-border pt-4">
          <p className="text-center font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground">
            SOLARIS · Affordable & Clean Energy · XGBoost Inference via Render
          </p>
        </footer>
      </div>
    </>
  )
}
