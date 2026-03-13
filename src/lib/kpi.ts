import { FLEETS } from './config';
import { getPeriodRange, monthDates, monthEnd, monthStart } from './date-utils';
import type { DailyRecord, FleetKey, FleetSnapshot, FleetTarget, MetricDirection, MetricResult, PeriodKey, ScoringWeights } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gradeMetric(value: number, target: number, critical: number, direction: MetricDirection) {
  if (direction === 'higher') {
    if (value >= target) return 100;
    if (value <= critical) return 0;
    return clamp(((value - critical) / (target - critical)) * 100, 0, 100);
  }
  if (value <= target) return 100;
  if (value >= critical) return 0;
  return clamp(((critical - value) / (critical - target)) * 100, 0, 100);
}

function statusFromScore(score: number): 'good' | 'watch' | 'bad' {
  if (score >= 85) return 'good';
  if (score >= 60) return 'watch';
  return 'bad';
}

export function formatMetric(label: string, value: number) {
  if (label === 'EM15') return `${value.toFixed(1)}%`;
  if (label === 'Canx %') return `${value.toFixed(2)}%`;
  if (label === 'MEL / Flight') return value.toFixed(2);
  return `${value.toFixed(1)} min`;
}

export function buildMetrics(snapshot: FleetSnapshot, targets: FleetTarget): MetricResult[] {
  const metrics: MetricResult[] = [
    { label: 'EM15', value: snapshot.em15, display: formatMetric('EM15', snapshot.em15), target: targets.em15Target, critical: targets.em15Critical, direction: 'higher', score: gradeMetric(snapshot.em15, targets.em15Target, targets.em15Critical, 'higher'), status: 'good' },
    { label: 'Delay Avg', value: snapshot.delayAvg, display: formatMetric('Delay Avg', snapshot.delayAvg), target: targets.delayAvgTarget, critical: targets.delayAvgCritical, direction: 'lower', score: gradeMetric(snapshot.delayAvg, targets.delayAvgTarget, targets.delayAvgCritical, 'lower'), status: 'good' },
    { label: 'Canx %', value: snapshot.cancelAvg, display: formatMetric('Canx %', snapshot.cancelAvg), target: targets.cancelAvgTarget, critical: targets.cancelAvgCritical, direction: 'lower', score: gradeMetric(snapshot.cancelAvg, targets.cancelAvgTarget, targets.cancelAvgCritical, 'lower'), status: 'good' },
    { label: 'MEL / Flight', value: snapshot.melPerFlight, display: formatMetric('MEL / Flight', snapshot.melPerFlight), target: targets.melPerFlightTarget, critical: targets.melPerFlightCritical, direction: 'lower', score: gradeMetric(snapshot.melPerFlight, targets.melPerFlightTarget, targets.melPerFlightCritical, 'lower'), status: 'good' }
  ];
  return metrics.map((metric) => ({ ...metric, status: statusFromScore(metric.score) }));
}

export function calculateSnapshot(records: DailyRecord[], fleet: FleetKey, period: PeriodKey, reportDate: string, target: FleetTarget, weights: ScoringWeights): FleetSnapshot {
  const { start, end } = getPeriodRange(reportDate, period);
  const filtered = records.filter((record) => record.fleet === fleet && record.date >= start && record.date <= end);
  const totalFlights = filtered.reduce((sum, record) => sum + record.totalFlights, 0);
  const delay15Count = filtered.reduce((sum, record) => sum + record.techDelays15, 0);
  const delayedAircraftCount = filtered.reduce((sum, record) => sum + record.delayedAircraftCount, 0);
  const totalDelayMinutes = filtered.reduce((sum, record) => sum + record.totalDelayMinutes, 0);
  const techCancellations = filtered.reduce((sum, record) => sum + record.techCancellations, 0);
  const totalMels = filtered.reduce((sum, record) => sum + record.totalMels, 0);
  const em15 = totalFlights > 0 ? (1 - delay15Count / totalFlights) * 100 : 100;
  const delayAvg = delayedAircraftCount > 0 ? totalDelayMinutes / delayedAircraftCount : 0;
  const cancelAvg = totalFlights > 0 ? (techCancellations / totalFlights) * 100 : 0;
  const melPerFlight = totalFlights > 0 ? totalMels / totalFlights : 0;
  const delayBurden = totalFlights > 0 ? totalDelayMinutes / totalFlights : 0;
  const metricScores = buildMetrics({ fleet, totalFlights, delay15Count, delayedAircraftCount, totalDelayMinutes, techCancellations, totalMels, em15, delayAvg, cancelAvg, melPerFlight, delayBurden, score: 0, status: 'good' }, target);
  const score = metricScores[0].score * weights.em15 + metricScores[1].score * weights.delayAvg + metricScores[2].score * weights.cancelAvg + metricScores[3].score * weights.melPerFlight;
  const finalScore = Math.round(score);
  return { fleet, totalFlights, delay15Count, delayedAircraftCount, totalDelayMinutes, techCancellations, totalMels, em15, delayAvg, cancelAvg, melPerFlight, delayBurden, score: finalScore, status: statusFromScore(finalScore) };
}

