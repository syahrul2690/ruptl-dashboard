import { useState, useRef, useCallback, CSSProperties } from 'react';
import { projectsApi } from '../lib/api';
import {
  ProjectStatus, ProjectType,
  URGENCY_OPTIONS, PROVINCE_OPTIONS,
} from '../lib/types';

// ── Shared atoms ──────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <div style={s.label}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = 'text', step }: {
  value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string;
}) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={s.input}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={s.select}>
      <option value="">— Pilih —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function MultiCheck({ options, selected, onChange }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)} style={{
            padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            border: `1px solid ${active ? 'rgba(14,145,165,0.5)' : '#374151'}`,
            background: active ? 'rgba(14,145,165,0.12)' : 'transparent',
            color: active ? '#0E91A5' : '#6B7280', fontFamily: 'inherit',
          }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FieldFull({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#4B5563', paddingBottom: 10, borderBottom: '1px solid #1F2937' }}>
      {children}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? '#065F46' : '#7F1D1D',
      border: `1px solid ${type === 'success' ? '#10B981' : '#EF4444'}`,
      color: type === 'success' ? '#A7F3D0' : '#FCA5A5',
      padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 380,
    }}>
      {message}
    </div>
  );
}

// ── Blank form state ──────────────────────────────────────────────────────────
function blank() {
  return {
    name: '', ruptlCode: '', type: '' as ProjectType | '',
    subtype: '', status: '' as ProjectStatus | '',
    province: '', island: '', gridSystem: '',
    lat: '', lng: '',
    codTargetRUPTL: '', codKontraktual: '', codEstimasi: '',
    progressPlan: '0', progressRealisasi: '0',
    issueType: 'None', capacity: '', capacityUnit: '',
    circuitLength: '', voltageLevel: '',
    detail: '', urgencyCategory: [] as string[],
  };
}

const TYPE_OPTIONS = [
  { value: 'POWER_PLANT',        label: 'Power Plant' },
  { value: 'SUBSTATION',         label: 'Substation (Gardu Induk)' },
  { value: 'TRANSMISSION_LINE',  label: 'Transmission Line' },
];

const STATUS_OPTIONS = [
  { value: 'PRE_CONSTRUCTION', label: 'Pre-Construction' },
  { value: 'CONSTRUCTION',     label: 'Construction' },
  { value: 'ENERGIZED',        label: 'Energized' },
];

const ISLAND_OPTIONS = [
  'Jawa', 'Sumatera', 'Kalimantan', 'Sulawesi', 'Papua', 'Nusa Tenggara', 'Maluku',
].map(v => ({ value: v, label: v }));

const ISSUE_OPTIONS = [
  'None', 'Land Acquisition', 'Permit', 'Contractor', 'Finance', 'Design', 'Other',
].map(v => ({ value: v, label: v }));

