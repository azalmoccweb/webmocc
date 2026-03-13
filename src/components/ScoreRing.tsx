import type { CSSProperties } from 'react';

type ScoreRingProps = {
  score: number;
  status: 'good' | 'watch' | 'bad';
  label?: string;
  size?: number;
};

const colors = {
  good: '#22c55e',
  watch: '#f59e0b',
  bad: '#ef4444'
};

export function ScoreRing({ score, status, label = 'Health score', size = 124 }: ScoreRingProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="ring-score relative grid place-items-center rounded-full"
        style={{
          ['--ring-score' as string]: score,
          ['--ring-color' as string]: colors[status],
          width: size,
          height: size
        } as CSSProperties}
      >
        <div className="grid h-[78%] w-[78%] place-items-center rounded-full bg-slate-950 text-white shadow-inner shadow-slate-900/70">
          <div className="text-center">
            <div className="text-3xl font-semibold leading-none">{score}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">/100</div>
          </div>
        </div>
      </div>
      <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{label}</div>
    </div>
  );
}
