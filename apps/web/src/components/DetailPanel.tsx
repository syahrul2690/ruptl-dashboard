import { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';
import * as XLSX from 'xlsx';
import { Project, ProjectSlim, STATUS_CONFIG, ProjectStatus, ProjectType, URGENCY_OPTIONS } from '../lib/types';
import { projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../context/ThemeContext';

const ACCENT = '#008BA0';
const ACCENT_BG  = 'rgba(0,139,160,0.10)';
const ACCENT_BDR = 'rgba(0,139,160,0.35)';

// ── S-Curve types ─────────────────────────────────────────────────────────────
interface ProgressRow { yearMonth: string; plan: number; actual: number | null; }

// ── S-Curve Chart (compact SVG) ───────────────────────────────────────────────
function SCurveChart({ rows }: { rows: ProgressRow[] }) {
  const c = useColors();
  if (!rows.length) return (
    <div style={{ fontSize:11, color:c.textMuted, textAlign:'center', padding:'20px 0' }}>Belum ada data S-Curve</div>
  );

  const W = 344, H = 170;
  const PAD = { top: 16, right: 12, bottom: 32, left: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const n  = rows.length;

  const xPos = (i: number) => PAD.left + (n < 2 ? cW / 2 : (i / (n - 1)) * cW);
  const yPos = (v: number) => PAD.top + cH - (Math.min(Math.max(v, 0), 100) / 100) * cH;

  const planPts    = rows.map((r, i) => `${xPos(i)},${yPos(r.plan)}`).join(' ');
  const actualRows = rows.filter(r => r.actual != null);
  const actualPts  = actualRows.map(r => `${xPos(rows.indexOf(r))},${yPos(r.actual!)}`).join(' ');

  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const labelStep  = Math.max(1, Math.ceil(n / 7));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block', overflow:'visible' }}>
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)}
            stroke={c.divider} strokeWidth={v === 0 ? 1 : 0.5} strokeDasharray={v === 0 ? undefined : '2,3'} />
          <text x={PAD.left - 4} y={yPos(v) + 3.5} textAnchor="end" fontSize={8} fill={c.textMuted}>{v}</text>
        </g>
      ))}
      {n > 1 && <polyline points={planPts} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeLinejoin="round" />}
      {actualRows.length > 1 && <polyline points={actualPts} fill="none" stroke="#10B981" strokeWidth={1.5} strokeLinejoin="round" />}
      {rows.map((r, i) => (
        <g key={r.yearMonth}>
          <circle cx={xPos(i)} cy={yPos(r.plan)} r={2.5} fill="#3B82F6" />
          {r.actual != null && <circle cx={xPos(i)} cy={yPos(r.actual)} r={2.5} fill="#10B981" />}
        </g>
      ))}
      {rows.map((r, i) => {
        if (i % labelStep !== 0 && i !== n - 1) return null;
        const [y, m] = r.yearMonth.split('-');
        return (
          <text key={r.yearMonth} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={8} fill={c.textMuted}>
            {MONTH_ABBR[parseInt(m) - 1]}'{y.slice(2)}
          </text>
        );
      })}
      <g>
        <rect x={PAD.left} y={3} width={7} height={7} rx={1} fill="#3B82F6" />
        <text x={PAD.left + 10} y={10} fontSize={8} fill={c.textMuted}>Plan</text>
        <rect x={PAD.left + 40} y={3} width={7} height={7} rx={1} fill="#10B981" />
        <text x={PAD.left + 51} y={10} fontSize={8} fill={c.textMuted}>Aktual</text>
      </g>
    </svg>
  );
}

// ── Excel helpers ─────────────────────────────────────────────────────────────
function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Month (YYYY-MM)', 'Plan Increment (%)', 'Actual Increment (%)'],
    ['2024-01', 5, 4.5], ['2024-02', 5, 5], ['2024-03', 5, ''],
  ]);
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'S-Curve');
  XLSX.writeFile(wb, 'scurve_template.xlsx');
}

