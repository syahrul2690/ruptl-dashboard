import { useState, useEffect, useCallback, CSSProperties } from 'react';
import {
  Project, ProjectStage, ProjectType,
  STAGE_CONFIG, STATUS_OPTIONS as STATUS_VALUES,
  TYPE_LABELS, URGENCY_OPTIONS, PROVINCE_OPTIONS, REGION_OPTIONS,
} from '../lib/types';
import { projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../context/ThemeContext';

const PAGE_SIZE = 25;

const ISSUE_OPTIONS = [
  'Tidak ada Issue', 'Pembebasan Lahan', 'Perizinan', 'Konstruksi',
  'Pendanaan', 'Kontrak', 'Engineering', 'Force Majeure', 'Lainnya',
];

// Columns in Excel "ALL" sheet order
type ColDef = { key: keyof Project | 'no' | 'urgensi' | 'actions'; label: string; sort?: keyof Project; width?: number; sticky?: boolean; left?: number };

const COLUMNS: ColDef[] = [
  { key: 'no',               label: 'NO.',              width: 48,  sticky: true, left: 0 },
  { key: 'name',             label: 'NAMA PROYEK',      sort: 'name',             width: 260, sticky: true, left: 48 },
  { key: 'ruptlCode',        label: 'RUPTL CODE',       sort: 'ruptlCode',        width: 120 },
  { key: 'status',           label: 'STATUS',           sort: 'status',           width: 100 },
  { key: 'stage',            label: 'ACTUAL STAGE',     sort: 'stage',            width: 170 },
  { key: 'type',             label: 'TIPE PROYEK',      sort: 'type',             width: 110 },
  { key: 'priority',         label: 'PRIORITAS',                                  width: 80  },
  { key: 'capacity',         label: 'KAPASITAS',                                  width: 90  },
  { key: 'capacityUnit',     label: 'SATUAN',                                     width: 70  },
  { key: 'province',         label: 'LOKASI',           sort: 'province',         width: 130 },
  { key: 'region',           label: 'REGION',           sort: 'region',           width: 100 },
  { key: 'gridSystem',       label: 'SISTEM KELISTRIKAN',                         width: 160 },
  { key: 'urgensi',          label: 'URGENSI',                                    width: 160 },
  { key: 'codTargetRUPTL',   label: 'COD RUPTL',        sort: 'codTargetRUPTL',   width: 100 },
  { key: 'codKontraktual',   label: 'COD KONTRAKTUAL',                            width: 130 },
  { key: 'codEstimasi',      label: 'COD ESTIMASI',                               width: 110 },
  { key: 'bpoNotes',         label: 'KETERANGAN BPO',                             width: 200 },
  { key: 'bpoLastModified',  label: 'LAST MODIFIED BPO',                          width: 140 },
  { key: 'issueType',        label: 'TIPE ISSUE',                                 width: 130 },
  { key: 'issueStrategic',   label: 'ISSUE STRATEGIS',                            width: 200 },
  { key: 'progressPlan',     label: 'RENCANA (%)',      sort: 'progressPlan',     width: 95  },
  { key: 'progressRealisasi',label: 'REALISASI (%)',    sort: 'progressRealisasi',width: 100 },
  { key: 'deviasi',          label: 'DEVIASI',          sort: 'deviasi',          width: 85  },
  { key: 'notification',     label: 'NOTIFIKASI',                                 width: 110 },
  { key: 'comment',          label: 'COMMENT',                                    width: 180 },
  { key: 'actions',          label: 'AKSI',                                       width: 100 },
];

function fmt(val: string | number | null | undefined, suffix = '') {
  if (val == null || val === '') return '—';
  return `${val}${suffix}`;
}

function fmtDate(val: string | null | undefined) {
  if (!val) return '—';
  try { return new Date(val).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'2-digit' }); }
  catch { return val; }
}

