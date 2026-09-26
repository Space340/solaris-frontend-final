export const PREDICT_ENDPOINT =
  'https://solar-ai-backend-e7ws.onrender.com/predict'

export type PredictionInputs = {
  irradiation: number
  ambient_temp: number
  module_temp: number
  hour: number
}

export const DEFAULT_INPUTS: PredictionInputs = {
  irradiation: 0.85,
  ambient_temp: 32.0,
  module_temp: 50.0,
  hour: 13,
}

export type PredictionResult = {
  ac_power: number | null
  thermal_loss: number | null
  ramp_alert: boolean
}

/**
 * Quick-action scenarios. `hour` is optional: presets that don't pin a time of
 * day (e.g. Extreme Heat) leave the current Hour of Day slider untouched.
 */
export type ScenarioPreset = {
  id: string
  label: string
  description: string
  values: Partial<PredictionInputs>
}

export const PRESETS: ScenarioPreset[] = [
  {
    id: 'peak-noon',
    label: 'Peak Noon',
    description: 'Clear-sky maximum yield at solar noon',
    values: { irradiation: 1.0, ambient_temp: 25, module_temp: 45, hour: 12 },
  },
  {
    id: 'extreme-heat',
    label: 'Extreme Heat',
    description: 'High irradiance with severe thermal derate',
    values: { irradiation: 1.1, ambient_temp: 42, module_temp: 68 },
  },
  {
    id: 'cloud-ramp',
    label: 'Cloud Ramp',
    description: 'Transient cloud cover — trips the ramp classifier',
    values: { irradiation: 0.85, ambient_temp: 32, module_temp: 50, hour: 13 },
  },
  {
    id: 'dusk',
    label: 'Dusk',
    description: 'End-of-day low-angle irradiance',
    values: { irradiation: 0.1, ambient_temp: 18, module_temp: 20, hour: 18 },
  },
]

/** Connection lifecycle for the Render-hosted inference service. */
export type ApiStatus = 'standby' | 'probing' | 'waking' | 'connected' | 'error'

export type HistoryEntry = {
  id: string
  timestamp: number
  inputs: PredictionInputs
  result: PredictionResult
  latencyMs: number
}

export const AUTOPLAY_INTERVAL_MS = 1500
export const HOUR_MIN = 6
export const HOUR_MAX = 18
/** Render free tier cold-starts; past this we surface "Waking up…". */
export const COLD_START_THRESHOLD_MS = 2500

const LOCAL_STORAGE_KEY = 'solaris_history'

/** Pulls the first present numeric field so the UI tolerates backend key drift. */
function pickNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function pickBoolean(source: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'yes', 'alert'].includes(normalized)) return true
      if (['false', '0', 'no', 'stable'].includes(normalized)) return false
    }
  }
  return false
}

export function normalizePrediction(raw: unknown): PredictionResult {
  const source = (
    raw && typeof raw === 'object' ? raw : {}
  ) as Record<string, unknown>

  return {
    ac_power: pickNumber(source, [
      'predicted_power_kw',
      'ac_power',
      'predicted_ac_power',
      'ac_power_kw',
      'prediction',
      'yield',
    ]),
    thermal_loss: pickNumber(source, [
      'thermal_loss',
      'thermal_loss_percent',
      'thermal_loss_pct',
      'loss',
    ]),
    ramp_alert: pickBoolean(source, [
      'ramp_alert',
      'rampAlert',
      'ramp_event',
      'is_ramp',
      'alert',
    ]),
  }
}

export async function runPrediction(
  inputs: PredictionInputs,
): Promise<{ result: PredictionResult; latencyMs: number }> {
  const startedAt = performance.now()

  const response = await fetch(PREDICT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      irradiation: inputs.irradiation,
      ambient_temp: inputs.ambient_temp,
      module_temp: inputs.module_temp,
      hour: inputs.hour,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Inference request failed (${response.status} ${response.statusText})`,
    )
  }

  const payload = await response.json()
  const latencyMs = Math.round(performance.now() - startedAt)

  return { result: normalizePrediction(payload), latencyMs }
}

/** Physics reference: thermal derate relative to the 25 °C STC baseline. */
export function thermalLossFactor(moduleTemp: number) {
  return 1 - 0.004 * (moduleTemp - 25)
}

export function cyclicalHour(hour: number) {
  return {
    sin: Math.sin((2 * Math.PI * hour) / 24),
    cos: Math.cos((2 * Math.PI * hour) / 24),
  }
}

/**
 * Loads saved inference history from browser localStorage so history stays
 * intact even after closing and reopening the browser window.
 */
export async function fetchHistory(): Promise<HistoryEntry[]> {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to read history from localStorage:', err)
    return []
  }
}

/**
 * Persists one inference entry into browser localStorage.
 */
export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const existing = await fetchHistory()
    const updated = [entry, ...existing].slice(0, 25)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to save history entry to localStorage:', err)
  }
}

/** Clears saved history entries from browser localStorage. */
export async function clearHistoryRemote(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear history from localStorage:', err)
  }
}
