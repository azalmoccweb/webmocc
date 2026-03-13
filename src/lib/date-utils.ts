import type { PeriodKey } from './types';

const pad = (value: number) => String(value).padStart(2, '0');

export function formatIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function formatDisplayDate(value: string): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatMonthLabel(value: string): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export function shiftDays(value: string, offset: number): string {
  const date = toDate(value);
  date.setDate(date.getDate() + offset);
  return formatIso(date);
}

export function monthStart(value: string): string {
  const date = toDate(value);
  date.setDate(1);
  return formatIso(date);
}

export function monthEnd(value: string): string {
  const date = toDate(value);
  date.setMonth(date.getMonth() + 1, 0);
  return formatIso(date);
}

export function yearStart(value: string): string {
  const date = toDate(value);
  date.setMonth(0, 1);
  return formatIso(date);
}

export function eachDay(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const cursor = toDate(startIso);
  const end = toDate(endIso);
  while (cursor <= end) {
    dates.push(formatIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function monthDates(value: string): string[] {
  return eachDay(monthStart(value), monthEnd(value));
}

export function getPeriodRange(reportDate: string, period: PeriodKey) {
  const priorDay = shiftDays(reportDate, -1);

  if (period === 'priorDay') return { start: priorDay, end: priorDay };
  if (period === 'rolling7') return { start: shiftDays(reportDate, -7), end: priorDay };
  if (period === 'priorMonth') {
    const firstDayOfCurrentMonth = monthStart(reportDate);
    const lastDayOfPreviousMonth = shiftDays(firstDayOfCurrentMonth, -1);
    return { start: monthStart(lastDayOfPreviousMonth), end: monthEnd(lastDayOfPreviousMonth) };
  }
  return { start: yearStart(reportDate), end: priorDay };
}
