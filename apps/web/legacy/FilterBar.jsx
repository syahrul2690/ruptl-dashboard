// FilterBar.jsx — Urgency + Province filters

const { useState: useFilterState, useRef: useFilterRef, useEffect: useFilterEffect } = React;

const urgencyColors = {
  "Kehandalan Sistem": "#0E91A5",
  "RUPTL":             "#F9FAFB",
  "Penurunan BPP":     "#F59E0B",
  "Pemenuhan EBT":     "#10B981",
  "Kerawanan Sistem":  "#EF4444",
  "Demand KTT":        "#8B5CF6",
  "Evakuasi Daya":     "#3B82F6",
};

// Province dropdown component
const ProvinceDropdown = ({ activeProvinces, onToggle, onClearAll }) => {
  const [open, setOpen] = useFilterState(false);
  const ref = useFilterRef(null);

  useFilterEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasActive = activeProvinces.length > 0;
  const label = hasActive
    ? activeProvinces.length === 1 ? activeProvinces[0] : `${activeProvinces.length} Provinsi`
    : "Semua Provinsi";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...fbStyles.provinceBtn,
          background: hasActive ? "rgba(14,145,165,0.12)" : "rgba(255,255,255,0.04)",
          color: hasActive ? "#0E91A5" : "#9CA3AF",
          borderColor: hasActive ? "rgba(14,145,165,0.5)" : "#374151",
          boxShadow: hasActive ? "0 0 8px rgba(14,145,165,0.2)" : "none",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "2px", transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={fbStyles.dropdown}>
          <div style={fbStyles.dropdownHeader}>
            <span style={fbStyles.dropdownTitle}>Filter Provinsi</span>
            {hasActive && (
              <button onClick={() => { onClearAll(); setOpen(false); }} style={fbStyles.dropdownClear}>Reset</button>
            )}
          </div>
          {PROVINCE_OPTIONS.map(prov => {
            const active = activeProvinces.includes(prov);
            return (
              <div
                key={prov}
                onClick={() => onToggle(prov)}
                style={{
                  ...fbStyles.dropdownItem,
                  background: active ? "rgba(14,145,165,0.1)" : "transparent",
                  color: active ? "#0E91A5" : "#9CA3AF",
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${active ? "#0E91A5" : "#374151"}`,
                  background: active ? "#0E91A5" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {active && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>}
                </div>
                {prov}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FilterBar = ({ activeFilters, onToggle, onClearAll, projectCounts, activeProvinces, onProvinceToggle, onProvinceClearAll }) => {
  return (
    <div style={fbStyles.bar}>
      {/* Logo + Title */}
      <div style={fbStyles.brand}>
        <img src={PLN_LOGO_B64} alt="PLN" style={fbStyles.logo} onError={e => { e.target.style.display="none"; }} />
        <div>
          <div style={fbStyles.title}>RUPTL Project Management Dashboard</div>
          <div style={fbStyles.subtitle}>PT PLN (Persero) Pusat Manajemen Proyek</div>
        </div>
      </div>

      {/* Province filter */}
      <ProvinceDropdown
        activeProvinces={activeProvinces}
        onToggle={onProvinceToggle}
        onClearAll={onProvinceClearAll}
      />

      {/* Divider */}
      <div style={fbStyles.divider}></div>

      {/* Urgency filter pills */}
      <div style={fbStyles.filterGroup}>
        <span style={fbStyles.filterLabel}>URGENCY</span>
        {URGENCY_OPTIONS.map(opt => {
          const active = activeFilters.includes(opt);
          const color  = urgencyColors[opt];
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              style={{
                ...fbStyles.pill,
                background: active ? `rgba(${hexToRgb(color)},0.15)` : "rgba(255,255,255,0.04)",
                color: active ? color : "#6B7280",
                borderColor: active ? `rgba(${hexToRgb(color)},0.5)` : "#374151",
                boxShadow: active ? `0 0 8px rgba(${hexToRgb(color)},0.2)` : "none",
              }}
            >
              {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }}></span>}
              {opt}
            </button>
          );
        })}
        {activeFilters.length > 0 && (
          <button onClick={onClearAll} style={fbStyles.clearBtn}>✕ Clear</button>
        )}
      </div>

      {/* Stats */}
      <div style={fbStyles.stats}>
        {[
          { label: "Total",        val: projectCounts.total,        color: "#9CA3AF" },
          { label: "Energized",    val: projectCounts.energized,    color: "#10B981" },
          { label: "Construction", val: projectCounts.construction, color: "#F59E0B" },
          { label: "Pre-Con",      val: projectCounts.preCon,       color: "#3B82F6" },
        ].map(s => (
          <div key={s.label} style={fbStyles.stat}>
            <div style={{ ...fbStyles.statVal, color: s.color }}>{s.val}</div>
            <div style={fbStyles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const fbStyles = {
  bar: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "8px 16px", background: "#111827",
    borderBottom: "1px solid #1F2937", flexWrap: "wrap", flexShrink: 0,
  },
  brand:    { display: "flex", alignItems: "center", gap: "10px" },
  logo:     { height: "26px", filter: "brightness(0) invert(1)" },
  title:    { fontSize: "12px", fontWeight: 700, color: "#F9FAFB", lineHeight: 1.2 },
  subtitle: { fontSize: "9px", color: "#4B5563", marginTop: "1px" },
  divider:  { width: "1px", height: "28px", background: "#1F2937", flexShrink: 0 },

  provinceBtn: {
    display: "inline-flex", alignItems: "center", gap: "5px",
    padding: "5px 11px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
    cursor: "pointer", border: "1px solid", transition: "all 150ms", fontFamily: "inherit",
    flexShrink: 0,
  },
  dropdown: {
    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 9999,
    background: "#111827", border: "1px solid #374151", borderRadius: "8px",
    minWidth: "200px", boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  dropdownHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 12px", borderBottom: "1px solid #1F2937",
  },
  dropdownTitle: { fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4B5563" },
  dropdownClear: { fontSize: "10px", color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  dropdownItem: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "8px 12px", fontSize: "12px", fontWeight: 500,
    cursor: "pointer", transition: "background 100ms",
  },

  filterGroup: { display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", flex: 1, minWidth: 0 },
  filterLabel: { fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#4B5563", flexShrink: 0, textTransform: "uppercase" },
  pill: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "3px 9px", borderRadius: "9999px", fontSize: "10px", fontWeight: 500,
    cursor: "pointer", border: "1px solid", transition: "all 150ms", fontFamily: "inherit",
  },
  clearBtn: {
    padding: "3px 9px", borderRadius: "9999px", fontSize: "10px", fontWeight: 600,
    background: "transparent", color: "#6B7280", border: "1px solid #374151",
    cursor: "pointer", fontFamily: "inherit",
  },
  stats: { display: "flex", gap: "14px", flexShrink: 0 },
  stat:  { textAlign: "center" },
  statVal:   { fontSize: "17px", fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", color: "#4B5563", textTransform: "uppercase", marginTop: "1px" },
};

Object.assign(window, { FilterBar, hexToRgb });
