import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { Project, ProjectStage, ProjectType, STAGE_CONFIG, STATUS_OPTIONS as STATUS_VALUES, TYPE_LABELS, URGENCY_OPTIONS, PROVINCE_OPTIONS } from '../lib/types';
import { projectsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../context/ThemeContext';

const PAGE_SIZE = 25;

const ISSUE_OPTIONS = [
  { value: 'Tidak ada Issue',  label: 'Tidak ada Issue'  },
  { value: 'Pembebasan Lahan', label: 'Pembebasan Lahan' },
  { value: 'Perizinan',        label: 'Perizinan'        },
  { value: 'Konstruksi',       label: 'Konstruksi'       },
  { value: 'Pendanaan',        label: 'Pendanaan'        },
  { value: 'Kontrak',          label: 'Kontrak'          },
  { value: 'Engineering',      label: 'Engineering'      },
  { value: 'Force Majeure',    label: 'Force Majeure'    },
  { value: 'Lainnya',          label: 'Lainnya'          },
];

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
      const params: Record<string, any> = {
        page,
        limit: PAGE_SIZE,
        sort: sortField,
        order: sortDir,
      };
      if (search) params.search = search;
      if (filterStage) params.stage = filterStage;
      if (filterType) params.type = filterType;
      if (filterProvince) params.province = filterProvince;

      const res = await projectsApi.list(params);
      setProjects(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStage, filterType, filterProvince, sortField, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startRow = (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, total);

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
    } finally {
      setDeleting(false);
    }
  };

  const handleEditSaved = (_updated: Project) => {
    setEditProject(null);
    showToast('Proyek berhasil diperbarui', true);
    fetchData();
  };

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
      <div style={{ padding:'16px 24px 12px', borderBottom:`1px solid ${c.border}`, background:c.bgCard }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:12 }}>
          <h1 style={{ fontSize:20, fontWeight:700, color:c.textPrimary }}>Data Proyek</h1>
          <span style={{ fontSize:12, color:c.textMuted }}>{total} proyek</span>
        </div>

        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama, RUPTL code, provinsi…"
            style={{
              flex:'1 1 280px', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:6,
              padding:'8px 12px', fontSize:12, color:c.textPrimary, fontFamily:'inherit', outline:'none',
            }}
          />
          <select
            value={filterStage}
            onChange={e => { setFilterStage(e.target.value as ProjectStage | ''); setPage(1); }}
            style={{ background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:6, padding:'8px 10px', fontSize:12, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}
          >
            <option value="">Semua Stage</option>
            {(Object.entries(STAGE_CONFIG) as [ProjectStage, typeof STAGE_CONFIG[ProjectStage]][]).map(([v, cfg]) => (
              <option key={v} value={v}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value as ProjectType | ''); setPage(1); }}
            style={{ background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:6, padding:'8px 10px', fontSize:12, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}
          >
            <option value="">Semua Tipe</option>
            {(Object.entries(TYPE_LABELS) as [ProjectType, string][]).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select
            value={filterProvince}
            onChange={e => { setFilterProvince(e.target.value); setPage(1); }}
            style={{ background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:6, padding:'8px 10px', fontSize:12, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}
          >
            <option value="">Semua Provinsi</option>
            {PROVINCE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(search || filterStage || filterType || filterProvince) && (
            <button
              onClick={() => { setSearch(''); setFilterStage(''); setFilterType(''); setFilterProvince(''); setPage(1); }}
              style={{ padding:'8px 14px', borderRadius:6, border:`1px solid ${c.borderInput}`, background:'transparent', color:c.textSec, fontSize:12, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}
            >Reset</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflow:'auto', padding:0 }}>
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
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:c.bgInput, position:'sticky', top:0, zIndex:10 }}>
                {[
                  { key: 'ruptlCode'         as keyof Project, label: 'RUPTL Code' },
                  { key: 'name'              as keyof Project, label: 'Nama Proyek' },
                  { key: 'type'              as keyof Project, label: 'Tipe' },
                  { key: 'province'          as keyof Project, label: 'Provinsi' },
                  { key: 'stage'             as keyof Project, label: 'Stage' },
                  { key: 'status'            as keyof Project, label: 'Status' },
                  { key: 'progressPlan'      as keyof Project, label: 'Plan %' },
                  { key: 'progressRealisasi' as keyof Project, label: 'Real %' },
                  { key: 'deviasi'           as keyof Project, label: 'Deviasi' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      padding:'10px 12px', textAlign:'left', color:c.textMuted, fontWeight:600, fontSize:10,
                      textTransform:'uppercase', letterSpacing:'0.06em', cursor:'pointer', userSelect:'none',
                      borderBottom:`1px solid ${c.border}`, whiteSpace:'nowrap',
                    }}
                  >
                    {col.label}
                    {sortField === col.key && <span style={{ marginLeft:4, opacity:0.6 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                  </th>
                ))}
                {(canEdit || canDelete) && (
                  <th style={{ padding:'10px 12px', textAlign:'center', color:c.textMuted, fontWeight:600, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:`1px solid ${c.border}` }}>Aksi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const cfg = STAGE_CONFIG[p.stage] ?? STAGE_CONFIG.OBC;
                const devColor = p.deviasi > 0 ? '#10B981' : p.deviasi < 0 ? '#EF4444' : c.textSec;
                return (
                  <tr key={p.id} style={{ borderBottom:`1px solid ${c.border}`, transition:'background 100ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding:'8px 12px', fontFamily:'monospace', fontSize:11, color:c.textSec, whiteSpace:'nowrap' }}>{p.ruptlCode}</td>
                    <td style={{ padding:'8px 12px', fontWeight:500, color:c.textPrimary, maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</td>
                    <td style={{ padding:'8px 12px', color:c.textSec, whiteSpace:'nowrap' }}>{TYPE_LABELS[p.type] ?? p.type}</td>
                    <td style={{ padding:'8px 12px', color:c.textSec, whiteSpace:'nowrap' }}>{p.province}</td>
                    <td style={{ padding:'8px 12px', whiteSpace:'nowrap' }}>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:4,
                        fontSize:10, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40`,
                      }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:cfg.color }} />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding:'8px 12px', color:c.textSec, whiteSpace:'nowrap', fontSize:11 }}>{p.status}</td>
                    <td style={{ padding:'8px 12px', fontFamily:'monospace', fontSize:11, color:c.textSec }}>{p.progressPlan}%</td>
                    <td style={{ padding:'8px 12px', fontFamily:'monospace', fontSize:11, color:c.textSec }}>{p.progressRealisasi}%</td>
                    <td style={{ padding:'8px 12px', fontFamily:'monospace', fontSize:11, fontWeight:700, color:devColor }}>
                      {p.deviasi > 0 ? `+${p.deviasi}%` : `${p.deviasi}%`}
                    </td>
                    {(canEdit || canDelete) && (
                      <td style={{ padding:'8px 12px', textAlign:'center', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                          {canEdit && (
                            <button onClick={() => setEditProject(p)} style={{
                              padding:'3px 10px', borderRadius:4, border:`1px solid rgba(0,139,160,0.3)`,
                              background:'rgba(0,139,160,0.08)', color:'#008BA0', fontSize:10, fontWeight:600,
                              cursor:'pointer', fontFamily:'inherit',
                            }}>Edit</button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleteId(p.id)} style={{
                              padding:'3px 10px', borderRadius:4, border:'1px solid rgba(239,68,68,0.3)',
                              background:'rgba(239,68,68,0.06)', color:'#EF4444', fontSize:10, fontWeight:600,
                              cursor:'pointer', fontFamily:'inherit',
                            }}>Hapus</button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 24px', borderTop:`1px solid ${c.border}`, background:c.bgCard, flexShrink:0 }}>
          <span style={{ fontSize:11, color:c.textMuted }}>
            Menampilkan {startRow}–{endRow} dari {total}
          </span>
          <div style={{ display:'flex', gap:4 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
              padding:'5px 12px', borderRadius:5, border:`1px solid ${c.borderInput}`,
              background: page <= 1 ? 'transparent' : c.bgInput, color: page <= 1 ? c.textMuted : c.textPrimary,
              fontSize:11, cursor: page <= 1 ? 'default' : 'pointer', fontFamily:'inherit', fontWeight:600,
              opacity: page <= 1 ? 0.5 : 1,
            }}>‹ Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pg: number;
              if (totalPages <= 5) {
                pg = i + 1;
              } else if (page <= 3) {
                pg = i + 1;
              } else if (page >= totalPages - 2) {
                pg = totalPages - 4 + i;
              } else {
                pg = page - 2 + i;
              }
              return (
                <button key={pg} onClick={() => setPage(pg)} style={{
                  padding:'5px 10px', borderRadius:5, border:`1px solid ${page === pg ? c.accent : c.borderInput}`,
                  background: page === pg ? c.accent : 'transparent',
                  color: page === pg ? '#fff' : c.textPrimary,
                  fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                }}>{pg}</button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
              padding:'5px 12px', borderRadius:5, border:`1px solid ${c.borderInput}`,
              background: page >= totalPages ? 'transparent' : c.bgInput, color: page >= totalPages ? c.textMuted : c.textPrimary,
              fontSize:11, cursor: page >= totalPages ? 'default' : 'pointer', fontFamily:'inherit', fontWeight:600,
              opacity: page >= totalPages ? 0.5 : 1,
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
                background:'transparent', color:c.textSec, fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
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
  const dev = parseFloat((realN - planN).toFixed(4));

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
  const labelStyle: CSSProperties = { fontSize:10, fontWeight:600, color:c.textSec, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' };

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
              {ISSUE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
