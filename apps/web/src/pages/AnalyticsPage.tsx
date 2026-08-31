import { useEffect, useState } from 'react';
import { analyticsApi } from '../lib/api';
import { useColors, useTheme } from '../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Summary {
  total:      number;
  byStage:    { stage: string; count: number }[];
  byType:     { type: string;  count: number }[];
  byState:    { state: string; count: number }[];
  byIsland:   { island: string; count: number }[];
  byProvince: { province: string; count: number }[];
  byRegion:   { region: string; count: number }[];
  byUip:      { uip: string; projects: number; openIssues: number; overdueIssues: number }[];
  byTrack:    { energized: number; idle: number; delayed: number; on_track: number };
  capacity:   { total_mw: number; total_mva: number; total_km: number };
  pressure:   { open_issues: number; overdue_issues: number; amendment_count: number; eot_count: number; vo_count: number };
  mwByProvince: { province: string; value: number }[];
  kmByProvince: { province: string; value: number }[];
  issueByCategory: { category: string; count: number }[];
  amendmentByType: { type: string; count: number }[];
  codPipeline:  { year: number; count: number }[];
  codSlippage:  { years: number; count: number }[];
  codWithTargetOnly: number;
  sourceFile: string | null;
  importedAt: string | null;
}

const nf = (n: number) => n.toLocaleString('id-ID');

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, color, sub, highlight }: {
  label: string; value: number | string; unit?: string; color: string; sub?: string; highlight?: boolean;
}) {
  const c = useColors();
  const { isDark } = useTheme();
  const bg    = highlight && !isDark ? '#F6A821' : c.bgCard;
  const txtLbl= highlight && !isDark ? 'rgba(255,255,255,0.75)' : c.textMuted;
  const txtSub= highlight && !isDark ? 'rgba(255,255,255,0.65)' : c.textMuted;
  const bdr   = highlight && !isDark ? '#F6A821' : c.border;
  const valC  = highlight && !isDark ? '#FFFFFF' : color;
  const unitC = highlight && !isDark ? 'rgba(255,255,255,0.8)' : c.textSec;
  return (
    <div style={{
      background:bg, borderRadius:8, padding:'14px 16px',
      borderTop:`1px solid ${bdr}`, borderRight:`1px solid ${bdr}`, borderBottom:`1px solid ${bdr}`, borderLeft:`3px solid ${color}`,
    }}>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:txtLbl, marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
        <div style={{ fontSize:27, fontWeight:800, color:valC, lineHeight:1, fontFamily:'monospace' }}>{value}</div>
        {unit && <div style={{ fontSize:13, fontWeight:600, color:unitC }}>{unit}</div>}
      </div>
      {sub && <div style={{ fontSize:11, color:txtSub, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <div style={{ background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:8, padding:'16px 18px' }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:c.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:c.textMuted, marginTop:2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const c = useColors();
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:4 }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:c.textMuted, whiteSpace:'nowrap' }}>{title}</div>
      <div style={{ flex:1, height:1, background:c.divider }} />
    </div>
  );
}

// ── Note / callout ────────────────────────────────────────────────────────────
function Note({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <div style={{
      display:'flex', gap:10, alignItems:'flex-start', background:c.bgInput,
      borderTop:`1px solid ${c.border}`, borderRight:`1px solid ${c.border}`, borderBottom:`1px solid ${c.border}`,
      borderLeft:'3px solid #F6A821', borderRadius:'0 6px 6px 0',
      padding:'10px 13px', fontSize:12, color:c.textSec, marginTop:13,
    }}>
      <span style={{ flexShrink:0 }}>⚠</span>
      <div>{children}</div>
    </div>
  );
}

// ── Horizontal bar list ───────────────────────────────────────────────────────
function HBar({ rows, color, unit, emptyText = 'Tidak ada data', initialLimit = 8 }: {
  rows: { label: string; value: number }[];
  color: string;
  unit: string;
  emptyText?: string;
  initialLimit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const c = useColors();
  if (!rows.length) {
    return <div style={{ fontSize:12, color:c.textMuted, padding:'20px 0', textAlign:'center' }}>{emptyText}</div>;
  }
  const visible = expanded ? rows : rows.slice(0, initialLimit);
  const max = Math.max(...rows.map(r => r.value), 1);
  const hasMore = rows.length > initialLimit;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {visible.map((row, i) => (
        <div key={i}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontSize:11, color:c.textSec, maxWidth:'60%', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.label}</span>
            <span style={{ fontSize:11, fontWeight:700, color, fontFamily:'monospace' }}>
              {nf(row.value)} {unit}
            </span>
          </div>
          <div style={{ height:7, background:c.hbarTrack, borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(row.value/max)*100}%`, background:color, borderRadius:4, transition:'width 600ms ease', opacity:0.85 }} />
          </div>
        </div>
      ))}
      {hasMore && (
        <button onClick={() => setExpanded(e => !e)} style={{
          marginTop:4, padding:'5px 0', background:'none', border:'none', cursor:'pointer',
          fontSize:11, color:c.textMuted, fontFamily:'inherit', textAlign:'left',
        }}>
          {expanded ? '▲ Sembunyikan' : `▼ Lihat semua (${rows.length - initialLimit} lainnya)`}
        </button>
      )}
    </div>
  );
}

// ── COD pipeline — column chart ──────────────────────────────────────────────
function CodPipeline({ data, currentYear }: { data: { year: number; count: number }[]; currentYear: number }) {
  const c = useColors();
  if (!data.length) return <div style={{ fontSize:12, color:c.textMuted, textAlign:'center', padding:'20px 0' }}>Belum ada data</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:180, paddingTop:6 }}>
      {data.map(d => {
        const isPast = d.year < currentYear;
        const isPeak = d.year === currentYear || d.year === currentYear + 1;
        const bg = isPeak ? '#F6A821' : isPast ? c.textMuted : c.accent;
        return (
          <div key={d.year} style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center', gap:5, height:'100%', minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:600, color:c.textSec, fontFamily:'monospace' }}>{d.count}</div>
            <div style={{ width:'100%', minHeight:2, borderRadius:'3px 3px 0 0', background:bg, opacity:isPast?0.5:0.9, height:`${Math.max((d.count/max)*100,2)}%` }} />
            <div style={{ fontSize:10, color:d.year===currentYear?'#F6A821':c.textMuted, fontWeight:d.year===currentYear?700:400 }}>{d.year}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── COD slippage — deviation bars ────────────────────────────────────────────
function CodSlippage({ data }: { data: { years: number; count: number }[] }) {
  const c = useColors();
  if (!data.length) return <div style={{ fontSize:12, color:c.textMuted, textAlign:'center', padding:'20px 0' }}>Belum ada data</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  const labelFor = (y: number) => y < 0 ? `${y} thn` : y === 0 ? 'tepat' : `+${y} thn`;
  const colorFor = (y: number) => y < 0 ? '#10B981' : y === 0 ? c.accent : y <= 2 ? '#F6A821' : '#EF4444';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {data.map(d => (
        <div key={d.years} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:48, fontSize:10.5, color:c.textSec, textAlign:'right', flexShrink:0 }}>{labelFor(d.years)}</div>
          <div style={{ flex:1, height:14, background:c.hbarTrack, borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(d.count/max)*100}%`, background:colorFor(d.years), borderRadius:3 }} />
          </div>
          <div style={{ width:42, fontSize:10.5, color:c.textSec, fontFamily:'monospace' }}>{nf(d.count)}</div>
        </div>
      ))}
    </div>
  );
}

