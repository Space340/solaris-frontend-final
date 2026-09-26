import { Atom, Binary, ScrollText, Target, TrendingUp } from 'lucide-react'
import { GlassPanel, PanelLabel } from '@/components/glass'

const REGRESSION_METRICS = [
  {
    label: 'R² Score',
    value: '0.978',
    hint: 'Variance explained on hold-out set',
    bar: 97.8,
  },
  {
    label: 'RMSE',
    value: '28.4 kW',
    hint: 'Root mean squared error',
    bar: 72,
  },
  { label: 'MAE', value: '19.2 kW', hint: 'Mean absolute error', bar: 81 },
]

const CLASSIFIER_ROWS = [
  { metric: 'Precision', value: '0.94' },
  { metric: 'Recall', value: '0.95' },
  { metric: 'F1-Score', value: '0.95' },
]

export function ModelAnalytics() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Regressor */}
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <PanelLabel>Model 01 · Regression</PanelLabel>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                XGBRegressor
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AC Power Yield Forecast
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/12 text-primary">
              <TrendingUp className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {REGRESSION_METRICS.map(({ label, value, hint, bar }) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-foreground/90">
                    {label}
                  </span>
                  <span className="font-mono text-xl font-bold tabular-nums text-primary">
                    {value}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${bar}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Classifier */}
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <PanelLabel>Model 02 · Classification</PanelLabel>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                XGBClassifier
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Grid Ramp Detection Report
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent/12 text-accent">
              <Target className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Classification report for the grid ramp event detector
              </caption>
              <thead>
                <tr className="bg-secondary/60">
                  <th
                    scope="col"
                    className="px-4 py-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Metric
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {CLASSIFIER_ROWS.map(({ metric, value }) => (
                  <tr key={metric} className="border-t border-border">
                    <th
                      scope="row"
                      className="px-4 py-3 text-sm font-medium text-foreground/90"
                    >
                      {metric}
                    </th>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-accent">
                      {value}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-accent/8">
                  <th
                    scope="row"
                    className="px-4 py-3 text-sm font-semibold text-foreground"
                  >
                    Overall Accuracy
                  </th>
                  <td className="px-4 py-3 text-right font-mono text-base font-bold tabular-nums text-accent">
                    96.5%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Scores reported for the positive (ramp event) class on a
            stratified hold-out split. High recall is prioritised so genuine
            ramp events are not missed by grid operators.
          </p>
        </GlassPanel>
      </div>

      {/* Physics feature impact */}
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <PanelLabel>Feature Engineering</PanelLabel>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
              Physics Feature Impact
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Domain priors injected into the feature space before boosting.
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/12 text-primary">
            <Atom className="size-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <ScrollText
                className="size-4 text-primary"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold">Thermal Loss Factor</h3>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-primary/20 bg-primary/8 px-4 py-3 font-mono text-sm text-primary">
              {'factor = 1 - 0.004 * (T_module - 25)'}
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Photovoltaic cells lose roughly 0.4% of rated output per degree
              Celsius above the 25 °C standard test condition baseline. Encoding
              this derate explicitly means the model does not have to rediscover
              the relationship from data, which sharply improves accuracy during
              hot midday periods when module temperature diverges from ambient.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Binary className="size-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold">
                Cyclical Hour Encoding
              </h3>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-accent/20 bg-accent/8 px-4 py-3 font-mono text-sm text-accent">
              {'hour_sin = sin(2π * Hour / 24)\nhour_cos = cos(2π * Hour / 24)'}
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Treating the hour as a plain integer implies hour 23 and hour 0
              are 23 units apart when they are in fact adjacent. Projecting the
              hour onto a unit circle with a sine and cosine pair preserves that
              wrap-around continuity, so the model learns a smooth diurnal
              generation curve instead of an artificial midnight discontinuity.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              Governance note ·{' '}
            </span>
            Both estimators are trained on the same engineered feature matrix
            (irradiation, ambient temperature, module temperature, thermal loss
            factor, and cyclical hour terms), which keeps the yield forecast and
            the ramp classification mutually consistent and makes every
            prediction traceable back to interpretable physical quantities.
          </p>
        </div>
      </GlassPanel>
    </div>
  )
}
