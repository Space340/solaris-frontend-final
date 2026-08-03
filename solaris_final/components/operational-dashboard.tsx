'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, Sigma, Timer, Waves } from 'lucide-react'
import { ControlPanel } from '@/components/control-panel'
import { GlassPanel, PanelLabel } from '@/components/glass'
import { InferenceHistory } from '@/components/inference-history'
import { MetricCards } from '@/components/metric-cards'
import type {
  ApiStatus,
  HistoryEntry,
  PredictionInputs,
  PredictionResult,
  ScenarioPreset,
} from '@/lib/solaris'
import {
  AUTOPLAY_INTERVAL_MS,
  COLD_START_THRESHOLD_MS,
  DEFAULT_INPUTS,
  HOUR_MAX,
  HOUR_MIN,
  clearHistoryRemote,
  cyclicalHour,
  fetchHistory,
  runPrediction,
  saveHistoryEntry,
  thermalLossFactor,
} from '@/lib/solaris'

const MAX_HISTORY = 25

export function OperationalDashboard({
  onStatusChange,
}: {
  onStatusChange: (status: ApiStatus, latencyMs: number | null) => void
}) {
  const [inputs, setInputs] = useState<PredictionInputs>(DEFAULT_INPUTS)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [autoPlay, setAutoPlay] = useState(false)

  // Mirrors the latest inputs so the auto-play loop reads fresh non-hour values
  // without re-subscribing its effect on every slider change.
  const inputsRef = useRef(inputs)
  inputsRef.current = inputs

  // Load previously saved history from the backend once, on mount, so the
  // log follows the user across reloads, browsers, and devices.
  const hasLoadedHistory = useRef(false)
  useEffect(() => {
    if (hasLoadedHistory.current) return
    hasLoadedHistory.current = true

    fetchHistory().then((entries) => {
      if (entries.length > 0) setHistory(entries.slice(0, MAX_HISTORY))
    })
  }, [])

  const execute = useCallback(
    async (target: PredictionInputs) => {
      setLoading(true)
      setError(null)
      onStatusChange('probing', null)

      // Render's free tier idles out; flag the cold start once we cross it.
      const coldStart = setTimeout(
        () => onStatusChange('waking', null),
        COLD_START_THRESHOLD_MS,
      )

      try {
        const { result: prediction, latencyMs: rtt } =
          await runPrediction(target)

        setResult(prediction)
        setHasRun(true)
        setLatencyMs(rtt)
        onStatusChange('connected', rtt)

        setHistory((prev) => {
          const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            inputs: target,
            result: prediction,
            latencyMs: rtt,
          }
          void saveHistoryEntry(entry)
          return [entry, ...prev].slice(0, MAX_HISTORY)
        })
        return true
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to reach the inference service.',
        )
        onStatusChange('error', null)
        return false
      } finally {
        clearTimeout(coldStart)
        setLoading(false)
      }
    },
    [onStatusChange],
  )

  // Auto-play steps hours 6→18 sequentially, waiting for each inference to
  // resolve so slow cold-start responses can't stack up behind the interval.
  useEffect(() => {
    if (!autoPlay) return
    let cancelled = false

    const play = async () => {
      for (let hour = HOUR_MIN; hour <= HOUR_MAX; hour += 1) {
        if (cancelled) return
        const target = { ...inputsRef.current, hour }
        setInputs(target)

        const ok = await execute(target)
        if (cancelled || !ok) break

        await new Promise((resolve) =>
          setTimeout(resolve, AUTOPLAY_INTERVAL_MS),
        )
      }
      if (!cancelled) setAutoPlay(false)
    }

    play()
    return () => {
      cancelled = true
    }
  }, [autoPlay, execute])

  const handleChange = useCallback(
    (key: keyof PredictionInputs, value: number) => {
      setInputs((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleReset = useCallback(() => setInputs(DEFAULT_INPUTS), [])

  const handlePreset = useCallback((preset: ScenarioPreset) => {
    // Presets without an explicit hour keep the current Hour of Day.
    setInputs((prev) => ({ ...prev, ...preset.values }))
  }, [])

  const handleRun = useCallback(() => {
    void execute(inputsRef.current)
  }, [execute])

  const handleToggleAutoPlay = useCallback(
    () => setAutoPlay((prev) => !prev),
    [],
  )

  const handleReplay = useCallback(
    (replayInputs: PredictionInputs) => {
      setInputs(replayInputs)
      void execute(replayInputs)
    },
    [execute],
  )

  const handleClearHistory = useCallback(() => {
    setHistory([])
    void clearHistoryRemote()
  }, [])

  const factor = thermalLossFactor(inputs.module_temp)
  const { sin, cos } = cyclicalHour(inputs.hour)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <ControlPanel
        inputs={inputs}
        onChange={handleChange}
        onReset={handleReset}
        onRun={handleRun}
        onPreset={handlePreset}
        onToggleAutoPlay={handleToggleAutoPlay}
        loading={loading}
        autoPlay={autoPlay}
      />

      <div className="flex flex-col gap-4">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/12 px-4 py-3"
          >
            <CircleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Inference request failed
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {error} Free Render instances cold-start after inactivity — try
                again in a few seconds.
              </p>
            </div>
          </div>
        ) : null}

        <MetricCards result={result} loading={loading} hasRun={hasRun} />

        {/* Latency + live simulation readout */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card/40 px-4 py-2.5">
          <span className="flex items-center gap-1.5">
            <Timer className="size-3.5 text-accent" aria-hidden="true" />
            <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
              Latency:
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {latencyMs != null ? `${latencyMs}ms` : '—'}
            </span>
          </span>

          <span className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
            Calls: <span className="text-foreground">{history.length}</span>
          </span>

          {autoPlay ? (
            <span className="ml-auto flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-accent">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              Day cycle · hour {inputs.hour} / {HOUR_MAX}
            </span>
          ) : null}
        </div>

        <InferenceHistory
          entries={history}
          onReplay={handleReplay}
          onClear={handleClearHistory}
          disabled={loading || autoPlay}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <GlassPanel className="p-5">
            <div className="flex items-center gap-2">
              <Sigma className="size-4 text-primary" aria-hidden="true" />
              <PanelLabel>Derived Physics Features</PanelLabel>
            </div>
            <dl className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-sm text-muted-foreground">
                  Thermal loss factor
                </dt>
                <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {factor.toFixed(4)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-sm text-muted-foreground">hour_sin</dt>
                <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {sin.toFixed(4)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-muted-foreground">hour_cos</dt>
                <dd className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {cos.toFixed(4)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Computed client-side from the current slider state to mirror the
              feature engineering applied server-side before inference.
            </p>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="flex items-center gap-2">
              <Waves className="size-4 text-accent" aria-hidden="true" />
              <PanelLabel>Request Payload</PanelLabel>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-background/50 p-4 font-mono text-xs leading-relaxed text-foreground/85">
              {JSON.stringify(inputs, null, 2)}
            </pre>
            <p className="mt-3 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
              POST /predict
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}
