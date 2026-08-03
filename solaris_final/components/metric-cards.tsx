'use client'

import {
  Activity,
  AlertTriangle,
  Gauge,
  ShieldCheck,
  ThermometerSun,
} from 'lucide-react'
import { GlassPanel, PanelLabel } from '@/components/glass'
import type { PredictionResult } from '@/lib/solaris'

function BigValue({
  value,
  suffix,
  loading,
  tone = 'primary',
}: {
  value: string
  suffix: string
  loading: boolean
  tone?: 'primary' | 'accent'
}) {
  if (loading) {
    return (
      <div className="mt-3 h-12 w-36 animate-pulse rounded-lg bg-secondary/70" />
    )
  }
  const isPlaceholder = value === '—' || value === 'n/a'
  return (
    <p className="mt-2 flex items-baseline gap-1.5 font-mono text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
      <span
        className={
          isPlaceholder
            ? 'text-muted-foreground/50'
            : tone === 'accent'
              ? 'text-accent'
              : 'text-primary'
        }
      >
        {value}
      </span>
      <span className="text-base font-medium text-muted-foreground">
        {suffix}
      </span>
    </p>
  )
}

export function MetricCards({
  result,
  loading,
  hasRun,
}: {
  result: PredictionResult | null
  loading: boolean
  hasRun: boolean
}) {
  const acPower =
    result?.ac_power != null
      ? result.ac_power.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : hasRun
        ? 'n/a'
        : '—'
  const thermalLoss =
    result?.thermal_loss != null
      ? `-${Math.abs(result.thermal_loss).toFixed(2)}`
      : hasRun
        ? 'n/a'
        : '—'
  const rampAlert = result?.ramp_alert === true

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {/* AC Power */}
      <GlassPanel className="p-5">
        <div className="flex items-start justify-between gap-3">
          <PanelLabel>AC Power</PanelLabel>
          <span className="grid size-9 place-items-center rounded-lg border border-primary/25 bg-primary/12 text-primary">
            <Gauge className="size-4" aria-hidden="true" />
          </span>
        </div>
        <BigValue value={acPower} suffix="kW" loading={loading} />
        <p className="mt-2 text-xs text-muted-foreground">
          XGBoost Regressor Forecast
        </p>
      </GlassPanel>

      {/* Thermal loss */}
      <GlassPanel className="p-5">
        <div className="flex items-start justify-between gap-3">
          <PanelLabel>Thermal Loss</PanelLabel>
          <span className="grid size-9 place-items-center rounded-lg border border-accent/25 bg-accent/12 text-accent">
            <ThermometerSun className="size-4" aria-hidden="true" />
          </span>
        </div>
        <BigValue
          value={thermalLoss}
          suffix="%"
          loading={loading}
          tone="accent"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Heat Degradation Factor
        </p>
      </GlassPanel>

      {/* Grid ramp status */}
      <GlassPanel
        className={
          rampAlert
            ? 'border-destructive/50 bg-destructive/12 p-5 shadow-[0_0_50px_-12px] shadow-destructive/40 sm:col-span-2 xl:col-span-1'
            : 'p-5 sm:col-span-2 xl:col-span-1'
        }
      >
        <div className="flex items-start justify-between gap-3">
          <PanelLabel
            className={rampAlert ? 'text-destructive-foreground/80' : undefined}
          >
            Grid Ramp Status
          </PanelLabel>
          <span
            className={
              rampAlert
                ? 'grid size-9 place-items-center rounded-lg border border-destructive/40 bg-destructive/25 text-destructive-foreground'
                : 'grid size-9 place-items-center rounded-lg border border-success/25 bg-success/12 text-success'
            }
          >
            {rampAlert ? (
              <AlertTriangle className="size-4" aria-hidden="true" />
            ) : (
              <ShieldCheck className="size-4" aria-hidden="true" />
            )}
          </span>
        </div>

        {loading ? (
          <div className="mt-3 h-12 w-48 animate-pulse rounded-lg bg-secondary/70" />
        ) : rampAlert ? (
          <div
            role="alert"
            className="mt-3 flex animate-pulse items-center gap-2.5 rounded-xl border border-destructive/50 bg-destructive/25 px-3.5 py-3"
          >
            <AlertTriangle
              className="size-5 shrink-0 text-destructive-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-bold uppercase tracking-wide text-destructive-foreground">
              Ramp Alert Detected
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/12 px-3.5 py-3">
            <Activity
              className="size-5 shrink-0 text-success"
              aria-hidden="true"
            />
            <p className="text-sm font-bold uppercase tracking-wide text-success">
              Stable Grid
            </p>
          </div>
        )}

        <p
          className={
            rampAlert
              ? 'mt-2 text-xs text-destructive-foreground/75'
              : 'mt-2 text-xs text-muted-foreground'
          }
        >
          {rampAlert
            ? 'Sudden output swing forecast — dispatch reserve capacity.'
            : 'XGBoost Classifier — no ramp event forecast.'}
        </p>
      </GlassPanel>
    </div>
  )
}
