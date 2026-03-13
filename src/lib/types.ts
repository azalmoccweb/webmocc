export type FleetKey = 'E190' | 'AIRBUS' | 'B767' | 'B787';
export type PeriodKey = 'priorDay' | 'rolling7' | 'priorMonth' | 'ytd';

export type DailyRecord = {
  id: string;
  date: string;
  fleet: FleetKey;
  totalFlights: number;
  techDelays15: number;
  delayedAircraftCount: number;
  totalDelayMinutes: number;
  techCancellations: number;
  totalMels: number;
  notes: string;
};

export type MetricDirection = 'higher' | 'lower';

export type FleetTarget = {
  em15Target: number;
  em15Critical: number;
  delayAvgTarget: number;
  delayAvgCritical: number;
  cancelAvgTarget: number;
  cancelAvgCritical: number;
  melPerFlightTarget: number;
  melPerFlightCritical: number;
};

export type ScoringWeights = {
  em15: number;
  delayAvg: number;
  cancelAvg: number;
  melPerFlight: number;
};

export type MetricResult = {
  label: string;
  value: number;
  display: string;
  target: number;
  critical: number;
  direction: MetricDirection;
  score: number;
  status: 'good' | 'watch' | 'bad';
};

export type FleetSnapshot = {
  fleet: FleetKey;
  totalFlights: number;
  delay15Count: number;
  delayedAircraftCount: number;
  totalDelayMinutes: number;
  techCancellations: number;
  totalMels: number;
  em15: number;
  delayAvg: number;
  cancelAvg: number;
  melPerFlight: number;
  delayBurden: number;
  score: number;
  status: 'good' | 'watch' | 'bad';
};

export type SettingsState = {
  reportDate: string;
  selectedPeriod: PeriodKey;
  selectedFleet: FleetKey;
  targets: Record<FleetKey, FleetTarget>;
  weights: ScoringWeights;
};
