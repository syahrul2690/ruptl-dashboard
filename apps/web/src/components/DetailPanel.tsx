import { useState, CSSProperties } from 'react';
import { Project, ProjectSlim, STATUS_CONFIG, ProjectStatus, ProjectType, URGENCY_OPTIONS } from '../lib/types';
import { projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  project:           Project | null;
  loading:           boolean;
  slimProjects:      ProjectSlim[];
  onSelectProject:   (p: ProjectSlim) => void;
  onProjectUpdated:  (p: Project) => void;
  onProjectDeleted:  (id: string) => void;
}

// ── Small read-only helpers ───────────────────────────────────────────────────
function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:'#6B7280' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'monospace' }}>{value}%</span>
      </div>
      <div style={{ height:7, background:'#1F2937', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value}%`, background:color, borderRadius:4, transition:'width 600ms ease' }} />
      </div>
    </div>
  );
}
function Field({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
      <span style={{ fontSize:11, color:'#6B7280' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:500, color: highlight ? '#F59E0B' : '#E5E7EB', fontFamily:'monospace' }}>{value ?? '—'}</span>
    </div>
  );
}
function typeLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Edit-form atoms ───────────────────────────────────────────────────────────
function ELabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:10, fontWeight:600, color:'#6B7280', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{children}</div>;
}
function EInput({ value, onChange, type='text', placeholder }: {
  value: string|number; onChange:(v:string)=>void; type?:string; placeholder?:string;
}) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:'#0D1526', border:'1px solid #374151', borderRadius:5,
        color:'#E5E7EB', fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
  );
}
function ESelect({ value, onChange, options }: {
  value: string; onChange:(v:string)=>void;
  options: {value:string; label:string}[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:'#0D1526', border:'1px solid #374151', borderRadius:5,
        color:'#E5E7EB', fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function ETextarea({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <textarea value={value} placeholder={placeholder} rows={4} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:'#0D1526', border:'1px solid #374151', borderRadius:5,
        color:'#E5E7EB', fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none',
        resize:'vertical', boxSizing:'border-box' }} />
  );
}

const STATUS_OPTIONS = [
  { value: 'PRE_CONSTRUCTION', label: 'Pre-Construction' },
  { value: 'CONSTRUCTION',     label: 'Construction'     },
  { value: 'ENERGIZED',        label: 'Energized'        },
];
const ISSUE_OPTIONS = [
  { value: 'None',                     label: 'None'                   },
  { value: 'Land Acquisition',         label: 'Land Acquisition'       },
  { value: 'Permit',                   label: 'Permit'                 },
  { value: 'Construction',             label: 'Construction'           },
  { value: 'Funding',                  label: 'Funding'                },
  { value: 'Contract',                 label: 'Contract'               },
  { value: 'Engineering',              label: 'Engineering'            },
  { value: 'Force Majeure',            label: 'Force Majeure'          },
];

// ── Inline edit form ──────────────────────────────────────────────────────────
interface EditFormProps {
  project:    Project;
  onSaved:    (p: Project) => void;
  onCancel:   () => void;
}
function EditForm({ project, onSaved, onCancel }: EditFormProps) {
  const [status,     setStatus]     = useState<string>(project.status);
  const [issueType,  setIssueType]  = useState(project.issueType ?? 'None');
  const [plan,       setPlan]       = useState(String(project.progressPlan      ?? 0));
  const [real,       setReal]       = useState(String(project.progressRealisasi ?? 0));
  const [cod,        setCod]        = useState(project.codTargetRUPTL   ?? '');
  const [codK,       setCodK]       = useState(project.codKontraktual   ?? '');
  const [codE,       setCodE]       = useState(project.codEstimasi      ?? '');
  const [detail,     setDetail]     = useState(project.detail           ?? '');
  const [urgency,    setUrgency]    = useState<string[]>(project.urgencyCategory ?? []);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState<string|null>(null);

  const planN = parseInt(plan)  || 0;
  const realN = parseInt(real)  || 0;
  const dev   = realN - planN;

  const toggleUrgency = (u: string) =>
    setUrgency(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const payload = {
        status, issueType,
        progressPlan:      planN,
        progressRealisasi: realN,
        deviasi:           dev,
        codTargetRUPTL:    cod  || null,
        codKontraktual:    codK || null,
        codEstimasi:       codE || null,
        detail:            detail || null,
        urgencyCategory:   urgency,
      };
      const res = await projectsApi.update(project.id, payload);
      onSaved(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:14 }}>

      {/* Status */}
      <div>
        <ELabel>Status</ELabel>
        <ESelect value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </div>

      {/* Issue Type */}
      <div>
        <ELabel>Issue Type</ELabel>
        <ESelect value={issueType} onChange={setIssueType} options={ISSUE_OPTIONS} />
      </div>

      {/* Progress */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <ELabel>Progress Plan (%)</ELabel>
          <EInput type="number" value={plan} onChange={setPlan} placeholder="0–100" />
        </div>
        <div>
          <ELabel>Progress Realisasi (%)</ELabel>
          <EInput type="number" value={real} onChange={setReal} placeholder="0–100" />
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:5, background:'#0D1526', border:'1px solid #1F2937' }}>
        <span style={{ fontSize:11, color:'#6B7280' }}>Deviasi</span>
        <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace',
          color: dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : '#9CA3AF' }}>
          {dev > 0 ? `+${dev}` : dev}%
        </span>
        <span style={{ fontSize:10, color: dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : '#9CA3AF', marginLeft:4 }}>
          {dev > 0 ? '▲ Ahead' : dev < 0 ? '▼ Behind' : '● On schedule'}
        </span>
      </div>

      {/* COD Dates */}
      <div>
        <ELabel>COD Target RUPTL</ELabel>
        <EInput value={cod}  onChange={setCod}  placeholder="e.g. 2025-Q4" />
      </div>
      <div>
        <ELabel>COD Kontraktual</ELabel>
        <EInput value={codK} onChange={setCodK} placeholder="e.g. 2025-Q4" />
      </div>
      <div>
        <ELabel>COD Estimasi</ELabel>
        <EInput value={codE} onChange={setCodE} placeholder="e.g. 2026-Q1" />
      </div>

      {/* Urgency */}
      <div>
        <ELabel>Urgency Category</ELabel>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:2 }}>
          {URGENCY_OPTIONS.map(u => {
            const active = urgency.includes(u);
            return (
              <button key={u} type="button" onClick={() => toggleUrgency(u)} style={{
                padding:'3px 9px', borderRadius:9999, fontSize:10, fontWeight:500, cursor:'pointer',
                border:`1px solid ${active ? 'rgba(14,145,165,0.5)' : '#374151'}`,
                background: active ? 'rgba(14,145,165,0.12)' : 'transparent',
                color: active ? '#0E91A5' : '#6B7280', fontFamily:'inherit',
              }}>{u}</button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div>
        <ELabel>Catatan / Detail</ELabel>
        <ETextarea value={detail} onChange={setDetail} placeholder="Keterangan tambahan tentang proyek…" />
      </div>

      {err && <div style={{ fontSize:12, color:'#EF4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:5, padding:'8px 10px' }}>{err}</div>}

      {/* Action buttons */}
      <div style={{ display:'flex', gap:8, paddingBottom:8 }}>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ flex:1, padding:'9px 0', borderRadius:6, border:'none', fontFamily:'inherit', fontSize:12, fontWeight:600,
            background: saving ? '#1F2937' : '#0E91A5', color: saving ? '#6B7280' : '#fff', cursor: saving ? 'default' : 'pointer' }}>
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          style={{ padding:'9px 14px', borderRadius:6, border:'1px solid #374151', background:'transparent',
            fontFamily:'inherit', fontSize:12, color:'#9CA3AF', cursor:'pointer' }}>
          Batal
        </button>
      </div>
    </div>
  );
}

// ── Main DetailPanel ──────────────────────────────────────────────────────────
export default function DetailPanel({ project, loading, slimProjects, onSelectProject, onProjectUpdated, onProjectDeleted }: Props) {
  const { user } = useAuth();
  const [mode,        setMode]        = useState<'view' | 'edit'>('view');
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const canEdit   = user?.role === 'ADMIN' || user?.role === 'PIC';
  const canDelete = user?.role === 'ADMIN';

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaved = (updated: Project) => {
    setMode('view');
    onProjectUpdated(updated);
    showToast('Proyek berhasil diperbarui', true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectsApi.remove(project!.id);
      onProjectDeleted(project!.id);
      setConfirmDel(false);
      showToast('Proyek berhasil dihapus', true);
    } catch {
      showToast('Gagal menghapus proyek', false);
    } finally {
      setDeleting(false);
    }
  };

  // Reset mode when selected project changes
  const prevId = project?.id;
  if (mode === 'edit' && project?.id !== prevId) setMode('view');

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={d.empty}>
        <div style={{ width:20, height:20, border:'2px solid #374151', borderTopColor:'#0E91A5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <span style={{ fontSize:12, color:'#4B5563', marginTop:8 }}>Memuat detail…</span>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div style={d.empty}>
        <div style={{ fontSize:36, opacity:0.3 }}>⚡</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#4B5563' }}>Pilih Proyek</div>
        <div style={{ fontSize:12, color:'#374151', lineHeight:1.5, maxWidth:200, textAlign:'center' }}>
          Klik node atau jalur transmisi pada peta untuk melihat detail proyek.
        </div>
      </div>
    );
  }

  const cfg      = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
  const dev      = project.deviasi;
  const devColor = dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : '#9CA3AF';
  const devLabel = dev > 0 ? `+${dev}%` : `${dev}%`;
  const devText  = dev > 0 ? '▲ Ahead of schedule' : dev < 0 ? '▼ Behind schedule' : '● On schedule';

  const related = (project.relatedProjects ?? [])
    .map(id => slimProjects.find(p => p.id === id))
    .filter(Boolean) as ProjectSlim[];

  return (
    <div style={d.panel}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:'absolute', bottom:60, left:12, right:12, zIndex:100,
          padding:'10px 14px', borderRadius:6, fontSize:12, fontWeight:500,
          background: toast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: toast.ok ? '#10B981' : '#EF4444',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>{toast.msg}</div>
      )}

      {/* Header — always visible */}
      <div style={d.header}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', color:'#0E91A5', textTransform:'uppercase' }}>
            {typeLabel(project.type)} · {project.subtype}
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:4, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40` }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color }} />
            {cfg.label}
          </div>
        </div>
        <div style={{ fontSize:16, fontWeight:700, color:'#F9FAFB', lineHeight:1.3, marginBottom:4 }}>{project.name}</div>
        <div style={{ fontSize:11, color:'#1BAFC4', fontFamily:'monospace', marginBottom:8 }}>{project.ruptlCode}</div>

        {/* Action buttons row */}
        {(canEdit || canDelete) && (
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            {canEdit && mode === 'view' && (
              <button type="button" onClick={() => { setMode('edit'); setConfirmDel(false); }}
                style={d.btnEdit}>
                ✎ Edit Proyek
              </button>
            )}
            {canEdit && mode === 'edit' && (
              <span style={{ fontSize:10, color:'#0E91A5', fontWeight:600, alignSelf:'center' }}>Mode Edit</span>
            )}
            {canDelete && mode === 'view' && !confirmDel && (
              <button type="button" onClick={() => setConfirmDel(true)} style={d.btnDel}>
                🗑 Hapus
              </button>
            )}
          </div>
        )}

        {/* Delete confirmation inline */}
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
                style={{ padding:'6px 12px', borderRadius:5, border:'1px solid #374151', background:'transparent', color:'#9CA3AF', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body — read view */}
      {mode === 'view' && (
        <div style={d.body}>
          <div style={d.section}>
            <div style={d.sTitle}>COD Dates</div>
            <Field label="COD Target RUPTL"  value={project.codTargetRUPTL} />
            <Field label="COD Kontraktual"   value={project.codKontraktual} />
            <Field label="COD Estimasi"      value={project.codEstimasi} highlight={project.codEstimasi !== project.codKontraktual} />
          </div>

          <div style={d.divider} />

          <div style={d.section}>
            <div style={d.sTitle}>Progress Fisik</div>
            <ProgressBar label="Progress Plan"      value={project.progressPlan}      color="#3B82F6" />
            <ProgressBar label="Progress Realisasi" value={project.progressRealisasi} color="#10B981" />
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
              <span style={{ fontSize:11, color:'#6B7280' }}>Deviasi</span>
              <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:devColor }}>{devLabel}</span>
              <span style={{ fontSize:11, color:devColor }}>{devText}</span>
            </div>
          </div>

          <div style={d.divider} />

          <div style={d.section}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:11, color:'#6B7280' }}>Issue Type</span>
              <span style={{ fontSize:12, fontWeight:600, color: project.issueType === 'None' ? '#10B981' : '#EF4444' }}>
                {project.issueType}
              </span>
            </div>
          </div>

          <div style={d.divider} />

          <div style={d.section}>
            <div style={d.sTitle}>Urgency Category</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {(project.urgencyCategory ?? []).map(u => (
                <span key={u} style={{ padding:'3px 8px', borderRadius:9999, fontSize:10, fontWeight:500, background:'rgba(14,145,165,0.1)', color:'#0E91A5', border:'1px solid rgba(14,145,165,0.3)' }}>
                  {u}
                </span>
              ))}
            </div>
          </div>

          {project.detail && (
            <>
              <div style={d.divider} />
              <div style={d.section}>
                <div style={d.sTitle}>Detail Informasi</div>
                <p style={{ fontSize:12, color:'#9CA3AF', lineHeight:1.6 }}>{project.detail}</p>
              </div>
            </>
          )}

          {related.length > 0 && (
            <>
              <div style={d.divider} />
              <div style={d.section}>
                <div style={d.sTitle}>Rantai Evakuasi / Proyek Terkait</div>
                {related.map(rp => {
                  const rpCfg = STATUS_CONFIG[rp.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
                  return (
                    <div key={rp.id} onClick={() => onSelectProject(rp)} style={d.relCard}>
                      <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:rpCfg.color }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:'#E5E7EB', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rp.name}</div>
                        <div style={{ fontSize:10, color:'#4B5563', marginTop:1 }}>{typeLabel(rp.type)} · {rpCfg.label}</div>
                      </div>
                      <span style={{ fontSize:16, color:'#374151', flexShrink:0 }}>›</span>
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
        <EditForm
          project={project}
          onSaved={handleSaved}
          onCancel={() => setMode('view')}
        />
      )}
    </div>
  );
}

const d: Record<string, CSSProperties> = {
  panel:   { display:'flex', flexDirection:'column', height:'100%', background:'#111827', overflow:'hidden', position:'relative' },
  empty:   { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, padding:'40px 24px', textAlign:'center' },
  header:  { padding:'16px 16px 14px', background:'#0D1526', borderBottom:'1px solid #1F2937', flexShrink:0 },
  body:    { flex:1, overflowY:'auto', padding:0 },
  section: { padding:'14px 20px' },
  sTitle:  { fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#4B5563', marginBottom:10 },
  divider: { height:1, background:'#1F2937' },
  relCard: { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:6, background:'#0D1526', border:'1px solid #1F2937', marginBottom:6, cursor:'pointer' },
  btnEdit: { flex:1, padding:'6px 0', borderRadius:5, border:'1px solid rgba(14,145,165,0.4)', background:'rgba(14,145,165,0.08)',
             color:'#0E91A5', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
  btnDel:  { padding:'6px 12px', borderRadius:5, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)',
             color:'#EF4444', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
};
