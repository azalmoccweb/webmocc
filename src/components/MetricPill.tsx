import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { MetricResult } from '../lib/types';

function metricColor(status: MetricResult['status']) {
  if (status === 'good') return 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10';
  if (status === 'watch') return 'text-amber-200 border-amber-400/20 bg-amber-400/10';
  return 'text-rose-200 border-rose-400/20 bg-rose-400/10';
}

export function MetricPill({ metric }: { metric: MetricResult }) {
  const Icon = metric.direction === 'higher' ? ArrowUp : ArrowDown;
  const DisplayIcon = metric.score === 100 ? Icon : metric.score === 0 ? ArrowDown : Minus;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${metricColor(metric.status)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] opacity-75">{metric.label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{metric.display}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 p-2 text-current">
          <DisplayIcon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-xs opacity-80">
        Target {metric.direction === 'higher' ? '≥' : '≤'} {metric.label === 'EM15' || metric.label === 'Canx %' ? `${metric.target}%` : metric.target}
      </div>
    </div>
  );
}
