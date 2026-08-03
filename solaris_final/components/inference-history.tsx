'use client'

import { useState } from 'react'
import {
  ChevronDown,
  History,
  RotateCw,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { GlassPanel, PanelLabel } from '@/components/glass'
import type { HistoryEntry, PredictionInputs } from '@/lib/solaris'

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function InferenceHistory({
  entries,
  onReplay,
  onClear,
  disabled,
}: {
  entries: HistoryEntry[]
  onReplay: (inputs: PredictionInputs) => void
  onClear: () => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <GlassPanel>
      <div className="flex items-center gap-2 p-4 sm:px-5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="inference-history-body"
          className="-m-1 flex flex-1 items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <History className="size-4 text-accent" aria-hidden="true" />
          <PanelLabel className="text-foreground/90">
            Inference History
          </PanelLabel>
          <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[0.625rem] tabular-nums text-muted-foreground">
            {entries.length}
          </span>
          <ChevronDown
            className={`ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {entries.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Clear</span>
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id="inference-history-body"
          className="border-t border-border px-4 pb-4 pt-1 sm:px-5"
        >
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No inference calls recorded yet. Run a prediction to start logging.
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto pt-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </span>
                      {entry.result.ramp_alert ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-destructive">
                          <TriangleAlert
                            className="size-3"
                            aria-hidden="true"
                          />
                          Ramp
                        </span>
                      ) : (
                        <span className="rounded-full border border-success/25 bg-success/10 px-2 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-success">
                          Stable
                        </span>
                      )}
                      <span className="font-mono text-[0.625rem] tabular-nums text-muted-foreground">
                        {entry.latencyMs}ms
                      </span>
                    </div>

                    <p className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-primary">
                      {entry.result.ac_power != null
                        ? `${entry.result.ac_power.toLocaleString('en-US', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })} kW`
                        : 'n/a'}
                    </p>

                    <p className="mt-1 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground">
                      {entry.inputs.irradiation.toFixed(2)} kW/m² ·{' '}
                      {entry.inputs.ambient_temp.toFixed(1)}°C amb ·{' '}
                      {entry.inputs.module_temp.toFixed(1)}°C mod · {'h'}
                      {entry.inputs.hour}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onReplay(entry.inputs)}
                    disabled={disabled}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-primary/30 bg-primary/12 px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40 sm:self-auto"
                  >
                    <RotateCw className="size-3.5" aria-hidden="true" />
                    Replay
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </GlassPanel>
  )
}