function exportToExcel(rows: ProgressRow[], projectName: string) {
  const aoa: any[][] = [['Month (YYYY-MM)', 'Plan Increment (%)', 'Actual Increment (%)']];
  let prevPlan = 0, prevActual = 0;
  for (const r of rows) {
    const planInc = parseFloat((r.plan - prevPlan).toFixed(4));
    const actInc  = r.actual != null ? parseFloat((r.actual - prevActual).toFixed(4)) : '';
    aoa.push([r.yearMonth, planInc, actInc]);
    prevPlan = r.plan;
    if (r.actual != null) prevActual = r.actual;
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'S-Curve');
  XLSX.writeFile(wb, `scurve_${projectName.replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 30)}.xlsx`);
}

function parseSheetRows(rows: any[][]): ProgressRow[] {
  const data: ProgressRow[] = [];
  let cumPlan = 0, cumActual = 0;
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const ym    = String(cols[0] ?? '').trim();
    const planD = parseFloat(String(cols[1] ?? '0')) || 0;
    const actRaw = String(cols[2] ?? '').trim();
    const actD  = actRaw === '' ? NaN : parseFloat(actRaw);
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) continue;
    cumPlan   = Math.min(100, cumPlan + planD);
    if (!isNaN(actD)) cumActual = Math.min(100, cumActual + actD);
    data.push({ yearMonth: ym, plan: parseFloat(cumPlan.toFixed(4)), actual: isNaN(actD) ? null : parseFloat(cumActual.toFixed(4)) });
  }
  return data;
}

