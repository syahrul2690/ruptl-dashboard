// NavBar.jsx — Top navigation between pages

const NavBar = ({ activePage, onNavigate }) => {
  const pages = [
    { id: "map",       icon: navIcons.map,       label: "Peta Proyek" },
    { id: "analytics", icon: navIcons.analytics,  label: "Ringkasan" },
    { id: "input",     icon: navIcons.input,      label: "Input Proyek" },
  ];

  return (
    <div style={navStyles.bar}>
      {/* Brand */}
      <div style={navStyles.brand}>
        <img src={window.PLN_LOGO_B64} alt="PLN" style={navStyles.logo} onError={e => e.target.style.display="none"} />
        <div style={navStyles.brandSep}></div>
        <div>
          <div style={navStyles.title}>RUPTL Dashboard</div>
          <div style={navStyles.subtitle}>PT PLN (Persero) Pusat Manajemen Proyek</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={navStyles.tabs}>
        {pages.map(p => (
          <button
            key={p.id}
            onClick={() => onNavigate(p.id)}
            style={{
              ...navStyles.tab,
              color:       activePage === p.id ? "#0E91A5" : "#6B7280",
              borderColor: activePage === p.id ? "#0E91A5" : "transparent",
              background:  activePage === p.id ? "rgba(14,145,165,0.08)" : "transparent",
            }}
          >
            <span style={{ display:"flex", alignItems:"center" }} dangerouslySetInnerHTML={{ __html: p.icon }} />
            {p.label}
          </button>
        ))}
      </div>

      {/* Right status */}
      <div style={navStyles.right}>
        <div style={navStyles.statusDot}></div>
        <span style={navStyles.statusText}>System Online · 27 Apr 2026</span>
      </div>
    </div>
  );
};

const navIcons = {
  map: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>`,
  analytics: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  input: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
};

const navStyles = {
  bar: {
    display: "flex", alignItems: "center", gap: "0",
    padding: "0 20px", height: "52px",
    background: "#111827", borderBottom: "1px solid #1F2937",
    flexShrink: 0,
  },
  brand:    { display: "flex", alignItems: "center", gap: "12px", marginRight: "24px" },
  logo:     { height: "24px", filter: "brightness(0) invert(1)", flexShrink: 0 },
  brandSep: { width: "1px", height: "20px", background: "#1F2937" },
  title:    { fontSize: "12px", fontWeight: 700, color: "#F9FAFB" },
  subtitle: { fontSize: "9px", color: "#4B5563" },
  tabs:     { display: "flex", gap: "2px", flex: 1 },
  tab: {
    display: "inline-flex", alignItems: "center", gap: "0",
    padding: "0 16px", height: "52px",
    fontSize: "12px", fontWeight: 600,
    background: "transparent", border: "none", borderBottom: "2px solid",
    cursor: "pointer", transition: "all 150ms", fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  right:      { display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" },
  statusDot:  { width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981", animation: "pulse 2s infinite" },
  statusText: { fontSize: "10px", color: "#4B5563" },
};

Object.assign(window, { NavBar });
