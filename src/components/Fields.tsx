import { useId, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { fmt } from '../lib/project';
export function Range({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (n: number) => void }) {
  const id = useId();
  return <div className="field"><div className="field-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{fmt(value, 2)} <span>{unit}</span></output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={{ '--range-progress': `${(value - min) / (max - min) * 100}%` } as React.CSSProperties}/><div className="range-extents"><span>{fmt(min, 1)} {unit}</span><span>{fmt(max, 1)} {unit}</span></div></div>;
}
export function NumberField({ label, value, min = 0, max, step = 1, unit, onChange }: { label: string; value: number; min?: number; max: number; step?: number; unit?: string; onChange: (n: number) => void }) {
  const id = useId();
  return <div className="number-field"><label htmlFor={id}>{label}</label><div><input id={id} type="number" min={min} max={max} step={step} value={value} onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n))); }}/>{unit && <span>{unit}</span>}</div></div>;
}
export function Metric({ label, value, unit, sub, accent = false }: { label: string; value: string; unit?: string; sub: string; accent?: boolean }) { return <div className={`metric ${accent ? 'accent' : ''}`}><span className="metric-label">{label}</span><div className="metric-value">{value} <span>{unit}</span></div><span className="metric-sub">{sub}</span></div>; }
export function Note({ children }: { children: ReactNode }) { return <div className="note"><Info size={16}/><p>{children}</p></div>; }
export function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) { return <aside className="panel"><div className="panel-heading">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{children}</aside>; }
