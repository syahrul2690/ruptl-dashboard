// AnalyticsPage.jsx — Project summary & visualisation

const { useEffect: useAE, useRef: useAR, useMemo: useAM } = React;

// ── helpers ──────────────────────────────────────────────────────────
function getTrack(p) {
  if (p.status === "Energized") return "Energized";
  if (p.progressRealisasi <= 5) return "Idle";
  if (p.deviasi < -3) return "Delayed";
  return "On Track";
}

function sumBy(arr, key) {
  return arr.reduce((s, p) => s + (Number(p[key]) || 0), 0);
}

// ── Donut Chart (SVG) ─────────────────────────────────────────────────
const DonutChart = ({ data, colors, size = 130, hole = 0.62 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const innerR = r * hole;
  let startAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
    const slice = { path, color: colors[i % colors.length], value: d.value, label: d.label };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} opacity={0.9} />
        ))}
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
        <div style={{ fontSize:"22px", fontWeight:800, color:"#F9FAFB", lineHeight:1 }}>{total}</div>
        <div style={{ fontSize:"9px", fontWeight:600, letterSpacing:"0.08em", color:"#4B5563", textTransform:"uppercase", marginTop:2 }}>Total</div>
      </div>
    </div>
  );
};

// ── Horizontal Bar Chart ──────────────────────────────────────────────
const HBarChart = ({ rows, color, unit, maxVal }) => {
  const max = maxVal || Math.max(...rows.map(r => r.value), 1);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      {rows.map((row, i) => (
        <div key={i}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
            <span style={{ fontSize:"11px", color:"#9CA3AF", maxWidth:"60%", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{row.label}</span>
            <span style={{ fontSize:"11px", fontWeight:700, color, fontFamily:"monospace" }}>{row.value.toLocaleString()} {unit}</span>
          </div>
          <div style={{ height:"7px", background:"#1F2937", borderRadius:"4px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(row.value/max)*100}%`, background:color, borderRadius:"4px", transition:"width 600ms ease", opacity: 0.85 }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Stat KPI Card ─────────────────────────────────────────────────────
const KpiCard = ({ label, value, unit, color, sub }) => (
  <div style={analyticsStyles.kpiCard}>
    <div style={{ fontSize:"11px", fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase", color:"#4B5563", marginBottom:"8px" }}>{label}</div>
    <div style={{ display:"flex", alignItems:"baseline", gap:"4px" }}>
      <div style={{ fontSize:"28px", fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {unit && <div style={{ fontSize:"13px", fontWeight:600, color:"#6B7280" }}>{unit}</div>}
    </div>
    {sub && <div style={{ fontSize:"10px", color:"#4B5563", marginTop:"4px" }}>{sub}</div>}
  </div>
);

// ── Legend ─────────────────────────────────────────────────────────────
const Legend = ({ items }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"6px", flex:1 }}>
    {items.map((item, i) => (
      <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <div style={{ width:10, height:10, borderRadius:"2px", background:item.color, flexShrink:0, boxShadow:`0 0 4px ${item.color}60` }}></div>
        <span style={{ fontSize:"11px", color:"#9CA3AF", flex:1 }}>{item.label}</span>
        <span style={{ fontSize:"12px", fontWeight:700, color:item.color, fontFamily:"monospace" }}>{item.value}</span>
      </div>
    ))}
  </div>
);

// ── Chart Card wrapper ─────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children }) => (
  <div style={analyticsStyles.chartCard}>
    <div style={analyticsStyles.chartHeader}>
      <div style={analyticsStyles.chartTitle}>{title}</div>
      {subtitle && <div style={analyticsStyles.chartSubtitle}>{subtitle}</div>}
    </div>
    {children}
  </div>
);

// ── Main Page ──────────────────────────────────────────────────────────
const AnalyticsPage = () => {
  const projects = MOCK_PROJECTS;

  const stats = useAM(() => {
    // Status
    const byStatus = [
      { label: "Pre-Construction", value: projects.filter(p => p.status === "Pre-Construction").length, color: "#3B82F6" },
      { label: "Construction",     value: projects.filter(p => p.status === "Construction").length,     color: "#F59E0B" },
      { label: "Energized",        value: projects.filter(p => p.status === "Energized").length,        color: "#10B981" },
    ];

    // Type
    const byType = [
      { label: "Power Plant", value: projects.filter(p => p.type === "Power Plant").length,       color: "#10B981" },
      { label: "Substation",  value: projects.filter(p => p.type === "Substation").length,        color: "#0E91A5" },
      { label: "SUTT 150kV",  value: projects.filter(p => p.subtype === "SUTT 150kV").length,     color: "#3B82F6" },
      { label: "SUTET 500kV", value: projects.filter(p => p.subtype === "SUTET 500kV").length,    color: "#F59E0B" },
    ];

    // Track
    const byTrack = [
      { label: "On Track",  value: projects.filter(p => getTrack(p) === "On Track").length,  color: "#10B981" },
      { label: "Delayed",   value: projects.filter(p => getTrack(p) === "Delayed").length,   color: "#EF4444" },
      { label: "Idle",      value: projects.filter(p => getTrack(p) === "Idle").length,      color: "#6B7280" },
      { label: "Energized", value: projects.filter(p => getTrack(p) === "Energized").length, color: "#8B5CF6" },
    ];

    // Total capacity KPIs
    const totalMW   = sumBy(projects.filter(p => p.capacityUnit === "MW" || p.capacityUnit === "MWp"), "capacity");
    const totalMVA  = sumBy(projects.filter(p => p.capacityUnit === "MVA"), "capacity");
    const totalKm   = sumBy(projects.filter(p => p.type === "Transmission Line"), "circuitLength");

    // MW by province
    const mwByProv = Object.entries(
      projects.filter(p => p.capacityUnit === "MW" || p.capacityUnit === "MWp")
        .reduce((acc, p) => { acc[p.province] = (acc[p.province]||0) + (p.capacity||0); return acc; }, {})
    ).sort((a,b) => b[1]-a[1]).map(([label, value]) => ({ label, value }));

    // km by province
    const kmByProv = Object.entries(
      projects.filter(p => p.type === "Transmission Line")
        .reduce((acc, p) => { acc[p.province] = (acc[p.province]||0) + (p.circuitLength||0); return acc; }, {})
    ).sort((a,b) => b[1]-a[1]).map(([label, value]) => ({ label, value }));

    // MVA by grid system
    const mvaByGrid = Object.entries(
      projects.filter(p => p.capacityUnit === "MVA")
        .reduce((acc, p) => { acc[p.gridSystem] = (acc[p.gridSystem]||0) + (p.capacity||0); return acc; }, {})
    ).sort((a,b) => b[1]-a[1]).map(([label, value]) => ({ label, value }));

    // MW by grid
    const mwByGrid = Object.entries(
      projects.filter(p => p.capacityUnit === "MW" || p.capacityUnit === "MWp")
        .reduce((acc, p) => { acc[p.gridSystem] = (acc[p.gridSystem]||0) + (p.capacity||0); return acc; }, {})
    ).sort((a,b) => b[1]-a[1]).map(([label, value]) => ({ label, value }));

    // Km by grid
    const kmByGrid = Object.entries(
      projects.filter(p => p.type === "Transmission Line")
        .reduce((acc, p) => { acc[p.gridSystem] = (acc[p.gridSystem]||0) + (p.circuitLength||0); return acc; }, {})
    ).sort((a,b) => b[1]-a[1]).map(([label, value]) => ({ label, value }));

    return { byStatus, byType, byTrack, totalMW, totalMVA, totalKm, mwByProv, kmByProv, mvaByGrid, mwByGrid, kmByGrid };
  }, [projects]);

  return (
    <div style={analyticsStyles.page}>
      {/* Page title */}
      <div style={analyticsStyles.pageHeader}>
        <div style={analyticsStyles.pageTitle}>Ringkasan Proyek RUPTL</div>
        <div style={analyticsStyles.pageSubtitle}>Statistik dan visualisasi seluruh proyek infrastruktur ketenagalistrikan nasional</div>
      </div>

      {/* KPI Row */}
      <div style={analyticsStyles.kpiRow}>
        <KpiCard label="Total Proyek"         value={projects.length}      color="#F9FAFB"  sub={`${stats.byStatus[2].value} Energized · ${stats.byStatus[1].value} Construction`} />
        <KpiCard label="Total Kapasitas"       value={stats.totalMW}        unit="MW"       color="#10B981" sub="Pembangkit (Power Plant)" />
        <KpiCard label="Panjang Jaringan"      value={stats.totalKm}        unit="km"       color="#3B82F6" sub="Transmisi SUTT & SUTET" />
        <KpiCard label="Kapasitas Transformator" value={stats.totalMVA}    unit="MVA"      color="#0E91A5" sub="Gardu Induk (Substation)" />
        <KpiCard label="Proyek Terlambat"      value={stats.byTrack[1].value} color="#EF4444" sub={`dari ${projects.length} total proyek`} />
      </div>

      {/* Donut charts row */}
      <div style={analyticsStyles.triRow}>
        <ChartCard title="Status Proyek" subtitle="Tahap pelaksanaan">
          <div style={analyticsStyles.donutRow}>
            <DonutChart data={stats.byStatus} colors={["#3B82F6","#F59E0B","#10B981"]} size={130} />
            <Legend items={stats.byStatus} />
          </div>
        </ChartCard>

        <ChartCard title="Progress Proyek" subtitle="On Track / Delayed / Idle">
          <div style={analyticsStyles.donutRow}>
            <DonutChart data={stats.byTrack} colors={["#10B981","#EF4444","#4B5563","#8B5CF6"]} size={130} />
            <Legend items={stats.byTrack} />
          </div>
        </ChartCard>

        <ChartCard title="Tipe Proyek" subtitle="Jenis infrastruktur">
          <div style={analyticsStyles.donutRow}>
            <DonutChart data={stats.byType} colors={["#10B981","#0E91A5","#3B82F6","#F59E0B"]} size={130} />
            <Legend items={stats.byType} />
          </div>
        </ChartCard>      </div>

      {/* Capacity by province row */}
      <div style={analyticsStyles.biRow}>
        <ChartCard title="Kapasitas Pembangkit per Provinsi" subtitle="MW · Power Plants">
          <HBarChart rows={stats.mwByProv} color="#10B981" unit="MW" />
        </ChartCard>
        <ChartCard title="Panjang Transmisi per Provinsi" subtitle="km · SUTT &amp; SUTET">
          <HBarChart rows={stats.kmByProv} color="#3B82F6" unit="km" />
        </ChartCard>
      </div>

      {/* Capacity by grid system row */}
      <div style={analyticsStyles.triRow}>
        <ChartCard title="Kapasitas Pembangkit per Sistem Grid" subtitle="MW">
          <HBarChart rows={stats.mwByGrid} color="#10B981" unit="MW" />
        </ChartCard>
        <ChartCard title="Kapasitas Transformator per Sistem Grid" subtitle="MVA · Gardu Induk">
          <HBarChart rows={stats.mvaByGrid} color="#0E91A5" unit="MVA" />
        </ChartCard>
        <ChartCard title="Panjang Transmisi per Sistem Grid" subtitle="km · SUTT &amp; SUTET">
          <HBarChart rows={stats.kmByGrid} color="#3B82F6" unit="km" />
        </ChartCard>
      </div>
    </div>
  );
};

const analyticsStyles = {
  page:        { flex:1, overflowY:"auto", background:"#0B1220", padding:"24px", display:"flex", flexDirection:"column", gap:"20px" },
  pageHeader:  {},
  pageTitle:   { fontSize:"20px", fontWeight:700, color:"#F9FAFB", marginBottom:"4px" },
  pageSubtitle:{ fontSize:"12px", color:"#6B7280" },

  kpiRow:  { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"12px" },
  kpiCard: { background:"#111827", border:"1px solid #1F2937", borderRadius:"8px", padding:"16px 18px" },

  triRow:  { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px" },
  biRow:   { display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:"14px" },

  chartCard:    { background:"#111827", border:"1px solid #1F2937", borderRadius:"8px", padding:"18px 20px" },
  chartHeader:  { marginBottom:"14px" },
  chartTitle:   { fontSize:"12px", fontWeight:700, color:"#E5E7EB" },
  chartSubtitle:{ fontSize:"10px", color:"#4B5563", marginTop:"2px" },

  donutRow: { display:"flex", alignItems:"center", gap:"16px" },
};

Object.assign(window, { AnalyticsPage });
