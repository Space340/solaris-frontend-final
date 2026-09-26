'use client'

import {
  CloudSun,
  Clock3,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GlassPanel, PanelLabel } from '@/components/glass'
import type { PredictionInputs, ScenarioPreset } from '@/lib/solaris'
import { DEFAULT_INPUTS, PRESETS } from '@/lib/solaris'

type SliderConfig = {
  key: keyof PredictionInputs
  label: string
  icon: LucideIcon
  min: number
  max: number
  step: number
  unit: string
  decimals: number
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'irradiation',
    label: 'Solar Irradiation',
    icon: Sun,
    min: 0,
    max: 1.2,
    step: 0.01,
    unit: 'kW/m²',
    decimals: 2,
  },
  {
    key: 'ambient_temp',
    label: 'Ambient Temp',
    icon: CloudSun,
    min: 10,
    max: 45,
    step: 0.1,
    unit: '°C',
    decimals: 1,
  },
  {
    key: 'module_temp',
    label: 'Module Temp',
    icon: Thermometer,
    min: 10,
    max: 70,
    step: 0.1,
    unit: '°C',
    decimals: 1,
  },
  {
    key: 'hour',
    label: 'Hour of Day',
    icon: Clock3,
    min: 6,
    max: 18,
    step: 1,
    unit: 'h',
    decimals: 0,
  },
]

type ControlPanelProps = {
  inputs: PredictionInputs
  onChange: (key: keyof PredictionInputs, value: number) => void
  onReset: () => void
  onRun: () => void
  onPreset: (preset: ScenarioPreset) => void
  onToggleAutoPlay: () => void
  loading: boolean
  autoPlay: boolean
}

export function ControlPanel({
  inputs,
  onChange,
  onReset,
  onRun,
  onPreset,
  onToggleAutoPlay,
  loading,
  autoPlay,
}: ControlPanelProps) {
  const isDirty = SLIDERS.some(
    ({ key }) => inputs[key] !== DEFAULT_INPUTS[key],
  )
  // Sliders stay locked while the day cycle drives them programmatically.
  const locked = loading || autoPlay

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <PanelLabel>Sensor Inputs</PanelLabel>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
            Control Panel
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty || locked}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* Quick-action scenarios */}
      <div className="mt-5">
        <PanelLabel className="text-[0.625rem]">Preset Scenarios</PanelLabel>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPreset(preset)}
              disabled={locked}
              title={preset.description}
              className="rounded-lg border border-border bg-secondary/40 px-2.5 py-2 text-xs font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/12 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {SLIDERS.map(
          ({ key, label, icon: Icon, min, max, step, unit, decimals }) => {
            const value = inputs[key]
            const pct = ((value - min) / (max - min)) * 100
            return (
              <div key={key} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`slider-${key}`}
                    className="flex items-center gap-2 text-sm font-medium text-foreground/90"
                  >
                    <Icon
                      className="size-4 text-primary"
                      aria-hidden="true"
                    />
                    {label}
                  </label>
                  <span className="rounded-md border border-border bg-secondary/60 px-2 py-0.5 font-mono text-xs tabular-nums text-foreground">
                    {value.toFixed(decimals)}
                    <span className="ml-1 text-muted-foreground">{unit}</span>
                  </span>
                </div>

                <input
                  id={`slider-${key}`}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  disabled={locked}
                  onChange={(event) =>
                    onChange(key, Number(event.target.value))
                  }
                  className="telemetry-slider disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, oklch(0.97 0.005 250 / 0.14) ${pct}%, oklch(0.97 0.005 250 / 0.14) 100%)`,
                  }}
                  aria-valuetext={`${value.toFixed(decimals)} ${unit}`}
                />

                <div className="flex justify-between font-mono text-[0.625rem] text-muted-foreground">
                  <span>{min.toFixed(decimals)}</span>
                  <span>{max.toFixed(decimals)}</span>
                </div>

                {key === 'hour' ? (
                  <button
                    type="button"
                    onClick={onToggleAutoPlay}
                    aria-pressed={autoPlay}
                    className={`mt-1 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      autoPlay
                        ? 'border-accent/45 bg-accent/18 text-accent'
                        : 'border-border bg-secondary/40 text-foreground/85 hover:border-accent/40 hover:bg-accent/12 hover:text-accent'
                    }`}
                  >
                    {autoPlay ? (
                      <>
                        <Pause className="size-3.5" aria-hidden="true" />
                        Stop Day Cycle
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5" aria-hidden="true" />
                        Auto-Play Day Cycle
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            )
          },
        )}
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={locked}
        className="group relative mt-7 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-80"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Running inference…
          </>
        ) : (
          <>
            <Zap className="size-4" aria-hidden="true" />
            Run Physics-Informed Prediction
          </>
        )}
        {loading ? (
          <span
            aria-hidden="true"
            className="animate-scan absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent"
          />
        ) : null}
      </button>

      <p className="mt-3 text-center font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
        XGBoost Regressor + Classifier ensemble
      </p>
    </GlassPanel>
  )
}
