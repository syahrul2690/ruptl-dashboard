import { useEffect, useState, CSSProperties, useCallback } from 'react';
import { analyticsApi } from '../lib/api';
import { STAGE_CONFIG } from '../lib/types';
import { useColors, useTheme } from '../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Summary {
  total:      number;
  byStage:    { stage: string; count: number }[];
  byType:     { type: string;  count: number }[];
  byIsland:   { island: string; count: number }[];
  byProvince: { province: string; count: number }[];
  byRegion:   { region: string; count: number }[];
  byTrack:    { energized: number; idle: number; delayed: number; on_track: number };
  capacity:   { total_mw: number; total_mva: number; total_km: number };
  mwByProvince:  { province:  string; value: number }[];
  kmByProvince:  { province:  string; value: number }[];
  mwByGrid:      { gridSystem: string; value: number }[];
  mvaByGrid:     { gridSystem: string; value: number }[];
  kmByGrid:      { gridSystem: string; value: number }[];
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ data, colors, size = 130, hole = 0.62 }: {
  data: { label: string; value: number }[];
  colors: string[];
  size?: number;
  hole?: number;
}) {
  const c = useColors();
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return <div style={{ width: size, height: size, flexShrink: 0 }} />;

  const cx = size / 2, cy = size / 2, r = size / 2 - 4, ir = r * hole;
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
    return { path, color: colors[i % colors.length], value: d.value };
  });

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.9} />)}
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
        <div style={{ fontSize:22, fontWeight:800, color:c.textPrimary, lineHeight:1 }}>{total}</div>
        <div style={{ fontSize:9, fontWeight:600, letterSpacing:'0.08em', color:c.textMuted, textTransform:'uppercase', marginTop:2 }}>Total</div>
      </div>
    </div>
  );
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
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
              {row.value.toLocaleString('id-ID')} {unit}
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

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ items }: { items: { label: string; value: number; color: string }[] }) {
  const c = useColors();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, flex:1 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:10, height:10, borderRadius:2, background:item.color, flexShrink:0, boxShadow:`0 0 4px ${item.color}60` }} />
          <span style={{ fontSize:11, color:c.textSec, flex:1 }}>{item.label}</span>
          <span style={{ fontSize:12, fontWeight:700, color:item.color, fontFamily:'monospace' }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

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
    <div style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:8, padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase', color:txtLbl, marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
        <div style={{ fontSize:28, fontWeight:800, color:valC, lineHeight:1 }}>{value}</div>
        {unit && <div style={{ fontSize:13, fontWeight:600, color:unitC }}>{unit}</div>}
      </div>
      {sub && <div style={{ fontSize:10, color:txtSub, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ── Chart Card ────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <div style={{ background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:8, padding:'18px 20px' }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:c.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize:10, color:c.textMuted, marginTop:2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Stage bar — horizontal bars with stage colors ────────────────────────────
function StageBar({ data }: { data: { label: string; value: number }[] }) {
  const c = useColors();
  const stageKeys = Object.keys(STAGE_CONFIG);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  if (!data.length) return <div style={{ fontSize:11, color:c.textMuted, textAlign:'center', padding:'20px 0' }}>Belum ada data</div>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {data.map((row, i) => {
        const stageKey = stageKeys[i] ?? 'OBC';
        const color = STAGE_CONFIG[stageKey as keyof typeof STAGE_CONFIG]?.color ?? '#94A3B8';
        const pct = Math.round((row.value / total) * 100);
        return (
          <div key={row.label}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontSize:10, color:c.textSec }}>{row.label}</span>
              <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color }}>
                {row.value.toLocaleString('id-ID')} <span style={{ fontSize:9, color:c.textMuted }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height:6, background:c.hbarTrack, borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 600ms ease', boxShadow:`0 0 4px ${color}60` }} />
            </div>
          </div>
        );
      })}
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

const STAGE_LABELS: Record<string, string> = {
  OBC: '01. OBC', CENTRALIZED_PLANNING: '02. CP', TVV: '03. TVV',
  KOMITE_INVESTASI: '04. KI', RKAP: '05. RKAP', SKAI: '06. SKAI',
  RENDAN: '07. RENDAN', LAKDAN: '08. LAKDAN', KONSTRUKSI: '09. Konstruksi', COD: '10. COD',
};
const TYPE_LABELS: Record<string, string> = {
  GI: 'Gardu Induk', TRANS: 'Transmisi', KIT: 'KIT',
  KIT_EBT: 'KIT-EBT', KIT_NONEBT: 'KIT-NONEBT', FSRU: 'FSRU', KIT_RELOKASI: 'KIT (Relokasi)',
};

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
    total, byStage, byType, byIsland, byProvince, byTrack, capacity,
    mwByProvince, kmByProvince, mwByGrid, mvaByGrid, kmByGrid,
  } = summary;

  const stageData = byStage.map(s => ({ label: STAGE_LABELS[s.stage] ?? s.stage, value: s.count }));
  const typeData  = byType.map(t  => ({ label: TYPE_LABELS[t.type]   ?? t.type,  value: t.count }));
  const trackData  = [
    { label: 'On Track',  value: byTrack.on_track,  color: '#10B981' },
    { label: 'Delayed',   value: byTrack.delayed,   color: '#EF4444' },
    { label: 'Idle',      value: byTrack.idle,       color: '#6B7280' },
    { label: 'Energized', value: byTrack.energized,  color: '#8B5CF6' },
  ];

  const islandRows      = byIsland.sort((a, b) => b.count - a.count).map(i => ({ label: i.island,    value: i.count }));
  const provinceRows    = byProvince.map(p => ({ label: p.province,  value: p.count }));
  const mwProvinceRows  = mwByProvince.map(r => ({ label: r.province,  value: r.value }));
  const kmProvinceRows  = kmByProvince.map(r => ({ label: r.province,  value: r.value }));
  const mwGridRows      = mwByGrid.map(r  => ({ label: r.gridSystem, value: r.value }));
  const mvaGridRows     = mvaByGrid.map(r => ({ label: r.gridSystem, value: r.value }));
  const kmGridRows      = kmByGrid.map(r  => ({ label: r.gridSystem, value: r.value }));

  return (
    <div style={{ flex:1, overflowY:'auto', background:c.bgPage, padding:'24px', display:'flex', flexDirection:'column', gap:16 }}>
      {/* Page header */}
      <div>
        <div style={{ fontSize:20, fontWeight:700, color:c.textPrimary, marginBottom:4 }}>Ringkasan Proyek RUPTL</div>
        <div style={{ fontSize:12, color:c.textSec }}>Statistik dan visualisasi seluruh proyek infrastruktur ketenagalistrikan nasional</div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
        <KpiCard label="Total Proyek" value={total} color={c.textPrimary} highlight
          sub={`${byTrack.energized} COD · ${byStage.find(s=>s.stage==='KONSTRUKSI')?.count??0} Konstruksi`} />
        <KpiCard label="Total Kapasitas" value={Math.round(+capacity.total_mw)}  unit="MW"
          color="#10B981"  sub="Pembangkit (Power Plant)" />
        <KpiCard label="Panjang Jaringan" value={Math.round(+capacity.total_km)}  unit="km"
          color="#3B82F6"  sub="Transmisi SUTT & SUTET" />
        <KpiCard label="Kapasitas Gardu" value={Math.round(+capacity.total_mva)} unit="MVA"
          color="#008BA0"  sub="Gardu Induk (Substation)" />
        <KpiCard label="Proyek Terlambat" value={byTrack.delayed}
          color="#EF4444"  sub={`dari ${total} total proyek`} />
      </div>

      {/* ── Stage bar + donut row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:14 }}>
        <ChartCard title="Stage Proyek" subtitle="Jumlah proyek per tahapan">
          <StageBar data={stageData} />
        </ChartCard>

        <ChartCard title="Progress Proyek" subtitle="On Track / Delayed / Idle / COD">
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <DonutChart data={trackData} colors={trackData.map(t => t.color)} size={120} />
            <Legend items={trackData} />
          </div>
        </ChartCard>

        <ChartCard title="Tipe Proyek" subtitle="Jenis infrastruktur">
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <DonutChart data={typeData} colors={['#008BA0','#3B82F6','#10B981','#A78BFA','#F59E0B','#F472B6','#34D399']} size={120} />
            <Legend items={typeData.map((d,i) => ({ ...d, color: ['#008BA0','#3B82F6','#10B981','#A78BFA','#F59E0B','#F472B6','#34D399'][i] }))} />
          </div>
        </ChartCard>
      </div>

      <SectionHeader title="Distribusi Jumlah Proyek" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
        <ChartCard title="Proyek per Pulau" subtitle="Jumlah proyek">
          <HBar rows={islandRows} color="#008BA0" unit="proyek" />
        </ChartCard>
        <ChartCard title="Proyek per Provinsi" subtitle="Jumlah proyek">
          <HBar rows={provinceRows} color="#3B82F6" unit="proyek" />
        </ChartCard>
      </div>

      <SectionHeader title="Distribusi per Provinsi" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
        <ChartCard title="Kapasitas Pembangkit per Provinsi" subtitle="Total MW · Power Plant">
          <HBar rows={mwProvinceRows} color="#10B981" unit="MW" emptyText="Belum ada data kapasitas pembangkit" />
        </ChartCard>
        <ChartCard title="Panjang Transmisi per Provinsi" subtitle="Total km · Transmission Line">
          <HBar rows={kmProvinceRows} color="#3B82F6" unit="km" emptyText="Belum ada data panjang transmisi" />
        </ChartCard>
      </div>

      <SectionHeader title="Distribusi per Sistem Grid" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <ChartCard title="Kapasitas Pembangkit per Sistem Grid" subtitle="Total MW · Power Plant">
          <HBar rows={mwGridRows} color="#10B981" unit="MW" emptyText="Belum ada data kapasitas pembangkit" />
        </ChartCard>
        <ChartCard title="Kapasitas Transformator per Sistem Grid" subtitle="Total MVA · Substation">
          <HBar rows={mvaGridRows} color="#008BA0" unit="MVA" emptyText="Belum ada data kapasitas transformator" />
        </ChartCard>
        <ChartCard title="Panjang Transmisi per Sistem Grid" subtitle="Total km · Transmission Line">
          <HBar rows={kmGridRows} color="#3B82F6" unit="km" emptyText="Belum ada data panjang transmisi" />
        </ChartCard>
      </div>
    </div>
  );
}
