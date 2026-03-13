import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, LabelList, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, Gauge, PlaneTakeoff, ShieldAlert } from 'lucide-react';
import { PERIOD_LABELS } from '../lib/config';
import { calculateSnapshot } from '../lib/kpi';
import type { DailyRecord, FleetSnapshot, FleetTarget, PeriodKey, ScoringWeights } from '../lib/types';

type FleetCardProps = {
  title: string;
  subtitle: string;
  snapshot: FleetSnapshot;
  target: FleetTarget;
  reportDate: string;
  weights: ScoringWeights;
  records: DailyRecord[];
};

const periodOrder: PeriodKey[] = ['priorDay', 'rolling7', 'priorMonth', 'ytd'];

function formatPeriodLabel(label: string) {
  if (label === 'Rolling 7') return 'Rolling 7 Days';
  if (label === 'Prior Month') return 'Prior Month';
  return label;
}

function statusMeta(status: FleetSnapshot['status']) {
  if (status === 'good') return { label: 'On target', icon: CheckCircle2, tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20' };
  if (status === 'watch') return { label: 'Watchlist', icon: AlertTriangle, tone: 'text-amber-200 bg-amber-500/10 border-amber-400/20' };
  return { label: 'Action needed', icon: ShieldAlert, tone: 'text-rose-200 bg-rose-500/10 border-rose-400/20' };
}

function metricTone(status: FleetSnapshot['status']) {
  if (status === 'good') return 'from-emerald-500/20 to-cyan-500/10';
  if (status === 'watch') return 'from-amber-500/20 to-orange-500/10';
  return 'from-rose-500/20 to-red-500/10';
}

export function FleetCard({ title, subtitle, snapshot, target, reportDate, weights, records }: FleetCardProps) {
  const comparisons = periodOrder.map((period) => ({
    period,
    label: formatPeriodLabel(PERIOD_LABELS[period]),
    snapshot: calculateSnapshot(records, snapshot.fleet, period, reportDate, target, weights)
  }));

  const chartData = comparisons.map((item) => ({
    name: item.label,
    EM15: Number(item.snapshot.em15.toFixed(1)),
    score: item.snapshot.score,
    delayAvg: Number(item.snapshot.delayAvg.toFixed(1)),
    canx: Number(item.snapshot.cancelAvg.toFixed(2)),
    mel: Number(item.snapshot.melPerFlight.toFixed(2))
  }));

  const meta = statusMeta(snapshot.status);
  const StatusIcon = meta.icon;

  const rows = [
    { label: 'Delay Avg', key: 'delayAvg' as const, format: (value: number) => `${value.toFixed(1)} min` },
    { label: 'Canx %', key: 'cancelAvg' as const, format: (value: number) => `${value.toFixed(2)}%` },
    { label: 'MEL / Flight', key: 'melPerFlight' as const, format: (value: number) => value.toFixed(2) },
    { label: 'Flights', key: 'totalFlights' as const, format: (value: number) => value.toFixed(0) }
  ];

  return (
    <section className="premium-fleet-card">
      <div className="premium-fleet-card__top">
        <div>
          <div className="premium-fleet-card__eyebrow">{subtitle}</div>
          <h3 className="premium-fleet-card__title">{title}</h3>
        </div>
        <div className={`premium-badge ${meta.tone}`}>
          <StatusIcon className="h-4 w-4" />
          {meta.label}
        </div>
      </div>

      <div className="premium-score-row">
        <div className={`premium-score-panel bg-gradient-to-br ${metricTone(snapshot.status)}`}>
          <div className="premium-score-panel__label"><Gauge className="h-4 w-4" /> Health score</div>
          <div className="premium-score-panel__value">{snapshot.score}<span>/100</span></div>
          <div className="premium-score-panel__sub">Composite score from EM15, delay average, cancellations, and MEL impact.</div>
        </div>
        <div className="premium-mini-grid">
          <div className="premium-mini-stat">
            <span>EM15</span>
            <strong>{snapshot.em15.toFixed(1)}%</strong>
            <small>Target {target.em15Target}%</small>
          </div>
          <div className="premium-mini-stat">
            <span>Delay Avg</span>
            <strong>{snapshot.delayAvg.toFixed(1)} min</strong>
            <small>Target ≤ {target.delayAvgTarget}</small>
          </div>
          <div className="premium-mini-stat">
            <span>Canx %</span>
            <strong>{snapshot.cancelAvg.toFixed(2)}%</strong>
            <small>Target ≤ {target.cancelAvgTarget}%</small>
          </div>
          <div className="premium-mini-stat">
            <span>Flights</span>
            <strong>{snapshot.totalFlights}</strong>
            <small><PlaneTakeoff className="mr-1 inline h-3.5 w-3.5" /> selected period</small>
          </div>
        </div>
      </div>

      <div className="premium-chart-card">
        <div className="premium-section-title">EM15 period comparison</div>
        <div className="premium-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 18, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} height={38} />
              <YAxis domain={[90, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: '#07111f', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 16, color: '#e5eefc' }}
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'EM15') return [`${value.toFixed(1)}%`, 'EM15'];
                  return [value, name];
                }}
                labelFormatter={(_, payload: any[]) => {
                  const item = payload?.[0]?.payload;
                  if (!item) return '';
                  return `${item.name} • Score ${item.score}`;
                }}
              />
              <ReferenceLine y={target.em15Target} stroke="#f8fafc" strokeDasharray="6 6" opacity={0.55} />
              <Bar dataKey="EM15" fill="#26c281" radius={[14, 14, 0, 0]} maxBarSize={54}>
                <LabelList dataKey="EM15" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} fill="#cbd5e1" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="premium-table-shell">
        <div className="premium-section-title">Period metric matrix</div>
        <div className="premium-period-table">
          <div className="premium-period-table__header premium-period-table__row">
            <div>Metric</div>
            {comparisons.map((item) => (
              <div key={item.period}>{item.label}</div>
            ))}
          </div>
          {rows.map((row) => (
            <div key={row.label} className="premium-period-table__row">
              <div className="premium-period-table__metric">{row.label}</div>
              {comparisons.map((item) => (
                <div key={`${row.label}-${item.period}`}>{row.format(Number(item.snapshot[row.key]))}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
