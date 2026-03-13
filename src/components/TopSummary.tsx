import { Activity, AlertTriangle, CheckCircle2, Clock3, Plane } from 'lucide-react';

export function TopSummary({ averageScore, totalFlights, totalDelayMinutes, onTargetCount, watchCount, actionCount }: { averageScore: number; totalFlights: number; totalDelayMinutes: number; onTargetCount: number; watchCount: number; actionCount: number }) {
  const cards = [
    { label: 'Network score', value: averageScore, suffix: '/100', icon: Activity, tone: 'from-white/14 to-white/5' },
    { label: 'Flights in scope', value: totalFlights, suffix: '', icon: Plane, tone: 'from-cyan-500/20 to-blue-500/10' },
    { label: 'Delay minutes', value: totalDelayMinutes, suffix: 'min', icon: Clock3, tone: 'from-amber-500/20 to-orange-500/10' },
    { label: 'Fleet status', value: `${onTargetCount}/${watchCount}/${actionCount}`, suffix: 'good/watch/action', icon: onTargetCount >= 3 ? CheckCircle2 : AlertTriangle, tone: 'from-emerald-500/20 to-teal-500/10' }
  ];

  return (
    <div className="metric-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`glass rounded-[28px] bg-gradient-to-br ${card.tone} p-5 text-white shadow-soft`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-white/75">{card.label}</div>
              <div className="rounded-full border border-white/10 bg-white/10 p-2"><Icon className="h-4 w-4" /></div>
            </div>
            <div className="mt-5 flex items-end gap-2">
              <div className="text-4xl font-semibold leading-none">{card.value}</div>
              <div className="pb-1 text-xs uppercase tracking-[0.22em] text-white/60">{card.suffix}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