// ── State funnel ──────────────────────────────────────────────────────────────
const STATE_COLOR: Record<string, string> = {
  'Perencanaan':     '#94A3B8',
  'Pra-Pelaksanaan': '#7C8FA3',
  'Pelaksanaan':     '#008BA0',
  'Penyelesaian':    '#F6A821',
  'Selesai':         '#10B981',
  'Terminasi':       '#EF4444',
};
function StateFunnel({ data }: { data: { state: string; count: number }[] }) {
  const c = useColors();
  const rows = data.filter(d => STATE_COLOR[d.state]);
  if (!rows.length) return <div style={{ fontSize:12, color:c.textMuted, textAlign:'center', padding:'20px 0' }}>Belum ada data</div>;
  const max = Math.max(...rows.map(r => r.count), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
      {rows.map(r => (
        <div key={r.state} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:104, fontSize:11.5, color:c.textSec, flexShrink:0 }}>{r.state}</div>
          <div style={{ flex:1, height:19, background:c.hbarTrack, borderRadius:4, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${(r.count/max)*100}%`, background:STATE_COLOR[r.state], borderRadius:4,
              display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:6,
            }}>
              <span style={{ fontSize:10.5, fontWeight:700, color:'#fff' }}>{nf(r.count)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── UIP league table ──────────────────────────────────────────────────────────
function UipTable({ rows }: { rows: Summary['byUip'] }) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  if (!rows.length) return <div style={{ fontSize:12, color:c.textMuted, textAlign:'center', padding:'20px 0' }}>Belum ada data</div>;
  const visible = expanded ? rows : rows.slice(0, 6);
  const maxRatio = Math.max(...rows.map(r => r.openIssues / Math.max(r.projects, 1)), 0.1);
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:560 }}>
        <thead>
          <tr>
            {['UIP','Proyek','Isu Terbuka','Lewat Target','Beban Isu / Proyek'].map((h,i) => (
              <th key={h} style={{
                textAlign: i===0 ? 'left' : 'right', fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase',
                color:c.textMuted, fontWeight:700, padding:'0 10px 8px', borderBottom:`1px solid ${c.border}`, whiteSpace:'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map(r => {
            const ratio = r.openIssues / Math.max(r.projects, 1);
            const pct = Math.min((ratio / maxRatio) * 100, 100);
            const sevColor = ratio >= 5 ? '#EF4444' : ratio >= 1.5 ? '#F6A821' : '#10B981';
            return (
              <tr key={r.uip}>
                <td style={{ padding:'8px 10px', color:c.textPrimary, fontWeight:600, borderBottom:`1px solid ${c.divider}` }}>{r.uip}</td>
                <td style={{ padding:'8px 10px', textAlign:'right', color:c.textSec, fontFamily:'monospace', borderBottom:`1px solid ${c.divider}` }}>{nf(r.projects)}</td>
                <td style={{ padding:'8px 10px', textAlign:'right', color:c.textSec, fontFamily:'monospace', borderBottom:`1px solid ${c.divider}` }}>{nf(r.openIssues)}</td>
                <td style={{ padding:'8px 10px', textAlign:'right', color:c.textSec, fontFamily:'monospace', borderBottom:`1px solid ${c.divider}` }}>{nf(r.overdueIssues)}</td>
                <td style={{ padding:'8px 10px', borderBottom:`1px solid ${c.divider}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:64, height:5, background:c.hbarTrack, borderRadius:3, overflow:'hidden', flexShrink:0 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:sevColor, borderRadius:3 }} />
                    </div>
                    <span style={{ fontSize:10.5, fontWeight:700, color:sevColor, fontFamily:'monospace', whiteSpace:'nowrap' }}>{ratio.toFixed(1)}/proyek</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > 6 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          marginTop:8, padding:'5px 0', background:'none', border:'none', cursor:'pointer',
          fontSize:11, color:c.textMuted, fontFamily:'inherit', textAlign:'left',
        }}>
          {expanded ? '▲ Sembunyikan' : `▼ Lihat semua (${rows.length - 6} unit lainnya)`}
        </button>
      )}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  GI: 'Gardu Induk', TRANS: 'Transmisi', KIT: 'Pembangkit', KOMBINASI: 'Kombinasi',
  KIT_EBT: 'KIT-EBT', KIT_NONEBT: 'KIT-NONEBT', FSRU: 'FSRU', KIT_RELOKASI: 'KIT (Relokasi)',
};
const TYPE_COLORS: Record<string, string> = {
  GI: '#008BA0', KIT: '#3B82F6', TRANS: '#10B981', KOMBINASI: '#F6A821',
  KIT_EBT: '#A78BFA', KIT_NONEBT: '#F472B6', FSRU: '#34D399', KIT_RELOKASI: '#94A3B8',
};

