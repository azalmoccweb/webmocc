import type { FleetKey, FleetTarget, PeriodKey, ScoringWeights } from './types';

export const FLEETS: { key: FleetKey; name: string; accent: string; sublabel: string }[] = [
  { key: 'E190', name: 'E190', accent: 'from-rose-500 to-orange-400', sublabel: 'Regional performance' },
  { key: 'AIRBUS', name: 'Airbus', accent: 'from-cyan-500 to-blue-500', sublabel: 'A320 family' },
  { key: 'B767', name: 'Boeing 767', accent: 'from-violet-500 to-indigo-500', sublabel: 'Long-haul legacy' },
  { key: 'B787', name: 'Boeing 787', accent: 'from-emerald-500 to-teal-500', sublabel: 'Flagship efficiency' }
];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  priorDay: 'Prior Day',
  rolling7: 'Rolling 7',
  priorMonth: 'Prior Month',
  ytd: 'YTD'
};

export const DEFAULT_TARGETS: Record<FleetKey, FleetTarget> = {
  E190: {
    em15Target: 98,
    em15Critical: 92,
    delayAvgTarget: 15,
    delayAvgCritical: 45,
    cancelAvgTarget: 0.5,
    cancelAvgCritical: 5,
    melPerFlightTarget: 0.6,
    melPerFlightCritical: 2.5
  },
  AIRBUS: {
    em15Target: 98,
    em15Critical: 92,
    delayAvgTarget: 15,
    delayAvgCritical: 45,
    cancelAvgTarget: 0.5,
    cancelAvgCritical: 5,
    melPerFlightTarget: 0.9,
    melPerFlightCritical: 3
  },
  B767: {
    em15Target: 96.5,
    em15Critical: 90,
    delayAvgTarget: 15,
    delayAvgCritical: 45,
    cancelAvgTarget: 0.7,
    cancelAvgCritical: 5,
    melPerFlightTarget: 0.6,
    melPerFlightCritical: 2.8
  },
  B787: {
    em15Target: 97,
    em15Critical: 91,
    delayAvgTarget: 15,
    delayAvgCritical: 45,
    cancelAvgTarget: 0.5,
    cancelAvgCritical: 5,
    melPerFlightTarget: 0.8,
    melPerFlightCritical: 2.5
  }
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  em15: 0.4,
  delayAvg: 0.25,
  cancelAvg: 0.2,
  melPerFlight: 0.15
};

export const STORAGE_KEY = 'azal-premium-report-v5';