export default function DataProyekPage() {
  const { user } = useAuth();
  const c = useColors();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState<ProjectStage | ''>('');
  const [filterType, setFilterType] = useState<ProjectType | ''>('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [sortField, setSortField] = useState<keyof Project>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'PIC';
  const canDelete = user?.role === 'ADMIN';

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE, sort: sortField, order: sortDir };
      if (search)        params.search   = search;
      if (filterStage)   params.stage    = filterStage;
      if (filterType)    params.type     = filterType;
      if (filterProvince)params.province = filterProvince;
      if (filterRegion)  params.region   = filterRegion;
      const res = await projectsApi.list(params);
      setProjects(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStage, filterType, filterProvince, filterRegion, sortField, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (field: keyof Project) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startRow   = (page - 1) * PAGE_SIZE + 1;
  const endRow     = Math.min(page * PAGE_SIZE, total);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await projectsApi.remove(deleteId);
      showToast('Proyek berhasil dihapus', true);
      setDeleteId(null);
      fetchData();
    } catch {
      showToast('Gagal menghapus proyek', false);
    } finally { setDeleting(false); }
  };

  const handleEditSaved = (_updated: Project) => {
    setEditProject(null);
    showToast('Proyek berhasil diperbarui', true);
    fetchData();
  };

  const hasFilter = search || filterStage || filterType || filterProvince || filterRegion;
  const visibleCols = COLUMNS.filter(col => col.key !== 'actions' || (canEdit || canDelete));

  const thStyle = (col: ColDef): CSSProperties => ({
    padding: '9px 10px',
    textAlign: 'left',
    color: c.textMuted,
    fontWeight: 700,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: col.sort ? 'pointer' : 'default',
    userSelect: 'none',
    borderBottom: `1px solid ${c.border}`,
    borderRight: `1px solid ${c.border}`,
    whiteSpace: 'nowrap',
    width: col.width,
    minWidth: col.width,
    maxWidth: col.width,
    background: c.bgInput,
    ...(col.sticky ? { position: 'sticky', left: col.left, zIndex: 20 } : {}),
  });

  const tdBase = (col: ColDef): CSSProperties => ({
    padding: '7px 10px',
    borderBottom: `1px solid ${c.border}`,
    borderRight: `1px solid ${c.border}`,
    whiteSpace: col.key === 'name' || col.key === 'bpoNotes' || col.key === 'issueStrategic' || col.key === 'comment' ? 'normal' : 'nowrap',
    width: col.width,
    minWidth: col.width,
    maxWidth: col.width,
    overflow: col.key === 'name' || col.key === 'bpoNotes' || col.key === 'issueStrategic' || col.key === 'comment' ? 'hidden' : undefined,
    ...(col.sticky ? { position: 'sticky', left: col.left, zIndex: 10, background: c.bgCard } : {}),
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:c.bgPage }}>
      {toast && (
        <div style={{
          position:'fixed', top:70, right:20, zIndex:9999,
          padding:'10px 16px', borderRadius:6, fontSize:12, fontWeight:600,
          background: toast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: toast.ok ? '#10B981' : '#EF4444',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ padding:'14px 20px 10px', borderBottom:`1px solid ${c.border}`, background:c.bgCard, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:10 }}>
          <h1 style={{ fontSize:18, fontWeight:700, color:c.textPrimary }}>Data Proyek</h1>
          <span style={{ fontSize:11, color:c.textMuted }}>{total} proyek</span>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama, RUPTL code, provinsi…"
            style={{
              flex:'1 1 220px', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5,
              padding:'7px 10px', fontSize:12, color:c.textPrimary, fontFamily:'inherit', outline:'none',
            }}
          />
          <select value={filterStage} onChange={e => { setFilterStage(e.target.value as ProjectStage | ''); setPage(1); }}
            style={{ background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5, padding:'7px 8px', fontSize:11, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}>
            <option value="">Semua Stage</option>
            {(Object.entries(STAGE_CONFIG) as [ProjectStage, typeof STAGE_CONFIG[ProjectStage]][]).map(([v, cfg]) => (
              <option key={v} value={v}>{cfg.label}</option>
            ))}
          </select>
          <select value={filterType} onChange={e => { setFilterType(e.target.value as ProjectType | ''); setPage(1); }}
            style={{ background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5, padding:'7px 8px', fontSize:11, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}>
            <option value="">Semua Tipe</option>
            {(Object.entries(TYPE_LABELS) as [ProjectType, string][]).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select value={filterProvince} onChange={e => { setFilterProvince(e.target.value); setPage(1); }}
            style={{ background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5, padding:'7px 8px', fontSize:11, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}>
            <option value="">Semua Provinsi</option>
            {PROVINCE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setPage(1); }}
            style={{ background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5, padding:'7px 8px', fontSize:11, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}>
            <option value="">Semua Region</option>
            {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {hasFilter && (
            <button
              onClick={() => { setSearch(''); setFilterStage(''); setFilterType(''); setFilterProvince(''); setFilterRegion(''); setPage(1); }}
              style={{ padding:'7px 12px', borderRadius:5, border:`1px solid ${c.borderInput}`, background:'transparent', color:c.textSec, fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}
            >Reset</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflow:'auto' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', gap:12 }}>
            <div style={{ width:24, height:24, border:`2px solid ${c.spinnerBdr}`, borderTopColor:c.spinnerTop, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <span style={{ fontSize:12, color:c.textMuted }}>Memuat data…</span>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:c.textMuted }}>
            <span style={{ fontSize:36, opacity:0.3 }}>📋</span>
            <span style={{ fontSize:14, fontWeight:600 }}>Tidak ada data</span>
            <span style={{ fontSize:12 }}>Coba ubah filter atau tambahkan proyek baru</span>
          </div>
        ) : (
          <table style={{ borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr>
                {visibleCols.map(col => (
                  <th key={String(col.key)} onClick={col.sort ? () => handleSort(col.sort!) : undefined} style={thStyle(col)}>
                    {col.label}
                    {col.sort && sortField === col.sort && (
                      <span style={{ marginLeft:3, opacity:0.7 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const cfg = STAGE_CONFIG[p.stage] ?? STAGE_CONFIG.OBC;
                const devColor = p.deviasi > 0 ? '#10B981' : p.deviasi < 0 ? '#EF4444' : c.textSec;
                const rowNo = startRow + i;

                const cellVal = (col: ColDef): React.ReactNode => {
                  switch (col.key) {
                    case 'no':
                      return <span style={{ color:c.textMuted, fontFamily:'monospace', fontSize:10 }}>{rowNo}</span>;
                    case 'name':
                      return <span style={{ fontWeight:600, color:c.textPrimary, display:'block', maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>;
                    case 'ruptlCode':
                      return <span style={{ fontFamily:'monospace', color:c.textSec }}>{fmt(p.ruptlCode)}</span>;
                    case 'status':
                      return <span style={{ color:c.textSec }}>{fmt(p.status)}</span>;
                    case 'stage':
                      return (
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:3,
                          fontSize:10, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`,
                          whiteSpace:'nowrap',
                        }}>
                          <span style={{ width:4, height:4, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
                          {cfg.label}
                        </span>
                      );
                    case 'type':
                      return <span style={{ color:c.textSec }}>{TYPE_LABELS[p.type] ?? p.type}</span>;
                    case 'priority':
                      return <span style={{ color:c.textSec, fontFamily:'monospace' }}>{fmt(p.priority)}</span>;
                    case 'capacity':
                      return <span style={{ color:c.textSec, fontFamily:'monospace', textAlign:'right', display:'block' }}>{p.capacity != null ? p.capacity.toLocaleString('id-ID') : '—'}</span>;
                    case 'capacityUnit':
                      return <span style={{ color:c.textSec }}>{fmt(p.capacityUnit)}</span>;
                    case 'province':
                      return <span style={{ color:c.textSec }}>{fmt(p.province)}</span>;
                    case 'region':
                      return <span style={{ color:c.textSec }}>{fmt(p.region)}</span>;
                    case 'gridSystem':
                      return <span style={{ color:c.textSec }}>{fmt(p.gridSystem)}</span>;
                    case 'urgensi':
                      return (
                        <span style={{ color:c.textSec, fontSize:10, display:'block', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={(p.urgencyCategory ?? []).join(', ')}>
                          {p.urgencyCategory?.length ? p.urgencyCategory.join(', ') : '—'}
                        </span>
                      );
                    case 'codTargetRUPTL':
                      return <span style={{ color:c.textSec, fontFamily:'monospace' }}>{fmt(p.codTargetRUPTL)}</span>;
                    case 'codKontraktual':
                      return <span style={{ color:c.textSec, fontFamily:'monospace' }}>{fmt(p.codKontraktual)}</span>;
                    case 'codEstimasi':
                      return <span style={{ color:c.textSec, fontFamily:'monospace' }}>{fmt(p.codEstimasi)}</span>;
                    case 'bpoNotes':
                      return <span style={{ color:c.textSec, fontSize:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' } as CSSProperties}>{p.bpoNotes || '—'}</span>;
                    case 'bpoLastModified':
                      return <span style={{ color:c.textSec, fontFamily:'monospace', fontSize:10 }}>{fmtDate(p.bpoLastModified)}</span>;
                    case 'issueType':
                      return <span style={{ color:c.textSec }}>{fmt(p.issueType)}</span>;
                    case 'issueStrategic':
                      return <span style={{ color:c.textSec, fontSize:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' } as CSSProperties}>{p.issueStrategic || '—'}</span>;
                    case 'progressPlan':
                      return <span style={{ fontFamily:'monospace', color:c.textSec }}>{p.progressPlan}%</span>;
                    case 'progressRealisasi':
                      return <span style={{ fontFamily:'monospace', color:c.textSec }}>{p.progressRealisasi}%</span>;
                    case 'deviasi':
                      return <span style={{ fontFamily:'monospace', fontWeight:700, color:devColor }}>{p.deviasi > 0 ? `+${p.deviasi}%` : `${p.deviasi}%`}</span>;
                    case 'notification':
                      return <span style={{ color:c.textSec }}>{fmt(p.notification)}</span>;
                    case 'comment':
                      return <span style={{ color:c.textSec, fontSize:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' } as CSSProperties}>{p.comment || '—'}</span>;
                    case 'actions':
                      return (
                        <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                          {canEdit && (
                            <button onClick={() => setEditProject(p)} style={{
                              padding:'3px 9px', borderRadius:3, border:`1px solid rgba(0,139,160,0.3)`,
                              background:'rgba(0,139,160,0.08)', color:'#008BA0', fontSize:10, fontWeight:600,
                              cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
                            }}>Edit</button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteId(p.id)} style={{
                              padding:'3px 9px', borderRadius:3, border:'1px solid rgba(239,68,68,0.3)',
                              background:'rgba(239,68,68,0.06)', color:'#EF4444', fontSize:10, fontWeight:600,
                              cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
                            }}>Hapus</button>
                          )}
                        </div>
                      );
                    default:
                      return null;
                  }
                };

                return (
                  <tr key={p.id}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = c.hoverBg;
                      e.currentTarget.querySelectorAll<HTMLTableCellElement>('td[data-sticky]').forEach(td => { td.style.background = c.hoverBg; });
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.querySelectorAll<HTMLTableCellElement>('td[data-sticky]').forEach(td => { td.style.background = c.bgCard; });
                    }}
                  >
                    {visibleCols.map(col => (
                      <td key={String(col.key)} style={tdBase(col)} {...(col.sticky ? { 'data-sticky': '' } : {})}>
                        {cellVal(col)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px', borderTop:`1px solid ${c.border}`, background:c.bgCard, flexShrink:0 }}>
          <span style={{ fontSize:11, color:c.textMuted }}>
            Menampilkan {startRow}–{endRow} dari {total}
          </span>
          <div style={{ display:'flex', gap:4 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
              padding:'5px 11px', borderRadius:4, border:`1px solid ${c.borderInput}`,
              background: page <= 1 ? 'transparent' : c.bgInput, color: page <= 1 ? c.textMuted : c.textPrimary,
              fontSize:11, cursor: page <= 1 ? 'default' : 'pointer', fontFamily:'inherit', fontWeight:600, opacity: page <= 1 ? 0.5 : 1,
            }}>‹ Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pg: number;
              if (totalPages <= 5)         pg = i + 1;
              else if (page <= 3)          pg = i + 1;
              else if (page >= totalPages - 2) pg = totalPages - 4 + i;
              else                         pg = page - 2 + i;
              return (
                <button key={pg} onClick={() => setPage(pg)} style={{
                  padding:'5px 10px', borderRadius:4, border:`1px solid ${page === pg ? c.accent : c.borderInput}`,
                  background: page === pg ? c.accent : 'transparent',
                  color: page === pg ? '#fff' : c.textPrimary,
                  fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                }}>{pg}</button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
              padding:'5px 11px', borderRadius:4, border:`1px solid ${c.borderInput}`,
              background: page >= totalPages ? 'transparent' : c.bgInput, color: page >= totalPages ? c.textMuted : c.textPrimary,
              fontSize:11, cursor: page >= totalPages ? 'default' : 'pointer', fontFamily:'inherit', fontWeight:600, opacity: page >= totalPages ? 0.5 : 1,
            }}>Next ›</button>
          </div>
        </div>
      )}

      {editProject && (
        <EditModal project={editProject} onClose={() => setEditProject(null)} onSaved={handleEditSaved} />
      )}

      {deleteId && (
        <div style={{
          position:'fixed', inset:0, zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)',
        }}>
          <div style={{
            background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:10, padding:24,
            width:380, maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize:16, fontWeight:700, color:c.textPrimary, marginBottom:8 }}>Hapus Proyek?</h3>
            <p style={{ fontSize:13, color:c.textSec, lineHeight:1.5, marginBottom:20 }}>
              Tindakan ini tidak bisa dibatalkan. Semua data proyek akan dihapus permanen.
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteId(null)} disabled={deleting} style={{
                padding:'8px 16px', borderRadius:6, border:`1px solid ${c.borderInput}`,
                background:'transparent', color:c.textSec, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
              }}>Batal</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                padding:'8px 16px', borderRadius:6, border:'none',
                background:'#EF4444', color:'#fff', fontSize:12, fontWeight:600,
                cursor: deleting ? 'default' : 'pointer', fontFamily:'inherit', opacity: deleting ? 0.6 : 1,
              }}>{deleting ? 'Menghapus…' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ project, onClose, onSaved }: {
  project: Project; onClose: () => void; onSaved: (p: Project) => void;
}) {
  const c = useColors();
  const [stage, setStage] = useState<ProjectStage>(project.stage);
  const [status, setStatus] = useState(project.status ?? 'On-track');
  const [issueType, setIssueType] = useState(project.issueType ?? 'Tidak ada Issue');
  const [plan, setPlan] = useState(String(project.progressPlan ?? 0));
  const [real, setReal] = useState(String(project.progressRealisasi ?? 0));
  const [cod, setCod] = useState(project.codTargetRUPTL ?? '');
  const [codK, setCodK] = useState(project.codKontraktual ?? '');
  const [codE, setCodE] = useState(project.codEstimasi ?? '');
  const [detail, setDetail] = useState(project.detail ?? '');
  const [urgency, setUrgency] = useState<string[]>(project.urgencyCategory ?? []);
  const [lat, setLat] = useState(project.lat != null ? String(project.lat) : '');
  const [lng, setLng] = useState(project.lng != null ? String(project.lng) : '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const planN = parseFloat(plan) || 0;
  const realN = parseFloat(real) || 0;
  const dev   = parseFloat((realN - planN).toFixed(4));

  const toggleUrgency = (u: string) =>
    setUrgency(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try {
      const payload: Record<string, any> = {
        stage, status, issueType,
        progressPlan: planN, progressRealisasi: realN, deviasi: dev,
        codTargetRUPTL: cod || null, codKontraktual: codK || null, codEstimasi: codE || null,
        detail: detail || null, urgencyCategory: urgency,
      };
      if (project.type !== 'TRANS') {
        payload.lat = parseFloat(lat) || null;
        payload.lng = parseFloat(lng) || null;
      }
      const res = await projectsApi.update(project.id, payload);
      onSaved(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const inputStyle: CSSProperties = {
    width:'100%', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:5,
    color:c.textPrimary, fontSize:12, padding:'7px 10px', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  };
  const labelStyle: CSSProperties = {
    fontSize:10, fontWeight:600, color:c.textSec, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em',
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9000, display:'flex', alignItems:'flex-start', justifyContent:'center',
      background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', overflowY:'auto', paddingTop:40, paddingBottom:40,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:10, padding:24,
        width:520, maxWidth:'95vw', boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:c.textPrimary }}>Edit Proyek</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:c.textMuted, cursor:'pointer', fontSize:20, padding:'0 4px', lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, maxHeight:'65vh', overflowY:'auto', paddingRight:8 }}>
          <div><div style={labelStyle}>Stage</div>
            <select value={stage} onChange={e => setStage(e.target.value as ProjectStage)} style={inputStyle}>
              {(Object.entries(STAGE_CONFIG) as [ProjectStage, typeof STAGE_CONFIG[ProjectStage]][]).map(([v, cfg]) => (
                <option key={v} value={v}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div><div style={labelStyle}>Status Progress</div>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              {STATUS_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div><div style={labelStyle}>Issue Type</div>
            <select value={issueType} onChange={e => setIssueType(e.target.value)} style={inputStyle}>
              {ISSUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><div style={labelStyle}>Progress Plan (%)</div>
              <input type="number" min={0} max={100} step={0.01} value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle} />
            </div>
            <div><div style={labelStyle}>Progress Realisasi (%)</div>
              <input type="number" min={0} max={100} step={0.01} value={real} onChange={e => setReal(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:5, background:c.bgInput, border:`1px solid ${c.border}` }}>
            <span style={{ fontSize:11, color:c.textSec }}>Deviasi</span>
            <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color: dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : c.textSec }}>
              {dev > 0 ? `+${dev}` : dev}%
            </span>
          </div>
          <div><div style={labelStyle}>COD Target RUPTL</div>
            <input value={cod} onChange={e => setCod(e.target.value)} placeholder="e.g. 2025-Q4" style={inputStyle} />
          </div>
          <div><div style={labelStyle}>COD Kontraktual</div>
            <input value={codK} onChange={e => setCodK(e.target.value)} placeholder="e.g. 2025-Q4" style={inputStyle} />
          </div>
          <div><div style={labelStyle}>COD Estimasi</div>
            <input value={codE} onChange={e => setCodE(e.target.value)} placeholder="e.g. 2026-Q1" style={inputStyle} />
          </div>
          {project.type !== 'TRANS' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><div style={labelStyle}>Latitude</div>
                <input type="text" value={lat} onChange={e => setLat(e.target.value)} style={inputStyle} />
              </div>
              <div><div style={labelStyle}>Longitude</div>
                <input type="text" value={lng} onChange={e => setLng(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
          <div><div style={labelStyle}>Urgency Category</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {URGENCY_OPTIONS.map(u => {
                const active = urgency.includes(u);
                return (
                  <button key={u} type="button" onClick={() => toggleUrgency(u)} style={{
                    padding:'3px 9px', borderRadius:9999, fontSize:10, fontWeight:500, cursor:'pointer',
                    border:`1px solid ${active ? 'rgba(0,139,160,0.35)' : c.borderInput}`,
                    background: active ? 'rgba(0,139,160,0.10)' : 'transparent',
                    color: active ? '#008BA0' : c.textSec, fontFamily:'inherit',
                  }}>{u}</button>
                );
              })}
            </div>
          </div>
          <div><div style={labelStyle}>Catatan / Detail</div>
            <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={3} style={{ ...inputStyle, resize:'vertical' }} />
          </div>
          {err && <div style={{ fontSize:12, color:'#EF4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:5, padding:'8px 10px' }}>{err}</div>}
        </div>

        <div style={{ display:'flex', gap:8, marginTop:20, paddingTop:16, borderTop:`1px solid ${c.border}` }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex:1, padding:'9px 0', borderRadius:6, border:'none', fontFamily:'inherit', fontSize:12, fontWeight:600,
            background: saving ? c.hbarTrack : '#008BA0', color: saving ? c.textMuted : '#fff',
            cursor: saving ? 'default' : 'pointer',
          }}>{saving ? 'Menyimpan…' : 'Simpan Perubahan'}</button>
          <button onClick={onClose} disabled={saving} style={{
            padding:'9px 18px', borderRadius:6, border:`1px solid ${c.borderInput}`, background:'transparent',
            fontFamily:'inherit', fontSize:12, color:c.textSec, cursor:'pointer',
          }}>Batal</button>
        </div>
      </div>
    </div>
  );
}