// ─────────────────────────────────────────────────────────────────────────────
//  Manual Form Tab
// ─────────────────────────────────────────────────────────────────────────────
function ManualForm() {
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const set = (field: string) => (v: string) => setForm(f => ({ ...f, [field]: v }));

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ruptlCode || !form.type || !form.status || !form.province) {
      showToast('Lengkapi field wajib: Nama, RUPTL Code, Tipe, Status, Provinsi', 'error');
      return;
    }
    setSaving(true);
    try {
      await projectsApi.create({
        ...form,
        lat:               parseFloat(form.lat as string) || 0,
        lng:               parseFloat(form.lng as string) || 0,
        progressPlan:      parseInt(form.progressPlan)      || 0,
        progressRealisasi: parseInt(form.progressRealisasi) || 0,
        capacity:          form.capacity      ? parseFloat(form.capacity as string)      : undefined,
        circuitLength:     form.circuitLength ? parseFloat(form.circuitLength as string) : undefined,
      });
      showToast(`Proyek "${form.name}" berhasil disimpan.`, 'success');
      setForm(blank());
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      showToast(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Gagal menyimpan proyek'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <Toast {...toast} />}

      {/* Identity */}
      <SectionTitle>Identitas Proyek</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FieldFull label="Nama Proyek *">
          <Input value={form.name} onChange={set('name')} placeholder="e.g. SUTET 500kV Paiton – Krian" />
        </FieldFull>
        <Field label="RUPTL Code *">
          <Input value={form.ruptlCode} onChange={set('ruptlCode')} placeholder="e.g. JT-T-001" />
        </Field>
        <Field label="Tipe Proyek *">
          <Select value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
        </Field>
        <Field label="Sub-tipe">
          <Input value={form.subtype} onChange={set('subtype')} placeholder="e.g. SUTET 500kV" />
        </Field>
        <Field label="Status *">
          <Select value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
        </Field>
        <Field label="Issue Type">
          <Select value={form.issueType} onChange={set('issueType')} options={ISSUE_OPTIONS} />
        </Field>
      </div>

      {/* Location */}
      <SectionTitle>Lokasi</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Provinsi *">
          <Select value={form.province} onChange={set('province')} options={PROVINCE_OPTIONS.map(p => ({ value: p, label: p }))} />
        </Field>
        <Field label="Pulau">
          <Select value={form.island} onChange={set('island')} options={ISLAND_OPTIONS} />
        </Field>
        <Field label="Grid System">
          <Input value={form.gridSystem} onChange={set('gridSystem')} placeholder="e.g. Jawa-Bali" />
        </Field>
        <div />
        <Field label="Latitude">
          <Input type="number" step="0.0001" value={form.lat} onChange={set('lat')} placeholder="-7.2575" />
        </Field>
        <Field label="Longitude">
          <Input type="number" step="0.0001" value={form.lng} onChange={set('lng')} placeholder="112.7521" />
        </Field>
      </div>

      {/* COD */}
      <SectionTitle>Tanggal COD</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <Field label="COD Target RUPTL">
          <Input value={form.codTargetRUPTL} onChange={set('codTargetRUPTL')} placeholder="Q3 2025" />
        </Field>
        <Field label="COD Kontraktual">
          <Input value={form.codKontraktual} onChange={set('codKontraktual')} placeholder="Q4 2025" />
        </Field>
        <Field label="COD Estimasi">
          <Input value={form.codEstimasi} onChange={set('codEstimasi')} placeholder="Q1 2026" />
        </Field>
      </div>

      {/* Progress */}
      <SectionTitle>Progress Fisik</SectionTitle>
      <Row>
        <Field label="Progress Plan (%)">
          <Input type="number" step="1" value={form.progressPlan} onChange={set('progressPlan')} />
        </Field>
        <Field label="Progress Realisasi (%)">
          <Input type="number" step="1" value={form.progressRealisasi} onChange={set('progressRealisasi')} />
        </Field>
      </Row>

      {/* Capacity */}
      <SectionTitle>Kapasitas & Teknis</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
        <Field label="Kapasitas">
          <Input type="number" step="0.01" value={form.capacity} onChange={set('capacity')} placeholder="0" />
        </Field>
        <Field label="Satuan">
          <Input value={form.capacityUnit} onChange={set('capacityUnit')} placeholder="MW / MVA" />
        </Field>
        <Field label="Panjang (km)">
          <Input type="number" step="0.01" value={form.circuitLength} onChange={set('circuitLength')} placeholder="0" />
        </Field>
        <Field label="Voltage Level">
          <Input value={form.voltageLevel} onChange={set('voltageLevel')} placeholder="500kV / 150kV" />
        </Field>
      </div>

      {/* Urgency */}
      <SectionTitle>Kategori Urgensi</SectionTitle>
      <MultiCheck
        options={URGENCY_OPTIONS}
        selected={form.urgencyCategory}
        onChange={v => setForm(f => ({ ...f, urgencyCategory: v }))}
      />

      {/* Detail */}
      <SectionTitle>Keterangan Tambahan</SectionTitle>
      <textarea
        value={form.detail}
        onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
        rows={3}
        placeholder="Informasi tambahan mengenai proyek..."
        style={{ ...s.input, resize: 'vertical', lineHeight: '1.6' } as CSSProperties}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
        <button type="button" onClick={() => setForm(blank())} style={s.btnSecondary}>Reset</button>
        <button type="submit" disabled={saving} style={saving ? s.btnDisabled : s.btnPrimary}>
          {saving ? 'Menyimpan…' : 'Simpan Proyek'}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Excel Import Tab
// ─────────────────────────────────────────────────────────────────────────────
interface ImportRow {
  row:        number;
  name?:      string;
  status?:    string;
  type?:      string;
  province?:  string;
  ruptlCode?: string;
  errors:     string[];
  valid:      boolean;
}

interface PreviewResult {
  total:   number;
  valid:   number;
  invalid: number;
  rows:    ImportRow[];
}

type ImportStage = 'idle' | 'previewing' | 'preview' | 'committing' | 'done';

function ExcelImport() {
  const [file,     setFile]     = useState<File | null>(null);
  const [stage,    setStage]    = useState<ImportStage>('idle');
  const [preview,  setPreview]  = useState<PreviewResult | null>(null);
  const [result,   setResult]   = useState<{ upserted: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setStage('idle'); setPreview(null); setResult(null); }
  }, []);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setStage('idle'); setPreview(null); setResult(null); }
  };

  const handlePreview = async () => {
    if (!file) return;
    setStage('previewing'); setErrorMsg('');
    try {
      const res = await projectsApi.importPreview(file);
      setPreview(res.data);
      setStage('preview');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? 'Gagal membaca file');
      setStage('idle');
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setStage('committing'); setErrorMsg('');
    try {
      const res = await projectsApi.importCommit(file);
      setResult(res.data);
      setStage('done');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? 'Gagal mengimpor data');
      setStage('preview');
    }
  };

  const reset = () => {
    setFile(null); setStage('idle'); setPreview(null);
    setResult(null); setErrorMsg('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${file ? '#0E91A5' : '#374151'}`,
          borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
          background: file ? 'rgba(14,145,165,0.04)' : 'transparent',
          transition: 'all 200ms',
        }}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handlePick} />
        <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
        {file ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0E91A5' }}>{file.name}</div>
            <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB · Klik untuk ganti
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF' }}>Seret file Excel ke sini</div>
            <div style={{ fontSize: 11, color: '#4B5563', marginTop: 4 }}>atau klik untuk memilih · .xlsx / .xls</div>
          </div>
        )}
      </div>

      {/* Template note */}
      <div style={{ background: '#0D1526', border: '1px solid #1F2937', borderRadius: 6, padding: '10px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#4B5563', textTransform: 'uppercase', marginBottom: 6 }}>Kolom Wajib (Baris 1 = Header)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {['ruptlCode','name','type','subtype','status','province','island','lat','lng'].map(col => (
            <code key={col} style={{ fontSize: 11, color: '#0E91A5', fontFamily: 'monospace' }}>{col}</code>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#450A0A', border: '1px solid #EF4444', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#FCA5A5' }}>
          {errorMsg}
        </div>
      )}

      {/* Action buttons */}
      {stage !== 'done' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            disabled={!file || stage === 'previewing' || stage === 'committing'}
            onClick={handlePreview}
            style={(!file || stage === 'previewing') ? s.btnDisabled : s.btnSecondary}
          >
            {stage === 'previewing' ? 'Membaca…' : 'Preview Validasi'}
          </button>
          {stage === 'preview' && preview && preview.valid > 0 && (
            <button
              type="button"
              disabled={stage === 'committing'}
              onClick={handleCommit}
              style={s.btnPrimary}
            >
              {(stage as string) === 'committing' ? 'Mengimpor…' : `Import ${preview.valid} Proyek Valid`}
            </button>
          )}
          {stage === 'preview' && (
            <button type="button" onClick={reset} style={s.btnGhost}>Batal</button>
          )}
        </div>
      )}

      {/* Done state */}
      {stage === 'done' && result && (
        <div style={{ background: '#064E3B', border: '1px solid #10B981', borderRadius: 8, padding: '16px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#A7F3D0', marginBottom: 4 }}>Import Berhasil</div>
          <div style={{ fontSize: 13, color: '#6EE7B7' }}>{result.upserted} proyek berhasil di-upsert ke database.</div>
          <button type="button" onClick={reset} style={{ ...s.btnSecondary, marginTop: 12 }}>Import Lagi</button>
        </div>
      )}

      {/* Preview table */}
      {preview && stage !== 'done' && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
            {[
              { label: 'Total Baris', val: preview.total,   color: '#9CA3AF' },
              { label: 'Valid',       val: preview.valid,   color: '#10B981' },
              { label: 'Ada Error',   val: preview.invalid, color: '#EF4444' },
            ].map(st => (
              <div key={st.label} style={{ background: '#0D1526', border: '1px solid #1F2937', borderRadius: 6, padding: '8px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.val}</div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#4B5563', marginTop: 2 }}>{st.label}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #1F2937' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#0D1526' }}>
                  {['#','RUPTL Code','Nama','Status','Tipe','Provinsi','Valid','Error'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#4B5563', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 10, borderBottom: '1px solid #1F2937', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 100).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #111827', background: row.valid ? 'transparent' : 'rgba(239,68,68,0.04)' }}>
                    <td style={s.td}>{row.row}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', color: '#0E91A5' }}>{row.ruptlCode ?? '—'}</td>
                    <td style={{ ...s.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name ?? '—'}</td>
                    <td style={s.td}>{row.status ?? '—'}</td>
                    <td style={s.td}>{row.type ?? '—'}</td>
                    <td style={s.td}>{row.province ?? '—'}</td>
                    <td style={s.td}>
                      <span style={{ color: row.valid ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                        {row.valid ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: '#EF4444', maxWidth: 240 }}>
                      {row.errors.join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 100 && (
              <div style={{ padding: '8px 12px', fontSize: 11, color: '#4B5563', borderTop: '1px solid #1F2937' }}>
                …dan {preview.rows.length - 100} baris lainnya
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'manual' | 'excel';

export default function InputPage() {
  const [tab, setTab] = useState<Tab>('manual');

  return (
    <div style={s.page}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#F9FAFB', marginBottom: 4 }}>Input Data Proyek</div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>Tambah proyek secara manual atau impor batch dari file Excel</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #1F2937', paddingBottom: 0 }}>
        {(['manual', 'excel'] as Tab[]).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: 'none', fontFamily: 'inherit',
            background: 'transparent',
            color: tab === t ? '#0E91A5' : '#4B5563',
            borderBottom: `2px solid ${tab === t ? '#0E91A5' : 'transparent'}`,
            marginBottom: -1,
            transition: 'all 150ms',
          }}>
            {t === 'manual' ? 'Form Manual' : 'Import Excel'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={s.card}>
        {tab === 'manual' ? <ManualForm /> : <ExcelImport />}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, CSSProperties> = {
  page:        { flex: 1, overflowY: 'auto', background: '#0B1220', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 },
  card:        { background: '#111827', border: '1px solid #1F2937', borderRadius: 10, padding: '24px 28px' },
  label:       { fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.04em' },
  input:       { background: '#0D1526', border: '1px solid #374151', borderRadius: 6, padding: '7px 11px', fontSize: 12, color: '#E5E7EB', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' },
  select:      { background: '#0D1526', border: '1px solid #374151', borderRadius: 6, padding: '7px 11px', fontSize: 12, color: '#E5E7EB', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer' },
  btnPrimary:  { padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#0E91A5', color: '#fff', fontFamily: 'inherit', letterSpacing: '0.03em' },
  btnSecondary:{ padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #374151', background: 'transparent', color: '#9CA3AF', fontFamily: 'inherit' },
  btnGhost:    { padding: '8px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'transparent', color: '#6B7280', fontFamily: 'inherit' },
  btnDisabled: { padding: '8px 20px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'not-allowed', border: 'none', background: '#1F2937', color: '#4B5563', fontFamily: 'inherit' },
  td:          { padding: '7px 12px', color: '#9CA3AF', verticalAlign: 'top' },
};