// ── Donut ─────────────────────────────────────────────────────────────────────
function DonutChart({ data, colors, size = 112 }: { data: { label: string; value: number }[]; colors: string[]; size?: number }) {
  const c = useColors();
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return <div style={{ width: size, height: size, flexShrink: 0 }} />;
  const cx = size / 2, cy = size / 2, r = size / 2 - 4, ir = r * 0.62;
  let angle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const a  = (d.value / total) * 2 * Math.PI;
    const ea = angle + a;
    const x1 = cx + r  * Math.cos(angle), y1 = cy + r  * Math.sin(angle);
    const x2 = cx + r  * Math.cos(ea),    y2 = cy + r  * Math.sin(ea);
    const ix1= cx + ir * Math.cos(ea),   iy1 = cy + ir * Math.sin(ea);
    const ix2= cx + ir * Math.cos(angle),iy2 = cy + ir * Math.sin(angle);
    const lg = a > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2} Z`;
    angle = ea;
    return { path, color: colors[i % colors.length] };
  });
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.9} />)}
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{ fontSize:20, fontWeight:800, color:c.textPrimary, lineHeight:1, fontFamily:'monospace' }}>{nf(total)}</div>
        <div style={{ fontSize:9, fontWeight:600, letterSpacing:'0.08em', color:c.textMuted, textTransform:'uppercase', marginTop:2 }}>proyek</div>
      </div>
    </div>
  );
}
function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  const c = useColors();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, flex:1, minWidth:0 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:10, height:10, borderRadius:2, background:item.color, flexShrink:0 }} />
          <span style={{ fontSize:11, color:c.textSec, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</span>
          <span style={{ fontSize:12, fontWeight:700, color:item.color, fontFamily:'monospace' }}>{nf(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const c = useColors();

  useEffect(() => {
    analyticsApi.summary()
      .then(res => setSummary(res.data))
      .catch(() => setError('Gagal memuat data analitik'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', flex:1, alignItems:'center', justifyContent:'center', flexDirection:'column', gap:10, color:c.textMuted, background:c.bgPage }}>
      <div style={{ width:24, height:24, border:`2px solid ${c.spinnerBdr}`, borderTopColor:c.spinnerTop, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <span style={{ fontSize:12 }}>Memuat data analitik…</span>
    </div>
  );

  if (error || !summary) return (
    <div style={{ display:'flex', flex:1, alignItems:'center', justifyContent:'center', color:'#EF4444', fontSize:13, background:c.bgPage }}>{error || 'Tidak ada data'}</div>
  );

  const {
    total, byType, byState, byUip, byTrack, capacity, pressure,
    mwByProvince, kmByProvince, issueByCategory, amendmentByType,
    codPipeline, codSlippage, codWithTargetOnly, sourceFile,
  } = summary;

  const currentYear = new Date().getFullYear();
  const pipelineWindow = codPipeline.filter(d => d.year >= currentYear - 2 && d.year <= currentYear + 8);
  const slipTotal = codSlippage.reduce((s, d) => s + d.count, 0) || 1;
  const lateCount = codSlippage.filter(d => d.years > 0).reduce((s, d) => s + d.count, 0);
  const latePct = Math.round((lateCount / slipTotal) * 1000) / 10;

  const typeData = byType.map(t => ({ label: TYPE_LABELS[t.type] ?? t.type, value: t.count, color: TYPE_COLORS[t.type] ?? '#94A3B8' }));

  const provinceCount = summary.byProvince.slice(0, 8).map(p => ({ label: p.province, value: p.count }));

  return (
    <div style={{ flex:1, overflowY:'auto', background:c.bgPage, padding:'24px', display:'flex', flexDirection:'column', gap:16 }}>
      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:c.textPrimary, marginBottom:4 }}>Ringkasan Proyek RUPTL</div>
          <div style={{ fontSize:12, color:c.textSec }}>Kinerja penyelesaian portofolio terhadap komitmen RUPTL</div>
        </div>
        {sourceFile && <div style={{ fontSize:10.5, color:c.textMuted, fontFamily:'monospace' }}>Sumber: {sourceFile}</div>}
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
        <KpiCard label="Portofolio" value={nf(total)} color="#008BA0" highlight
          sub={`${nf(byTrack.energized)} COD · ${byUip.length} UIP`} />
        <KpiCard label="Kapasitas Pembangkit" value={nf(Math.round(capacity.total_mw))} unit="MW"
          color="#10B981" sub={`${nf(Math.round(capacity.total_mva))} MVA · ${nf(Math.round(capacity.total_km))} km transmisi`} />
        <KpiCard label="COD Meleset" value={latePct} unit="%"
          color="#EF4444" sub={`${nf(lateCount)} proyek mundur dari target RUPTL`} />
        <KpiCard label="Isu Terbuka" value={nf(pressure.open_issues)}
          color="#F6A821" sub={`${nf(pressure.overdue_issues)} lewat target penyelesaian`} />
        <KpiCard label="Amandemen" value={nf(pressure.amendment_count)}
          color="#8B5CF6" sub={`${nf(pressure.eot_count)} EOT · ${nf(pressure.vo_count)} nilai kontrak`} />
      </div>

      {/* ── COD: headline ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.55fr 1fr', gap:14 }}>
        <ChartCard title="Kurva COD — estimasi terkini" subtitle="Jumlah proyek COD per tahun">
          <CodPipeline data={pipelineWindow} currentYear={currentYear} />
        </ChartCard>

        <ChartCard title="Deviasi COD terhadap RUPTL" subtitle={`${nf(slipTotal)} proyek punya target & estimasi`}>
          <CodSlippage data={codSlippage} />
          {codWithTargetOnly > 0 && (
            <Note><b style={{ color:c.textPrimary }}>{nf(codWithTargetOnly)} proyek</b> punya target RUPTL tapi belum punya estimasi COD — tidak masuk hitungan ini.</Note>
          )}
        </ChartCard>
      </div>

      {/* ── Composition ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <ChartCard title="Tahapan Proyek" subtitle="Status PMO terkini">
          <StateFunnel data={byState} />
        </ChartCard>

        <ChartCard title="Tipe Proyek" subtitle="Jenis infrastruktur">
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <DonutChart data={typeData} colors={typeData.map(t => t.color)} />
            <Legend items={typeData} />
          </div>
        </ChartCard>

        <ChartCard title="Sebaran Regional" subtitle="Unit Induk Pembangunan · jumlah proyek">
          <HBar rows={byUip.slice().sort((a,b)=>b.projects-a.projects).map(u => ({ label: u.uip, value: u.projects }))} color="#008BA0" unit="proyek" initialLimit={6} />
        </ChartCard>
      </div>

      {/* ── UIP league table ── */}
      <ChartCard title="Unit yang Perlu Perhatian" subtitle="Diurutkan berdasarkan isu terbuka">
        <UipTable rows={byUip} />
        {byUip[0] && byUip[0].openIssues > pressure.open_issues * 0.3 && (
          <Note>
            <b style={{ color:c.textPrimary }}>{byUip[0].uip} menahan {Math.round(byUip[0].openIssues/pressure.open_issues*100)}%</b> dari
            seluruh isu terbuka nasional ({nf(byUip[0].openIssues)} dari {nf(pressure.open_issues)}) dengan hanya {nf(byUip[0].projects)} proyek —
            layak diverifikasi apakah ini eskalasi nyata atau isu lama yang belum di-<i>close</i>.
          </Note>
        )}
      </ChartCard>

      {/* ── Pressure row ── */}
      <SectionHeader title="Tekanan Operasional" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
        <ChartCard title="Kategori Isu" subtitle={`${nf(pressure.open_issues)} isu terbuka`}>
          <HBar rows={issueByCategory.map(i => ({ label: i.category, value: i.count }))} color="#EF4444" unit="isu" />
        </ChartCard>
        <ChartCard title="Tekanan Amandemen Kontrak" subtitle={`${nf(pressure.amendment_count)} amandemen`}>
          <HBar rows={amendmentByType.slice(0,6).map(a => ({ label: a.type, value: a.count }))} color="#F6A821" unit="amd" />
        </ChartCard>
      </div>

      {/* ── Geography, secondary lens ── */}
      <SectionHeader title="Distribusi per Provinsi (Lensa Sekunder)" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <ChartCard title="Proyek per Provinsi" subtitle="Jumlah proyek">
          <HBar rows={provinceCount} color="#3B82F6" unit="proyek" />
        </ChartCard>
        <ChartCard title="Kapasitas Pembangkit per Provinsi" subtitle="Total MW">
          <HBar rows={mwByProvince.map(r => ({ label: r.province, value: r.value }))} color="#10B981" unit="MW" emptyText="Belum ada data kapasitas" />
        </ChartCard>
        <ChartCard title="Panjang Transmisi per Provinsi" subtitle="Total km">
          <HBar rows={kmByProvince.map(r => ({ label: r.province, value: r.value }))} color="#3B82F6" unit="km" emptyText="Belum ada data panjang transmisi" />
        </ChartCard>
      </div>
    </div>
  );
}