// ── S-Curve Editor ────────────────────────────────────────────────────────────
function SCurveEditor({ projectId, projectName, initialRows, onClose }: {
  projectId: string; projectName: string; initialRows: ProgressRow[]; onClose: (saved: ProgressRow[]) => void;
}) {
  const [rows,   setRows]   = useState<ProgressRow[]>(initialRows.map(r => ({ ...r })));
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = useColors();

  const addRow = () => {
    const last = rows[rows.length - 1]?.yearMonth ?? new Date().toISOString().slice(0, 7);
    const [y, m] = last.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    if (rows.find(r => r.yearMonth === next)) return;
    setRows(prev => [...prev, { yearMonth: next, plan: 0, actual: null }]);
  };

  const removeRow = (ym: string) => setRows(prev => prev.filter(r => r.yearMonth !== ym));

  const setField = (ym: string, field: 'plan' | 'actual', raw: string) => {
    setRows(prev => prev.map(r => r.yearMonth === ym
      ? { ...r, [field]: raw === '' ? null : parseFloat(raw) || 0 } : r));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let data: ProgressRow[] = [];
        if (isXlsx) {
          const wb = XLSX.read(ev.target?.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          data = parseSheetRows(XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 }));
        } else {
          const aoa = (ev.target?.result as string).trim().split('\n')
            .filter(l => l.trim())
            .map(l => l.split(/[,;]/).map(cell => cell.trim().replace(/"/g, '')));
          data = parseSheetRows(aoa);
        }
        if (!data.length) { setErr('Tidak ada data valid dalam file'); return; }
        setRows(data.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)));
        setErr(null);
      } catch { setErr('Gagal membaca file'); }
    };
    if (isXlsx) reader.readAsBinaryString(file); else reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await projectsApi.upsertProgress(projectId,
        rows.map(r => ({ yearMonth: r.yearMonth, plan: r.plan, actual: r.actual })));
      onClose(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const btnSm: CSSProperties = { padding:'4px 10px', fontSize:10, fontWeight:600, borderRadius:4, border:`1px solid ${c.borderInput}`, background:'transparent', color:c.textSec, cursor:'pointer', fontFamily:'inherit' };
  const cellStyle: CSSProperties = { background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:3, color:c.textPrimary, fontSize:11, padding:'3px 5px', fontFamily:'inherit', outline:'none', boxSizing:'border-box', width:70 };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
        <button type="button" onClick={addRow} style={btnSm}>+ Bulan</button>
        <button type="button" onClick={() => fileRef.current?.click()} style={btnSm}>📥 Import</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" style={{ display:'none' }} onChange={handleImport} />
        <button type="button" onClick={downloadTemplate} style={btnSm}>📋 Template</button>
        {rows.length > 0 && <button type="button" onClick={() => exportToExcel(rows, projectName)} style={btnSm}>⬆ Export</button>}
        <span style={{ fontSize:10, color:c.textMuted, flex:1, textAlign:'right', minWidth:60 }}>.xlsx / .csv</span>
      </div>

      <div style={{ maxHeight:200, overflowY:'auto', border:`1px solid ${c.border}`, borderRadius:5 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
          <thead>
            <tr style={{ background:c.bgInput, position:'sticky', top:0 }}>
              {['Bulan','Plan %','Aktual %',''].map(h => (
                <th key={h} style={{ padding:'5px 8px', textAlign:'left', color:c.textMuted, fontWeight:600, fontSize:10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} style={{ padding:'14px 8px', textAlign:'center', color:c.textMuted, fontSize:11 }}>
                Belum ada data — tambah bulan, download template, atau import file
              </td></tr>
            )}
            {rows.map(r => (
              <tr key={r.yearMonth} style={{ borderBottom:`1px solid ${c.border}` }}>
                <td style={{ padding:'4px 8px', color:c.textSec, fontFamily:'monospace', fontSize:11 }}>{r.yearMonth}</td>
                <td style={{ padding:'3px 6px' }}>
                  <input type="number" min={0} max={100} step={0.01} value={r.plan ?? ''} onChange={e => setField(r.yearMonth, 'plan', e.target.value)} style={cellStyle} />
                </td>
                <td style={{ padding:'3px 6px' }}>
                  <input type="number" min={0} max={100} step={0.01} value={r.actual ?? ''} placeholder="—" onChange={e => setField(r.yearMonth, 'actual', e.target.value)} style={cellStyle} />
                </td>
                <td style={{ padding:'3px 6px' }}>
                  <button type="button" onClick={() => removeRow(r.yearMonth)} style={{ background:'none', border:'none', color:c.textMuted, cursor:'pointer', fontSize:14, padding:'0 4px', fontFamily:'inherit', lineHeight:1 }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {err && <div style={{ fontSize:11, color:'#EF4444' }}>{err}</div>}

      <div style={{ display:'flex', gap:6 }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ padding:'6px 14px', fontSize:11, fontWeight:600, borderRadius:5, border:'none', background:ACCENT, color:'#fff', cursor:'pointer', fontFamily:'inherit', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Menyimpan…' : 'Simpan S-Curve'}
        </button>
        <button type="button" onClick={() => onClose(initialRows)}
          style={{ padding:'6px 12px', fontSize:11, fontWeight:600, borderRadius:5, border:`1px solid ${c.borderInput}`, background:'transparent', color:c.textSec, cursor:'pointer', fontFamily:'inherit' }}>
          Batal
        </button>
      </div>
    </div>
  );
}

interface Props {
  project:          Project | null;
  loading:          boolean;
  slimProjects:     ProjectSlim[];
  onSelectProject:  (p: ProjectSlim) => void;
  onProjectUpdated: (p: Project) => void;
  onProjectDeleted: (id: string) => void;
}

// ── Read-only helpers ─────────────────────────────────────────────────────────
function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  const c = useColors();
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:c.textSec }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'monospace' }}>{value}%</span>
      </div>
      <div style={{ height:7, background:c.hbarTrack, borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value}%`, background:color, borderRadius:4, transition:'width 600ms ease' }} />
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  const c = useColors();
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
      <span style={{ fontSize:11, color:c.textSec }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:500, color: highlight ? '#F59E0B' : c.textPrimary, fontFamily:'monospace' }}>{value ?? '—'}</span>
    </div>
  );
}

function typeLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

// ── Edit-form atoms ───────────────────────────────────────────────────────────
function ELabel({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <div style={{ fontSize:10, fontWeight:600, color:c.textSec, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{children}</div>;
}
function EInput({ value, onChange, type = 'text', placeholder }: { value: string|number; onChange:(v:string)=>void; type?:string; placeholder?:string }) {
  const c = useColors();
  return (
    <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5,
        color:c.textPrimary, fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
  );
}
function ESelect({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  const c = useColors();
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5,
        color:c.textPrimary, fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function ETextarea({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  const c = useColors();
  return (
    <textarea value={value} placeholder={placeholder} rows={4} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5,
        color:c.textPrimary, fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
  );
}

const STATUS_OPTIONS = [
  { value: 'PRE_CONSTRUCTION', label: 'Pre-Construction' },
  { value: 'CONSTRUCTION',     label: 'Construction'     },
  { value: 'ENERGIZED',        label: 'Energized'        },
];
const ISSUE_OPTIONS = [
  { value: 'None',            label: 'None'            },
  { value: 'Land Acquisition',label: 'Land Acquisition' },
  { value: 'Permit',          label: 'Permit'          },
  { value: 'Construction',    label: 'Construction'    },
  { value: 'Funding',         label: 'Funding'         },
  { value: 'Contract',        label: 'Contract'        },
  { value: 'Engineering',     label: 'Engineering'     },
  { value: 'Force Majeure',   label: 'Force Majeure'   },
];

// ── Mini project picker ───────────────────────────────────────────────────────
function ProjectPicker({ slimProjects, value, onChange, multi = false, excludeIds = [], placeholder }: {
  slimProjects: ProjectSlim[]; value: string | string[]; onChange: (v: string | string[]) => void;
  multi?: boolean; excludeIds?: string[]; placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const c = useColors();

  const selectedIds: string[] = multi ? (value as string[]) : (value ? [value as string] : []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const results = query.trim().length >= 1
    ? slimProjects.filter(p => !excludeIds.includes(p.id) && !selectedIds.includes(p.id))
        .filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const select = (p: ProjectSlim) => {
    if (multi) { onChange([...selectedIds, p.id]); }
    else { onChange(p.id); setOpen(false); setQuery(''); }
  };
  const remove = (id: string) => { if (multi) onChange(selectedIds.filter(x => x !== id)); else onChange(''); };
  const nameOf = (id: string) => slimProjects.find(p => p.id === id)?.name ?? id.slice(0, 8) + '…';

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {selectedIds.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:5 }}>
          {selectedIds.map(id => (
            <span key={id} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:4, fontSize:10, fontWeight:500, background:ACCENT_BG, color:ACCENT, border:`1px solid ${ACCENT_BDR}` }}>
              {nameOf(id)}
              <button type="button" onClick={() => remove(id)} style={{ background:'none', border:'none', cursor:'pointer', color:ACCENT, padding:0, fontSize:12, lineHeight:1 }}>×</button>
            </span>
          ))}
        </div>
      )}
      {(multi || selectedIds.length === 0) && (
        <input type="text" value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Cari proyek…'}
          style={{ width:'100%', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5,
            color:c.textPrimary, fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
      )}
      {open && results.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 2px)', left:0, right:0, zIndex:8000,
          background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:6,
          boxShadow:'0 8px 24px rgba(0,0,0,0.18)', maxHeight:200, overflowY:'auto' }}>
          {results.map(p => (
            <div key={p.id} onClick={() => select(p)} style={{ padding:'8px 10px', cursor:'pointer', borderBottom:`1px solid ${c.border}`, fontSize:11 }}
              onMouseEnter={e => (e.currentTarget.style.background = c.hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ color:c.textPrimary, fontWeight:500 }}>{p.name}</div>
              <div style={{ color:c.textMuted, fontSize:10 }}>{p.type.replace(/_/g,' ')} · {p.province}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── S-Curve view section ──────────────────────────────────────────────────────
function SCurveSection({ projectId }: { projectId: string }) {
  const [rows,    setRows]    = useState<ProgressRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const c = useColors();

  useEffect(() => {
    setLoading(true);
    projectsApi.getProgress(projectId).then(res => setRows(res.data)).catch(() => setRows([])).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <>
      <div style={{ height:1, background:c.divider }} />
      <div style={{ padding:'14px 20px' }}>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:c.textMuted, marginBottom:10 }}>S-Curve Progress</div>
        {loading ? <div style={{ fontSize:11, color:c.textMuted }}>Memuat…</div> : <SCurveChart rows={rows ?? []} />}
      </div>
    </>
  );
}

// ── S-Curve editor section ────────────────────────────────────────────────────
function SCurveEditorSection({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [rows,    setRows]    = useState<ProgressRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const c = useColors();

  useEffect(() => {
    projectsApi.getProgress(projectId).then(res => setRows(res.data)).catch(() => setRows([])).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div style={{ fontSize:11, color:c.textMuted, padding:'8px 0' }}>Memuat S-Curve…</div>;
  return <SCurveEditor projectId={projectId} projectName={projectName} initialRows={rows ?? []} onClose={saved => setRows(saved)} />;
}

// ── Inline edit form ──────────────────────────────────────────────────────────
interface EditFormProps {
  project: Project; slimProjects: ProjectSlim[];
  onSaved: (p: Project) => void; onCancel: () => void; isAdmin: boolean;
}
function EditForm({ project, slimProjects, onSaved, onCancel, isAdmin }: EditFormProps) {
  const [status,          setStatus]         = useState<string>(project.status);
  const [issueType,       setIssueType]      = useState(project.issueType ?? 'None');
  const [plan,            setPlan]           = useState(String(project.progressPlan      ?? 0));
  const [real,            setReal]           = useState(String(project.progressRealisasi ?? 0));
  const [cod,             setCod]            = useState(project.codTargetRUPTL   ?? '');
  const [codK,            setCodK]           = useState(project.codKontraktual   ?? '');
  const [codE,            setCodE]           = useState(project.codEstimasi      ?? '');
  const [detail,          setDetail]         = useState(project.detail           ?? '');
  const [urgency,         setUrgency]        = useState<string[]>(project.urgencyCategory ?? []);
  const [lat,             setLat]            = useState(project.lat != null ? String(project.lat) : '');
  const [lng,             setLng]            = useState(project.lng != null ? String(project.lng) : '');
  const [lineFromId,      setLineFromId]     = useState<string>(project.lineFromId ?? '');
  const [lineToId,        setLineToId]       = useState<string>(project.lineToId   ?? '');
  const [relatedProjects, setRelatedProjects]= useState<string[]>(project.relatedProjects ?? []);
  const [saving,          setSaving]         = useState(false);
  const [err,             setErr]            = useState<string|null>(null);
  const c = useColors();

  const planN = parseFloat(plan) || 0;
  const realN = parseFloat(real) || 0;
  const dev   = parseFloat((realN - planN).toFixed(4));

  const toggleUrgency = (u: string) =>
    setUrgency(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const payload: Record<string, any> = {
        status, issueType,
        progressPlan: planN, progressRealisasi: realN, deviasi: dev,
        codTargetRUPTL: cod || null, codKontraktual: codK || null, codEstimasi: codE || null,
        detail: detail || null, urgencyCategory: urgency,
      };
      if (isAdmin && project.type !== 'TRANSMISSION_LINE') {
        payload.lat = parseFloat(lat) || null;
        payload.lng = parseFloat(lng) || null;
      }
      if (project.type === 'TRANSMISSION_LINE') {
        payload.lineFromId = lineFromId || null;
        payload.lineToId   = lineToId   || null;
      }
      payload.relatedProjects = relatedProjects;
      const res = await projectsApi.update(project.id, payload);
      onSaved(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const coordInput: CSSProperties = { width:'100%', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5, color:c.textPrimary, fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:14 }}>
      <div><ELabel>Status</ELabel><ESelect value={status} onChange={setStatus} options={STATUS_OPTIONS} /></div>
      <div><ELabel>Issue Type</ELabel><ESelect value={issueType} onChange={setIssueType} options={ISSUE_OPTIONS} /></div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div><ELabel>Progress Plan (%)</ELabel><EInput type="number" value={plan} onChange={setPlan} placeholder="0–100" /></div>
        <div><ELabel>Progress Realisasi (%)</ELabel><EInput type="number" value={real} onChange={setReal} placeholder="0–100" /></div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:5, background:c.bgInput, border:`1px solid ${c.border}` }}>
        <span style={{ fontSize:11, color:c.textSec }}>Deviasi</span>
        <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color: dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : c.textSec }}>
          {dev > 0 ? `+${dev}` : dev}%
        </span>
        <span style={{ fontSize:10, color: dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : c.textSec, marginLeft:4 }}>
          {dev > 0 ? '▲ Ahead' : dev < 0 ? '▼ Behind' : '● On schedule'}
        </span>
      </div>

      <div><ELabel>COD Target RUPTL</ELabel><EInput value={cod}  onChange={setCod}  placeholder="e.g. 2025-Q4" /></div>
      <div><ELabel>COD Kontraktual</ELabel><EInput value={codK} onChange={setCodK} placeholder="e.g. 2025-Q4" /></div>
      <div><ELabel>COD Estimasi</ELabel><EInput value={codE} onChange={setCodE} placeholder="e.g. 2026-Q1" /></div>

      {project.type === 'TRANSMISSION_LINE' && (
        <>
          <div>
            <ELabel>Dari (Gardu / Pembangkit Asal)</ELabel>
            <ProjectPicker slimProjects={slimProjects} value={lineFromId} onChange={v => setLineFromId(v as string)} excludeIds={lineToId ? [lineToId] : []} placeholder="Cari gardu / PLTU asal…" />
          </div>
          <div>
            <ELabel>Ke (Gardu / Pembangkit Tujuan)</ELabel>
            <ProjectPicker slimProjects={slimProjects} value={lineToId} onChange={v => setLineToId(v as string)} excludeIds={lineFromId ? [lineFromId] : []} placeholder="Cari gardu / PLTU tujuan…" />
          </div>
        </>
      )}

      <div>
        <ELabel>Proyek Terkait / Rantai Evakuasi</ELabel>
        <ProjectPicker slimProjects={slimProjects} value={relatedProjects} onChange={v => setRelatedProjects(v as string[])} multi excludeIds={[project.id]} placeholder="Cari proyek terkait…" />
      </div>

      {isAdmin && project.type !== 'TRANSMISSION_LINE' && (
        <div>
          <ELabel>Koordinat (Latitude, Longitude)</ELabel>
          <div style={{ fontSize:10, color:c.textMuted, marginBottom:6 }}>Paste dari Google Maps langsung ke kolom Latitude</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <input type="text" inputMode="decimal" value={lat} placeholder="-7.2575" onChange={e => setLat(e.target.value)}
              onPaste={e => {
                const text = e.clipboardData.getData('text').trim();
                const match = text.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
                if (match) { e.preventDefault(); setLat(match[1]); setLng(match[2]); }
              }}
              style={coordInput} />
            <input type="text" inputMode="decimal" value={lng} placeholder="112.7521" onChange={e => setLng(e.target.value)} style={coordInput} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            <span style={{ fontSize:10, color:c.textMuted }}>Latitude</span>
            <span style={{ fontSize:10, color:c.textMuted }}>Longitude</span>
          </div>
        </div>
      )}

      <div>
        <ELabel>Urgency Category</ELabel>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:2 }}>
          {URGENCY_OPTIONS.map(u => {
            const active = urgency.includes(u);
            return (
              <button key={u} type="button" onClick={() => toggleUrgency(u)} style={{
                padding:'3px 9px', borderRadius:9999, fontSize:10, fontWeight:500, cursor:'pointer',
                border:`1px solid ${active ? ACCENT_BDR : c.borderInput}`,
                background: active ? ACCENT_BG : 'transparent',
                color: active ? ACCENT : c.textSec, fontFamily:'inherit',
              }}>{u}</button>
            );
          })}
        </div>
      </div>

      <div><ELabel>Catatan / Detail</ELabel><ETextarea value={detail} onChange={setDetail} placeholder="Keterangan tambahan tentang proyek…" /></div>

      <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:12 }}>
        <ELabel>S-Curve Progress</ELabel>
        <SCurveEditorSection projectId={project.id} projectName={project.name} />
      </div>

      {err && <div style={{ fontSize:12, color:'#EF4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:5, padding:'8px 10px' }}>{err}</div>}

      <div style={{ display:'flex', gap:8, paddingBottom:8 }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ flex:1, padding:'9px 0', borderRadius:6, border:'none', fontFamily:'inherit', fontSize:12, fontWeight:600,
            background: saving ? c.hbarTrack : ACCENT, color: saving ? c.textMuted : '#fff', cursor: saving ? 'default' : 'pointer' }}>
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          style={{ padding:'9px 14px', borderRadius:6, border:`1px solid ${c.borderInput}`, background:'transparent', fontFamily:'inherit', fontSize:12, color:c.textSec, cursor:'pointer' }}>
          Batal
        </button>
      </div>
    </div>
  );
}

// ── Main DetailPanel ──────────────────────────────────────────────────────────
export default function DetailPanel({ project, loading, slimProjects, onSelectProject, onProjectUpdated, onProjectDeleted }: Props) {
  const { user } = useAuth();
  const c = useColors();
  const [mode,       setMode]       = useState<'view' | 'edit'>('view');
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const canEdit   = user?.role === 'ADMIN' || user?.role === 'PIC';
  const canDelete = user?.role === 'ADMIN';

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = (updated: Project) => { setMode('view'); onProjectUpdated(updated); showToast('Proyek berhasil diperbarui', true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectsApi.remove(project!.id);
      onProjectDeleted(project!.id);
      setConfirmDel(false);
      showToast('Proyek berhasil dihapus', true);
    } catch { showToast('Gagal menghapus proyek', false); }
    finally { setDeleting(false); }
  };

  const prevIdRef = useRef(project?.id);
  useEffect(() => {
    if (project?.id !== prevIdRef.current) {
      setMode('view');
      prevIdRef.current = project?.id;
    }
  }, [project?.id]);

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, padding:'40px 24px', background:c.bgCard }}>
        <div style={{ width:20, height:20, border:`2px solid ${c.spinnerBdr}`, borderTopColor:c.spinnerTop, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <span style={{ fontSize:12, color:c.textMuted, marginTop:8 }}>Memuat detail…</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, padding:'40px 24px', textAlign:'center', background:c.bgCard }}>
        <div style={{ fontSize:36, opacity:0.25, color:c.textMuted }}>⚡</div>
        <div style={{ fontSize:15, fontWeight:600, color:c.textSec }}>Pilih Proyek</div>
        <div style={{ fontSize:12, color:c.textMuted, lineHeight:1.5, maxWidth:200 }}>
          Klik node atau jalur transmisi pada peta untuk melihat detail proyek.
        </div>
      </div>
    );
  }

  const cfg      = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
  const dev      = project.deviasi;
  const devColor = dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : c.textSec;
  const devLabel = dev > 0 ? `+${dev}%` : `${dev}%`;
  const devText  = dev > 0 ? '▲ Ahead of schedule' : dev < 0 ? '▼ Behind schedule' : '● On schedule';

  const related = (project.relatedProjects ?? [])
    .map(id => slimProjects.find(p => p.id === id)).filter(Boolean) as ProjectSlim[];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:c.bgCard, overflow:'hidden', position:'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:'absolute', bottom:60, left:12, right:12, zIndex:100,
          padding:'10px 14px', borderRadius:6, fontSize:12, fontWeight:500,
          background: toast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: toast.ok ? '#10B981' : '#EF4444',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ padding:'16px 16px 14px', background:c.bgInput, borderBottom:`1px solid ${c.border}`, flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', color:ACCENT, textTransform:'uppercase' }}>
            {typeLabel(project.type)} · {project.subtype}
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:4, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40` }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color }} />
            {cfg.label}
          </div>
        </div>
        <div style={{ fontSize:16, fontWeight:700, color:c.textPrimary, lineHeight:1.3, marginBottom:4 }}>{project.name}</div>
        <div style={{ fontSize:11, color:ACCENT, fontFamily:'monospace', marginBottom:8, opacity:0.8 }}>{project.ruptlCode}</div>

        {(canEdit || canDelete) && (
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            {canEdit && mode === 'view' && (
              <button type="button" onClick={() => { setMode('edit'); setConfirmDel(false); }}
                style={{ flex:1, padding:'6px 0', borderRadius:5, border:`1px solid ${ACCENT_BDR}`, background:ACCENT_BG, color:ACCENT, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                ✎ Edit Proyek
              </button>
            )}
            {canEdit && mode === 'edit' && (
              <span style={{ fontSize:10, color:ACCENT, fontWeight:600, alignSelf:'center' }}>Mode Edit</span>
            )}
            {canDelete && mode === 'view' && !confirmDel && (
              <button type="button" onClick={() => setConfirmDel(true)}
                style={{ padding:'6px 12px', borderRadius:5, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)', color:'#EF4444', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                🗑 Hapus
              </button>
            )}
          </div>
        )}

        {confirmDel && (
          <div style={{ marginTop:8, padding:'10px 12px', borderRadius:6, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
            <p style={{ fontSize:12, color:'#FCA5A5', marginBottom:8, lineHeight:1.4 }}>
              Hapus <strong>{project.name}</strong>? Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style={{ display:'flex', gap:6 }}>
              <button type="button" onClick={handleDelete} disabled={deleting}
                style={{ padding:'6px 14px', borderRadius:5, border:'none', background:'#DC2626', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
              <button type="button" onClick={() => setConfirmDel(false)} disabled={deleting}
                style={{ padding:'6px 12px', borderRadius:5, border:`1px solid ${c.borderInput}`, background:'transparent', color:c.textSec, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body — read view */}
      {mode === 'view' && (
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'14px 20px' }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:c.textMuted, marginBottom:10 }}>COD Dates</div>
            <Field label="COD Target RUPTL"  value={project.codTargetRUPTL} />
            <Field label="COD Kontraktual"   value={project.codKontraktual} />
            <Field label="COD Estimasi"      value={project.codEstimasi} highlight={project.codEstimasi !== project.codKontraktual} />
          </div>

          <div style={{ height:1, background:c.divider }} />
          <div style={{ padding:'14px 20px' }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:c.textMuted, marginBottom:10 }}>Progress Fisik</div>
            <ProgressBar label="Progress Plan"      value={project.progressPlan}      color="#3B82F6" />
            <ProgressBar label="Progress Realisasi" value={project.progressRealisasi} color="#10B981" />
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
              <span style={{ fontSize:11, color:c.textSec }}>Deviasi</span>
              <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:devColor }}>{devLabel}</span>
              <span style={{ fontSize:11, color:devColor }}>{devText}</span>
            </div>
          </div>

          <div style={{ height:1, background:c.divider }} />
          <div style={{ padding:'14px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:11, color:c.textSec }}>Issue Type</span>
              <span style={{ fontSize:12, fontWeight:600, color: project.issueType === 'None' ? '#10B981' : '#EF4444' }}>{project.issueType}</span>
            </div>
          </div>

          <div style={{ height:1, background:c.divider }} />
          <div style={{ padding:'14px 20px' }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:c.textMuted, marginBottom:10 }}>Urgency Category</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {(project.urgencyCategory ?? []).map(u => (
                <span key={u} style={{ padding:'3px 8px', borderRadius:9999, fontSize:10, fontWeight:500, background:ACCENT_BG, color:ACCENT, border:`1px solid ${ACCENT_BDR}` }}>{u}</span>
              ))}
            </div>
          </div>

          {project.detail && (
            <>
              <div style={{ height:1, background:c.divider }} />
              <div style={{ padding:'14px 20px' }}>
                <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:c.textMuted, marginBottom:10 }}>Detail Informasi</div>
                <p style={{ fontSize:12, color:c.textSec, lineHeight:1.6 }}>{project.detail}</p>
              </div>
            </>
          )}

          <SCurveSection projectId={project.id} />

          {related.length > 0 && (
            <>
              <div style={{ height:1, background:c.divider }} />
              <div style={{ padding:'14px 20px' }}>
                <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:c.textMuted, marginBottom:10 }}>Rantai Evakuasi / Proyek Terkait</div>
                {related.map(rp => {
                  const rpCfg = STATUS_CONFIG[rp.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
                  return (
                    <div key={rp.id} onClick={() => onSelectProject(rp)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:6, background:c.bgInput, border:`1px solid ${c.border}`, marginBottom:6, cursor:'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = c.bgInput)}>
                      <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:rpCfg.color }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:c.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rp.name}</div>
                        <div style={{ fontSize:10, color:c.textMuted, marginTop:1 }}>{typeLabel(rp.type)} · {rpCfg.label}</div>
                      </div>
                      <span style={{ fontSize:16, color:c.textMuted, flexShrink:0 }}>›</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Body — edit view */}
      {mode === 'edit' && (
        <EditForm project={project} slimProjects={slimProjects} onSaved={handleSaved} onCancel={() => setMode('view')} isAdmin={user?.role === 'ADMIN'} />
      )}
    </div>
  );
}
