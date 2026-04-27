import { useState, useEffect, CSSProperties } from 'react';
import { usersApi, auditApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Role } from '../lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserRow {
  id:        string;
  email:     string;
  name:      string;
  role:      Role;
  isActive:  boolean;
  createdAt: string;
}

interface AuditRow {
  id:        string;
  userEmail: string;
  action:    string;
  entity:    string;
  entityId?: string;
  diff?:     Record<string, any>;
  ip?:       string;
  createdAt: string;
}

// ── Shared atoms ──────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={a.label}>{children}</div>;
}
function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={a.input} />;
}
function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={a.select}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display:'flex', flexDirection:'column', gap:5 }}><Label>{label}</Label>{children}</div>;
}
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position:'fixed', bottom:24, right:24, zIndex:9999, cursor:'pointer',
      background: type === 'success' ? '#065F46' : '#7F1D1D',
      border:`1px solid ${type === 'success' ? '#10B981' : '#EF4444'}`,
      color: type === 'success' ? '#A7F3D0' : '#FCA5A5',
      padding:'10px 18px', borderRadius:8, fontSize:13, fontWeight:500,
      boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
    }}>
      {message}
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: 'ADMIN',      label: 'Admin' },
  { value: 'PIC',        label: 'PIC' },
  { value: 'MANAGEMENT', label: 'Management' },
];
const ROLE_COLORS: Record<Role, string> = {
  ADMIN:      '#EF4444',
  PIC:        '#F59E0B',
  MANAGEMENT: '#3B82F6',
};

