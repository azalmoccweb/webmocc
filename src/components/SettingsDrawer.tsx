import { Settings2, X } from 'lucide-react';
import { FLEETS } from '../lib/config';
import type { FleetKey, SettingsState } from '../lib/types';

type SettingsDrawerProps = {
  open: boolean;
  settings: SettingsState;
  onClose: () => void;
  onReportDateChange: (value: string) => void;
  onTargetChange: (fleet: FleetKey, field: string, value: number) => void;
  onWeightChange: (field: keyof SettingsState['weights'], value: number) => void;
};

export function SettingsDrawer({ open, settings, onClose, onReportDateChange, onTargetChange, onWeightChange }: SettingsDrawerProps) {
  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-[#07101c] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400"><Settings2 className="h-4 w-4" /> Dashboard Control Center</div>
            <h2 className="mt-2 text-2xl font-semibold">Scoring and target settings</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-8 space-y-8">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-sm font-semibold">Snapshot controls</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">Seçilən tarix həm report snapshot üçün istifadə olunur, həm də aşağıdakı manual giriş cədvəlində həmin ayın bütün günlərini açır.</div>
            <div className="mt-4 max-w-xs">
              <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Snapshot date</label>
              <input className="input-shell w-full rounded-2xl px-4 py-3" type="date" value={settings.reportDate} onChange={(e) => onReportDateChange(e.target.value)} />
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-sm font-semibold">Weights</div>
            <p className="mt-2 text-sm text-slate-400">Bu dörd dəyər yekun 0-100 health score-u yaradır.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Object.entries(settings.weights).map(([key, value]) => (
                <label key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">{key}</span>
                  <input className="input-shell w-full rounded-xl px-3 py-2" type="number" step="0.05" min="0" max="1" value={value} onChange={(event) => onWeightChange(key as keyof SettingsState['weights'], Number(event.target.value))} />
                </label>
              ))}
            </div>
          </section>

          {FLEETS.map((fleet) => (
            <section key={fleet.key} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-sm font-semibold">{fleet.name} targets</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {Object.entries(settings.targets[fleet.key]).map(([field, value]) => (
                  <label key={field} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">{field}</span>
                    <input className="input-shell w-full rounded-xl px-3 py-2" type="number" step="0.1" min="0" value={value} onChange={(event) => onTargetChange(fleet.key, field, Number(event.target.value))} />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
