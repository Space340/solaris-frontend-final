import type * as React from 'react'
import { cn } from '@/lib/utils'

export function GlassPanel({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('glass relative overflow-hidden rounded-2xl', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function PanelLabel({
  className,
  children,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  )
}

export function GridBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, oklch(0.97 0.005 250 / 0.07) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.97 0.005 250 / 0.07) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div className="absolute -top-40 left-1/4 h-[32rem] w-[32rem] rounded-full bg-primary/12 blur-[140px]" />
      <div className="absolute -bottom-52 right-0 h-[34rem] w-[34rem] rounded-full bg-accent/10 blur-[150px]" />
    </div>
  )
}
