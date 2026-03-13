import { CalendarDays, ClipboardList, PlaneTakeoff, Timer } from 'lucide-react';
import { formatDisplayDate, formatMonthLabel } from '../lib/date-utils';
import { buildMonthStats } from '../lib/kpi';
import type { DailyRecord, FleetKey } from '../lib/types';

type EditableTableProps = {
  fleet: FleetKey;
  records: DailyRecord[];
  reportDate: string;
  onUpdate: (id: string, field: keyof DailyRecord, value: string | number) => void;
};

function hasData(record: DailyRecord) {
  return record.totalFlights > 0 || record.techDelays15 > 0 || record.delayedAircraftCount > 0 || record.totalDelayMinutes > 0 || record.techCancellations > 0 || record.totalMels > 0 || record.notes.trim().length > 0;
}

function NumberInput({ value, onChange, width = 'w-[104px]' }: { value: number; onChange: (next: number) => void; width?: string }) {
  return (
    <input
      className={`premium-input ${width}`}
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
    />
  );
}

export function EditableTable({ fleet, records, reportDate, onUpdate }: EditableTableProps) {
  const filtered = records
    .filter((record) => record.fleet === fleet && record.date.slice(0, 7) === reportDate.slice(0, 7))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthStats = buildMonthStats(records, fleet, reportDate);

  return (
    <div className="premium-editor-shell">
      <div className="premium-editor-header">
        <div>
          <div className="premium-editor-eyebrow">Interactive input studio</div>
          <h3 className="premium-editor-title">Manual daily input matrix</h3>
          <p className="premium-editor-copy">{formatMonthLabel(reportDate)} üzrə məlumatları daxil et. Dəyərlər dəyişdikcə yuxarıdakı premium report avtomatik yenilənir.</p>
        </div>
        <div className="premium-editor-chip">Fleet in focus: <strong>{fleet}</strong></div>
      </div>

      <div className="premium-editor-stats">
        <div className="premium-editor-stat">
          <span><CalendarDays className="h-4 w-4" /> Entered days</span>
          <strong>{monthStats.enteredDays}<small> / {monthStats.dayCount}</small></strong>
        </div>
        <div className="premium-editor-stat">
          <span><PlaneTakeoff className="h-4 w-4" /> Month flights</span>
          <strong>{monthStats.totalFlights}</strong>
        </div>
        <div className="premium-editor-stat">
          <span><Timer className="h-4 w-4" /> Delay minutes</span>
          <strong>{monthStats.totalDelayMinutes}</strong>
        </div>
        <div className="premium-editor-stat">
          <span><ClipboardList className="h-4 w-4" /> Avg delay15+ / day</span>
          <strong>{monthStats.averageDelay15.toFixed(1)}</strong>
        </div>
      </div>

      <div className="premium-editor-table-wrap">
        <table className="premium-editor-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Flights</th>
              <th>Delay 15+</th>
              <th>Delayed AC</th>
              <th>Delay min</th>
              <th>Delay avg</th>
              <th>Tech canx</th>
              <th>Canx %</th>
              <th>MEL</th>
              <th>MEL / Flight</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => {
              const delayAvg = record.delayedAircraftCount > 0 ? record.totalDelayMinutes / record.delayedAircraftCount : 0;
              const cancelAvg = record.totalFlights > 0 ? (record.techCancellations / record.totalFlights) * 100 : 0;
              const melPerFlight = record.totalFlights > 0 ? record.totalMels / record.totalFlights : 0;

              return (
                <tr key={record.id} className={hasData(record) ? 'is-active' : ''}>
                  <td className="premium-date-cell">
                    <div>{formatDisplayDate(record.date)}</div>
                    <small>{new Date(`${record.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}</small>
                  </td>
                  <td><NumberInput value={record.totalFlights} onChange={(value) => onUpdate(record.id, 'totalFlights', value)} /></td>
                  <td><NumberInput value={record.techDelays15} onChange={(value) => onUpdate(record.id, 'techDelays15', value)} /></td>
                  <td><NumberInput value={record.delayedAircraftCount} onChange={(value) => onUpdate(record.id, 'delayedAircraftCount', value)} /></td>
                  <td><NumberInput value={record.totalDelayMinutes} onChange={(value) => onUpdate(record.id, 'totalDelayMinutes', value)} /></td>
                  <td className="premium-derived-cell">{record.delayedAircraftCount > 0 ? `${delayAvg.toFixed(1)} min` : '—'}</td>
                  <td><NumberInput value={record.techCancellations} onChange={(value) => onUpdate(record.id, 'techCancellations', value)} width="w-[96px]" /></td>
                  <td className="premium-derived-cell">{record.totalFlights > 0 ? `${cancelAvg.toFixed(2)}%` : '—'}</td>
                  <td><NumberInput value={record.totalMels} onChange={(value) => onUpdate(record.id, 'totalMels', value)} width="w-[84px]" /></td>
                  <td className="premium-derived-cell">{record.totalFlights > 0 ? melPerFlight.toFixed(2) : '—'}</td>
                  <td>
                    <input className="premium-input w-[180px]" value={record.notes} placeholder="Ops note" onChange={(event) => onUpdate(record.id, 'notes', event.target.value)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="premium-note-box">
        Delay Avg = <strong>Total Delay Minutes / Delayed Aircraft Count</strong>. EM15 isə <strong>1 - Delay 15+ / Total Flights</strong> formuluna əsasən hesablanır.
      </div>
    </div>
  );
}