export function aggregateSnapshots(snapshots: FleetSnapshot[]) {
  return {
    totalFlights: snapshots.reduce((sum, item) => sum + item.totalFlights, 0),
    totalDelayMinutes: snapshots.reduce((sum, item) => sum + item.totalDelayMinutes, 0),
    averageScore: snapshots.length ? Math.round(snapshots.reduce((sum, item) => sum + item.score, 0) / snapshots.length) : 0,
    onTargetCount: snapshots.filter((item) => item.status === 'good').length,
    watchCount: snapshots.filter((item) => item.status === 'watch').length,
    actionCount: snapshots.filter((item) => item.status === 'bad').length
  };
}

export function buildPeriodComparison(records: DailyRecord[], fleet: FleetKey, reportDate: string, target: FleetTarget, weights: ScoringWeights) {
  return (['priorDay', 'rolling7', 'priorMonth', 'ytd'] as PeriodKey[]).map((period) => {
    const snapshot = calculateSnapshot(records, fleet, period, reportDate, target, weights);
    return { period, em15: Number(snapshot.em15.toFixed(1)), delayAvg: Number(snapshot.delayAvg.toFixed(1)), score: snapshot.score };
  });
}

export function buildMonthStats(records: DailyRecord[], fleet: FleetKey, reportDate: string) {
  const monthStartIso = monthStart(reportDate);
  const monthEndIso = monthEnd(reportDate);
  const filtered = records.filter((record) => record.fleet === fleet && record.date >= monthStartIso && record.date <= monthEndIso);

  const enteredDays = filtered.filter((record) => record.totalFlights > 0 || record.techDelays15 > 0 || record.delayedAircraftCount > 0 || record.totalDelayMinutes > 0 || record.techCancellations > 0 || record.totalMels > 0 || record.notes.trim().length > 0).length;
  const totalFlights = filtered.reduce((sum, record) => sum + record.totalFlights, 0);
  const totalDelayMinutes = filtered.reduce((sum, record) => sum + record.totalDelayMinutes, 0);
  const totalDelay15 = filtered.reduce((sum, record) => sum + record.techDelays15, 0);

  return {
    dayCount: monthDates(reportDate).length,
    enteredDays,
    totalFlights,
    totalDelayMinutes,
    averageDailyFlights: filtered.length ? totalFlights / filtered.length : 0,
    averageDelay15: filtered.length ? totalDelay15 / filtered.length : 0
  };
}

export function buildExportPayload(records: DailyRecord[], reportDate: string, targets: Record<FleetKey, FleetTarget>, weights: ScoringWeights) {
  return {
    exportedAt: new Date().toISOString(),
    reportDate,
    monthRange: {
      start: monthStart(reportDate),
      end: monthEnd(reportDate)
    },
    scoring: { targets, weights },
    snapshots: FLEETS.map((fleet) => ({
      fleet: fleet.key,
      priorDay: calculateSnapshot(records, fleet.key, 'priorDay', reportDate, targets[fleet.key], weights),
      rolling7: calculateSnapshot(records, fleet.key, 'rolling7', reportDate, targets[fleet.key], weights),
      priorMonth: calculateSnapshot(records, fleet.key, 'priorMonth', reportDate, targets[fleet.key], weights),
      ytd: calculateSnapshot(records, fleet.key, 'ytd', reportDate, targets[fleet.key], weights),
      activeMonth: buildMonthStats(records, fleet.key, reportDate)
    })),
    records
  };
}
