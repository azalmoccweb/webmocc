import { FLEETS } from './config';
import { formatIso, monthDates } from './date-utils';
import type { DailyRecord } from './types';

function normalizeNumber(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
}

export function normalizeRecord(record: Partial<DailyRecord> & { id?: string; date: string; fleet: DailyRecord['fleet'] }): DailyRecord {
  return {
    id: record.id ?? `${record.fleet}-${record.date}`,
    date: record.date,
    fleet: record.fleet,
    totalFlights: normalizeNumber(record.totalFlights),
    techDelays15: normalizeNumber(record.techDelays15),
    delayedAircraftCount: normalizeNumber(record.delayedAircraftCount ?? record.techDelays15),
    totalDelayMinutes: normalizeNumber(record.totalDelayMinutes),
    techCancellations: normalizeNumber(record.techCancellations),
    totalMels: normalizeNumber(record.totalMels),
    notes: typeof record.notes === 'string' ? record.notes : ''
  };
}

export function createMonthTemplate(reportDate: string): DailyRecord[] {
  return monthDates(reportDate).flatMap((date) => FLEETS.map((fleet) => normalizeRecord({ date, fleet: fleet.key })));
}

export function ensureMonthRecords(existing: DailyRecord[], reportDate: string): DailyRecord[] {
  const normalized = existing.map((record) => normalizeRecord(record));
  const monthSet = new Set(monthDates(reportDate));
  const keyed = new Map(normalized.map((record) => [`${record.fleet}-${record.date}`, record]));

  createMonthTemplate(reportDate).forEach((template) => {
    const key = `${template.fleet}-${template.date}`;
    if (!keyed.has(key)) keyed.set(key, template);
  });

  return Array.from(keyed.values()).sort((left, right) => {
    if (left.date === right.date) return left.fleet.localeCompare(right.fleet);
    return left.date.localeCompare(right.date);
  });
}

export function countEnteredDays(records: DailyRecord[], reportDate: string) {
  const monthSet = new Set(monthDates(reportDate));
  return records.filter((record) => monthSet.has(record.date) && (record.totalFlights > 0 || record.techDelays15 > 0 || record.delayedAircraftCount > 0 || record.totalDelayMinutes > 0 || record.techCancellations > 0 || record.totalMels > 0 || record.notes.trim().length > 0)).length;
}

export function todayIso() {
  return formatIso(new Date());
}
