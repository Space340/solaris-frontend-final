'use client'

import type { ApiStatus } from '@/lib/solaris'

const STATUS_MAP: Record<
  ApiStatus,
  { label: string; classes: string; dot: string; pulse: boolean }
> = {
  standby: {
    label: 'Standby',
    classes: 'border-border bg-secondary/50 text-muted-foreground',
    dot: 'bg-muted-foreground',
    pulse: false,
  },
  probing: {
    label: 'Connecting…',
    classes: 'border-accent/30 bg-accent/10 text-accent',
    dot: 'bg-accent',
    pulse: true,
  },
  waking: {
    label: 'Waking up…',
    classes: 'border-primary/35 bg-primary/12 text-primary',
    dot: 'bg-primary',
    pulse: true,
  },
  connected: {
    label: 'Connected',
    classes: 'border-success/25 bg-success/10 text-success',
    dot: 'bg-success',
    pulse: true,
  },
  error: {
    label: 'Unreachable',
    classes: 'border-destructive/40 bg-destructive/12 text-destructive',
    dot: 'bg-destructive',
    pulse: false,
  },
}

export function StatusDot({
  status,
  className,
}: {
  status: ApiStatus
  className?: string
}) {
  const { dot, pulse } = STATUS_MAP[status]
  return (
    <span className={`relative flex size-2 ${className ?? ''}`}>
      {pulse ? (
        <span
          className={`absolute inline-flex size-full animate-ping rounded-full opacity-70 ${dot}`}
        />
      ) : null}
      <span className={`relative inline-flex size-2 rounded-full ${dot}`} />
    </span>
  )
}

export function ApiStatusBadge({
  status,
  latencyMs,
}: {
  status: ApiStatus
  latencyMs: number | null
}) {
  const { label, classes } = STATUS_MAP[status]

  return (
    <div
      aria-live="polite"
      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${classes}`}
    >
      <StatusDot status={status} />
      <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-wider">
        {label}
      </span>
      {latencyMs != null && status === 'connected' ? (
        <span className="border-l border-current/25 pl-2 font-mono text-[0.6875rem] tabular-nums opacity-80">
          {latencyMs}ms
        </span>
      ) : null}
    </div>
  )
}
