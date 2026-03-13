import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CalendarDays, FileDown, FileSpreadsheet, RefreshCcw, Settings2, Sparkles, Activity, PlaneTakeoff, Timer } from 'lucide-react';
import { EditableTable } from './components/EditableTable';
import { FleetCard } from './components/FleetCard';
import { SettingsDrawer } from './components/SettingsDrawer';
import { DEFAULT_TARGETS, DEFAULT_WEIGHTS, FLEETS, PERIOD_LABELS, STORAGE_KEY } from './lib/config';
import { countEnteredDays, ensureMonthRecords, todayIso } from './lib/demo-data';
import { formatDisplayDate, formatMonthLabel, monthDates } from './lib/date-utils';
import { aggregateSnapshots, buildExportPayload, calculateSnapshot } from './lib/kpi';
import type { DailyRecord, SettingsState } from './lib/types';

const defaultSettings = (): SettingsState => ({
  reportDate: todayIso(),
  selectedPeriod: 'priorDay',
  selectedFleet: 'E190',
  targets: DEFAULT_TARGETS,
  weights: DEFAULT_WEIGHTS
});

function App() {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { settings: SettingsState; records: DailyRecord[] };
        setSettings(parsed.settings ?? defaultSettings());
        setRecords(ensureMonthRecords(parsed.records ?? [], (parsed.settings ?? defaultSettings()).reportDate));
      } else {
        const seedSettings = defaultSettings();
        setSettings(seedSettings);
        setRecords(ensureMonthRecords([], seedSettings.reportDate));
      }
    } catch {
      const seedSettings = defaultSettings();
      setSettings(seedSettings);
      setRecords(ensureMonthRecords([], seedSettings.reportDate));
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, records }));
  }, [isReady, settings, records]);

  useEffect(() => {
    if (!isReady) return;
    setRecords((current) => ensureMonthRecords(current, settings.reportDate));
  }, [isReady, settings.reportDate]);

  const snapshots = useMemo(
    () => FLEETS.map((fleet) => calculateSnapshot(records, fleet.key, settings.selectedPeriod, settings.reportDate, settings.targets[fleet.key], settings.weights)),
    [records, settings]
  );

  const network = useMemo(() => aggregateSnapshots(snapshots), [snapshots]);
  const enteredRows = useMemo(() => countEnteredDays(records, settings.reportDate), [records, settings.reportDate]);
  const monthRowCapacity = monthDates(settings.reportDate).length * FLEETS.length;

  const updateRecord = (id: string, field: keyof DailyRecord, value: string | number) => {
    setRecords((current) => current.map((record) => (record.id === id ? { ...record, [field]: value } : record)));
  };

  const resetData = () => {
    const freshSettings = defaultSettings();
    setSettings(freshSettings);
    setRecords(ensureMonthRecords([], freshSettings.reportDate));
  };

  const exportPdf = async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#04101c', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`azal-premium-report-${settings.reportDate}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCsv = () => {
    const monthRecords = records
      .filter((record) => record.date.slice(0, 7) === settings.reportDate.slice(0, 7))
      .sort((left, right) => (left.date === right.date ? left.fleet.localeCompare(right.fleet) : left.date.localeCompare(right.date)));

    const rows = [
      ['date', 'fleet', 'total_flights', 'delay_15_plus', 'delayed_aircraft_count', 'total_delay_minutes', 'delay_avg', 'tech_cancellations', 'cancel_avg_pct', 'total_mels', 'mel_per_flight', 'delay_burden', 'notes'].join(','),
      ...monthRecords.map((record) => {
        const delayAvg = record.delayedAircraftCount > 0 ? record.totalDelayMinutes / record.delayedAircraftCount : 0;
        const cancelAvg = record.totalFlights > 0 ? (record.techCancellations / record.totalFlights) * 100 : 0;
        const melPerFlight = record.totalFlights > 0 ? record.totalMels / record.totalFlights : 0;
        const delayBurden = record.totalFlights > 0 ? record.totalDelayMinutes / record.totalFlights : 0;
        const safeNotes = `"${record.notes.replace(/"/g, '""')}"`;
        return [
          record.date,
          record.fleet,
          record.totalFlights,
          record.techDelays15,
          record.delayedAircraftCount,
          record.totalDelayMinutes,
          delayAvg.toFixed(2),
          record.techCancellations,
          cancelAvg.toFixed(2),
          record.totalMels,
          melPerFlight.toFixed(2),
          delayBurden.toFixed(2),
          safeNotes
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([`\uFEFF${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azal-monthly-input-${settings.reportDate.slice(0, 7)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const payload = buildExportPayload(records, settings.reportDate, settings.targets, settings.weights);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `azal-premium-report-${settings.reportDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isReady) return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-200">Loading report…</div>;

  return (
    <main className="premium-page-shell">
      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onReportDateChange={(value) => setSettings((current) => ({ ...current, reportDate: value }))}
        onTargetChange={(fleet, field, value) => setSettings((current) => ({ ...current, targets: { ...current.targets, [fleet]: { ...current.targets[fleet], [field]: value } } }))}
        onWeightChange={(field, value) => setSettings((current) => ({ ...current, weights: { ...current.weights, [field]: value } }))}
      />

      <div className="premium-backdrop-orb premium-backdrop-orb--one" />
      <div className="premium-backdrop-orb premium-backdrop-orb--two" />

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="premium-toolbar no-print">
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setSettings((current) => ({ ...current, selectedPeriod: key as SettingsState['selectedPeriod'] }))} className={`premium-pill ${settings.selectedPeriod === key ? 'premium-pill--active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSettingsOpen(true)} className="premium-action-btn"><Settings2 className="h-4 w-4" /> Targets</button>
            <button onClick={resetData} className="premium-action-btn"><RefreshCcw className="h-4 w-4" /> Reset</button>
            <button onClick={exportCsv} className="premium-action-btn"><FileSpreadsheet className="h-4 w-4" /> CSV</button>
            <button onClick={exportJson} className="premium-action-btn">JSON</button>
            <button onClick={exportPdf} disabled={isExporting} className="premium-primary-btn"><FileDown className="h-4 w-4" /> PDF</button>
          </div>
        </section>

        <div ref={reportRef} className="premium-report-frame">
          <section className="premium-hero-card">
            <div>
              <div className="premium-hero-badge"><Sparkles className="h-4 w-4" /> AZAL premium ops intelligence</div>
              <h1 className="premium-hero-title">AZAL Engineering Daily Operations Report</h1>
              <p className="premium-hero-copy">Interactive executive view for fleet performance, operational disruption, and engineering quality signals.</p>
            </div>
            <div className="premium-hero-meta">
              <div><CalendarDays className="h-4 w-4" /> {formatDisplayDate(settings.reportDate)}</div>
              <div>Month: {formatMonthLabel(settings.reportDate)}</div>
              <div>Coverage: {enteredRows} / {monthRowCapacity}</div>
            </div>
          </section>

          <section className="premium-overview-grid">
            <div className="premium-overview-card">
              <div className="premium-overview-label"><Activity className="h-4 w-4" /> Network score</div>
              <div className="premium-overview-value">{network.averageScore}<span>/100</span></div>
            </div>
            <div className="premium-overview-card">
              <div className="premium-overview-label"><PlaneTakeoff className="h-4 w-4" /> Flights in scope</div>
              <div className="premium-overview-value">{network.totalFlights}</div>
            </div>
            <div className="premium-overview-card">
              <div className="premium-overview-label"><Timer className="h-4 w-4" /> Delay minutes</div>
              <div className="premium-overview-value">{network.totalDelayMinutes}</div>
            </div>
            <div className="premium-overview-card">
              <div className="premium-overview-label"><Sparkles className="h-4 w-4" /> Fleet status mix</div>
              <div className="premium-overview-value premium-overview-value--small">{network.onTargetCount} good · {network.watchCount} watch · {network.actionCount} action</div>
            </div>
          </section>

          <section className="premium-fleet-grid">
            {FLEETS.map((fleet) => {
              const snapshot = snapshots.find((item) => item.fleet === fleet.key)!;
              return (
                <FleetCard
                  key={fleet.key}
                  title={fleet.name}
                  subtitle={fleet.sublabel}
                  snapshot={snapshot}
                  target={settings.targets[fleet.key]}
                  reportDate={settings.reportDate}
                  weights={settings.weights}
                  records={records}
                />
              );
            })}
          </section>
        </div>

        <section className="mt-8 no-print">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {FLEETS.map((fleet) => (
              <button key={fleet.key} onClick={() => setSettings((current) => ({ ...current, selectedFleet: fleet.key }))} className={`premium-pill ${settings.selectedFleet === fleet.key ? 'premium-pill--active' : ''}`}>
                {fleet.name}
              </button>
            ))}
          </div>
          <EditableTable fleet={settings.selectedFleet} records={records} reportDate={settings.reportDate} onUpdate={updateRecord} />
        </section>
      </div>
    </main>
  );
}

export default App;