function RoleBadge({ role }: { role: Role }) {
  const color = ROLE_COLORS[role] ?? '#6B7280';
  return (
    <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700, background:`${color}20`, color, border:`1px solid ${color}40`, fontFamily:'monospace', letterSpacing:'0.05em' }}>
      {role}
    </span>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ email:'', name:'', password:'', role:'PIC' as Role });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (f: string) => (v: string) => setForm(p => ({ ...p, [f]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.name || !form.password) { setErr('Semua field wajib diisi'); return; }
    setSaving(true); setErr('');
    try {
      await usersApi.create(form);
      onCreated();
      onClose();
    } catch (ex: any) {
      const msg = ex?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Gagal membuat user'));
    } finally { setSaving(false); }
  };

  return (
    <div style={a.overlay} onClick={onClose}>
      <div style={a.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#F9FAFB' }}>Buat User Baru</div>
          <button onClick={onClose} style={a.closeBtn}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {err && <div style={a.errBox}>{err}</div>}
          <Field label="Nama Lengkap">
            <Input value={form.name} onChange={set('name')} placeholder="Nama User" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} placeholder="user@pln.local" />
          </Field>
          <Field label="Password">
            <Input type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 karakter" />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={v => setForm(p => ({ ...p, role: v as Role }))} options={ROLE_OPTIONS} />
          </Field>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={a.btnSecondary}>Batal</button>
            <button type="submit" disabled={saving} style={saving ? a.btnDisabled : a.btnPrimary}>
              {saving ? 'Menyimpan…' : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onUpdated }: { user: UserRow; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({ name: user.name, role: user.role, password:'' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (f: string) => (v: string) => setForm(p => ({ ...p, [f]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const payload: Record<string, any> = { name: form.name, role: form.role };
      if (form.password) payload.password = form.password;
      await usersApi.update(user.id, payload);
      onUpdated();
      onClose();
    } catch (ex: any) {
      const msg = ex?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Gagal memperbarui user'));
    } finally { setSaving(false); }
  };

  return (
    <div style={a.overlay} onClick={onClose}>
      <div style={a.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#F9FAFB' }}>Edit User</div>
          <button onClick={onClose} style={a.closeBtn}>✕</button>
        </div>
        <div style={{ fontSize:11, color:'#4B5563', fontFamily:'monospace', marginBottom:16 }}>{user.email}</div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {err && <div style={a.errBox}>{err}</div>}
          <Field label="Nama Lengkap">
            <Input value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={v => setForm(p => ({ ...p, role: v as Role }))} options={ROLE_OPTIONS} />
          </Field>
          <Field label="Password Baru (opsional)">
            <Input type="password" value={form.password} onChange={set('password')} placeholder="Kosongkan jika tidak diubah" />
          </Field>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onClose} style={a.btnSecondary}>Batal</button>
            <button type="submit" disabled={saving} style={saving ? a.btnDisabled : a.btnPrimary}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const { user: me } = useAuth();
  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<UserRow | null>(null);
  const [toast,       setToast]       = useState<{ message: string; type: 'success'|'error' } | null>(null);
  const [toggling,    setToggling]    = useState<string | null>(null);

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = () => {
    setLoading(true);
    usersApi.list()
      .then(res => setUsers(res.data))
      .catch(() => showToast('Gagal memuat daftar user', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleActive = async (u: UserRow) => {
    setToggling(u.id);
    try {
      await usersApi.update(u.id, { isActive: !u.isActive });
      showToast(`${u.name} ${!u.isActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      load();
    } catch {
      showToast('Gagal mengubah status', 'error');
    } finally { setToggling(null); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { load(); showToast('User berhasil dibuat', 'success'); }} />}
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onUpdated={() => { load(); showToast('User berhasil diperbarui', 'success'); }} />}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:12, color:'#4B5563' }}>{users.length} user terdaftar</div>
        <button onClick={() => setShowCreate(true)} style={a.btnPrimary}>+ User Baru</button>
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', gap:10, color:'#4B5563' }}>
          <div style={a.spinner} /> Memuat…
        </div>
      ) : (
        <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid #1F2937' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#0D1526' }}>
                {['Nama','Email','Role','Status','Bergabung','Aksi'].map(h => (
                  <th key={h} style={a.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom:'1px solid #111827', opacity: u.isActive ? 1 : 0.5 }}>
                  <td style={a.td}>
                    <div style={{ fontWeight:600, color:'#E5E7EB' }}>{u.name}</div>
                  </td>
                  <td style={{ ...a.td, fontFamily:'monospace', color:'#9CA3AF' }}>{u.email}</td>
                  <td style={a.td}><RoleBadge role={u.role} /></td>
                  <td style={a.td}>
                    <span style={{ fontSize:10, fontWeight:600, color: u.isActive ? '#10B981' : '#6B7280' }}>
                      {u.isActive ? '● Aktif' : '○ Nonaktif'}
                    </span>
                  </td>
                  <td style={{ ...a.td, color:'#4B5563', fontFamily:'monospace' }}>
                    {new Date(u.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td style={a.td}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setEditTarget(u)} style={a.btnMini}>Edit</button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={toggling === u.id}
                          style={{ ...a.btnMini, color: u.isActive ? '#EF4444' : '#10B981', borderColor: u.isActive ? '#EF444440' : '#10B98140' }}
                        >
                          {toggling === u.id ? '…' : u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────
const ACTION_COLORS: Record<string, string> = {
  CREATE: '#10B981', UPDATE: '#F59E0B', DELETE: '#EF4444',
  LOGIN: '#3B82F6', LOGIN_FAIL: '#EF4444', LOGOUT: '#6B7280',
  IMPORT: '#8B5CF6',
};

function AuditTab() {
  const [logs,    setLogs]    = useState<AuditRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [entity,  setEntity]  = useState('');
  const [expanded,setExpanded]= useState<string | null>(null);
  const LIMIT = 50;

  const load = (p = 1, ent = entity) => {
    setLoading(true);
    const params: Record<string,any> = { page: p, limit: LIMIT };
    if (ent) params.entity = ent;
    auditApi.list(params)
      .then(res => { setLogs(res.data.data); setTotal(res.data.total); setPage(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, entity); }, [entity]);

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {/* Filters */}
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <span style={a.filterLabel}>ENTITY</span>
        {['', 'Project', 'User', 'Auth'].map(e => (
          <button key={e} onClick={() => setEntity(e)} style={{
            ...a.pill,
            background:  entity === e ? 'rgba(14,145,165,0.15)' : 'transparent',
            color:       entity === e ? '#0E91A5' : '#6B7280',
            borderColor: entity === e ? 'rgba(14,145,165,0.5)' : '#374151',
          }}>
            {e || 'Semua'}
          </button>
        ))}
        <span style={{ marginLeft:'auto', fontSize:11, color:'#4B5563' }}>
          {total.toLocaleString()} entri
        </span>
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px', gap:10, color:'#4B5563' }}>
          <div style={a.spinner} /> Memuat…
        </div>
      ) : (
        <>
          <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid #1F2937' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'#0D1526' }}>
                  {['Waktu','User','Action','Entity','Entity ID','IP','Diff'].map(h => (
                    <th key={h} style={a.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <>
                    <tr key={log.id} style={{ borderBottom:'1px solid #111827' }}>
                      <td style={{ ...a.td, fontFamily:'monospace', color:'#4B5563', whiteSpace:'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' })}
                      </td>
                      <td style={{ ...a.td, color:'#9CA3AF', fontFamily:'monospace' }}>{log.userEmail}</td>
                      <td style={a.td}>
                        <span style={{
                          padding:'2px 7px', borderRadius:3, fontSize:10, fontWeight:700, fontFamily:'monospace',
                          background:`${ACTION_COLORS[log.action] ?? '#6B7280'}20`,
                          color: ACTION_COLORS[log.action] ?? '#6B7280',
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ ...a.td, color:'#E5E7EB', fontWeight:500 }}>{log.entity}</td>
                      <td style={{ ...a.td, fontFamily:'monospace', color:'#0E91A5', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {log.entityId ?? '—'}
                      </td>
                      <td style={{ ...a.td, fontFamily:'monospace', color:'#4B5563' }}>{log.ip ?? '—'}</td>
                      <td style={a.td}>
                        {log.diff ? (
                          <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} style={{ ...a.btnMini, fontSize:10 }}>
                            {expanded === log.id ? 'Tutup' : 'Lihat'}
                          </button>
                        ) : <span style={{ color:'#374151' }}>—</span>}
                      </td>
                    </tr>
                    {expanded === log.id && log.diff && (
                      <tr key={`${log.id}-diff`} style={{ borderBottom:'1px solid #1F2937', background:'#0D1526' }}>
                        <td colSpan={7} style={{ padding:'10px 16px' }}>
                          <pre style={{ fontSize:10, color:'#9CA3AF', fontFamily:'monospace', margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                            {JSON.stringify(log.diff, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={7} style={{ padding:'32px', textAlign:'center', color:'#4B5563', fontSize:12 }}>Belum ada log aktivitas</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display:'flex', gap:6, alignItems:'center', justifyContent:'center' }}>
              <button disabled={page === 1}      onClick={() => load(page - 1)} style={page === 1      ? a.btnDisabled : a.btnSecondary}>‹ Prev</button>
              <span style={{ fontSize:11, color:'#4B5563' }}>Hal {page} / {pages}</span>
              <button disabled={page === pages}  onClick={() => load(page + 1)} style={page === pages  ? a.btnDisabled : a.btnSecondary}>Next ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Tab = 'users' | 'audit';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div style={a.page}>
      <div>
        <div style={{ fontSize:20, fontWeight:700, color:'#F9FAFB', marginBottom:4 }}>Panel Admin</div>
        <div style={{ fontSize:12, color:'#6B7280' }}>Manajemen pengguna dan riwayat aktivitas sistem</div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'1px solid #1F2937' }}>
        {([['users','Manajemen User'],['audit','Audit Log']] as [Tab,string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer',
            border:'none', fontFamily:'inherit', background:'transparent',
            color: tab === t ? '#0E91A5' : '#4B5563',
            borderBottom:`2px solid ${tab === t ? '#0E91A5' : 'transparent'}`,
            marginBottom:-1, transition:'all 150ms',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={a.card}>
        {tab === 'users' ? <UsersTab /> : <AuditTab />}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const a: Record<string, CSSProperties> = {
  page:       { flex:1, overflowY:'auto', background:'#0B1220', padding:'24px', display:'flex', flexDirection:'column', gap:20 },
  card:       { background:'#111827', border:'1px solid #1F2937', borderRadius:10, padding:'24px 28px' },
  label:      { fontSize:11, fontWeight:600, color:'#6B7280', letterSpacing:'0.04em' },
  input:      { background:'#0D1526', border:'1px solid #374151', borderRadius:6, padding:'7px 11px', fontSize:12, color:'#E5E7EB', outline:'none', width:'100%', fontFamily:'inherit', boxSizing:'border-box' },
  select:     { background:'#0D1526', border:'1px solid #374151', borderRadius:6, padding:'7px 11px', fontSize:12, color:'#E5E7EB', outline:'none', width:'100%', fontFamily:'inherit', boxSizing:'border-box', cursor:'pointer' },
  th:         { padding:'8px 14px', textAlign:'left', color:'#4B5563', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', fontSize:10, borderBottom:'1px solid #1F2937', whiteSpace:'nowrap' },
  td:         { padding:'10px 14px', color:'#9CA3AF', verticalAlign:'middle' },
  btnPrimary: { padding:'7px 16px', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background:'#0E91A5', color:'#fff', fontFamily:'inherit' },
  btnSecondary:{ padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid #374151', background:'transparent', color:'#9CA3AF', fontFamily:'inherit' },
  btnDisabled:{ padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'not-allowed', border:'1px solid #1F2937', background:'transparent', color:'#374151', fontFamily:'inherit' },
  btnMini:    { padding:'3px 10px', borderRadius:5, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid #374151', background:'transparent', color:'#9CA3AF', fontFamily:'inherit' },
  overlay:    { position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' },
  modal:      { background:'#111827', border:'1px solid #374151', borderRadius:12, padding:'24px 28px', width:420, maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.7)' },
  closeBtn:   { background:'transparent', border:'none', color:'#4B5563', fontSize:18, cursor:'pointer', lineHeight:1, padding:4 },
  errBox:     { background:'#450A0A', border:'1px solid #EF4444', borderRadius:6, padding:'8px 12px', fontSize:12, color:'#FCA5A5' },
  pill:       { padding:'3px 10px', borderRadius:9999, fontSize:11, fontWeight:500, cursor:'pointer', border:'1px solid', fontFamily:'inherit', transition:'all 150ms' },
  filterLabel:{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#4B5563', textTransform:'uppercase' },
  spinner:    { width:16, height:16, border:'2px solid #374151', borderTopColor:'#0E91A5', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
};
