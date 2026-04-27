// MapPanel.jsx — Leaflet-based interactive Indonesia map (fixed)

const { useEffect, useRef } = React;

const MapPanel = ({ projects, selectedId, highlightedIds, onSelectProject, activeFilters, activeProvinces }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersRef      = useRef({});
  const linesRef        = useRef({});

  // ── helpers ──────────────────────────────────────────────────────

  function getNodeColor(p) {
    if (p.issueType !== "None") return "#EF4444";
    return (STATUS_CONFIG[p.status] || STATUS_CONFIG["Pre-Construction"]).color;
  }

  function makeMarkerHtml(project, isSel, isHl) {
    const color = getNodeColor(project);
    const size  = isSel ? 22 : isHl ? 18 : 14;
    const glow  = size + 12;
    const isGI  = project.type === "Substation";

    if (isGI) {
      return `<div style="position:relative;width:${glow}px;height:${glow}px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:${isSel?0.35:0.12};filter:blur(5px);"></div>
        ${isSel ? `<div style="position:absolute;width:${size+10}px;height:${size+10}px;border:1.5px solid rgba(255,255,255,0.65);transform:rotate(45deg);"></div>` : ""}
        <div style="width:${size}px;height:${size}px;background:${color};transform:rotate(45deg);box-shadow:0 0 ${isSel?14:7}px ${color};z-index:1;"></div>
      </div>`;
    }
    return `<div style="position:relative;width:${glow}px;height:${glow}px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:${isSel?0.35:0.12};filter:blur(5px);"></div>
      ${isSel ? `<div style="position:absolute;width:${size+10}px;height:${size+10}px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.65);"></div>` : ""}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 ${isSel?14:7}px ${color};z-index:1;display:flex;align-items:center;justify-content:center;">
        <div style="width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.9);"></div>
      </div>
    </div>`;
  }

  function clearOverlays(map) {
    Object.values(markersRef.current).forEach(m => { try { map.removeLayer(m); } catch(e){} });
    Object.values(linesRef.current).forEach(l => { try { map.removeLayer(l); } catch(e){} });
    markersRef.current = {};
    linesRef.current   = {};
  }

  function drawOverlays(map, prjs, hlIds, selId, filters, provinces) {
    const L = window.L;
    if (!L || !map) return;

    function isVisible(p) {
      const urgencyOk  = filters.length === 0 || p.urgencyCategory.some(u => filters.includes(u));
      const provinceOk = !provinces || provinces.length === 0 || provinces.includes(p.province);
      return urgencyOk && provinceOk;
    }

    // Transmission lines (drawn below markers)
    prjs.filter(p => p.type === "Transmission Line").forEach(line => {
      const from = prjs.find(p => p.id === line.lineFrom);
      const to   = prjs.find(p => p.id === line.lineTo);
      if (!from || !to || !from.latlng || !to.latlng) return;
      if (from.id === to.id) return; // ring — skip for now

      const visible   = isVisible(line);
      const isSel     = selId === line.id;
      const isHl      = hlIds.includes(line.id);
      const color     = (STATUS_CONFIG[line.status] || STATUS_CONFIG["Pre-Construction"]).color;
      const opacity   = visible ? 1 : 0.08;
      const weight    = isSel ? 4.5 : isHl ? 3.5 : 2.5;
      const dash      = line.status === "Pre-Construction" ? "8,5" : null;

      if (isSel || isHl) {
        const glow = L.polyline([from.latlng, to.latlng], { color, weight: weight + 7, opacity: 0.18, dashArray: dash }).addTo(map);
        linesRef.current[line.id + "_glow"] = glow;
      }

      const poly = L.polyline([from.latlng, to.latlng], { color, weight, opacity, dashArray: dash }).addTo(map);
      poly.on("click", () => onSelectProject(line));
      poly.on("mouseover", () => poly.setStyle({ weight: weight + 2 }));
      poly.on("mouseout",  () => poly.setStyle({ weight }));
      linesRef.current[line.id] = poly;

      // Mid label
      const mid = [(from.latlng[0]+to.latlng[0])/2, (from.latlng[1]+to.latlng[1])/2];
      const lblIcon = L.divIcon({
        className: "",
        html: `<div style="background:rgba(11,18,32,0.85);color:${color};font-size:9px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;padding:2px 6px;border-radius:3px;border:1px solid ${color}40;white-space:nowrap;pointer-events:none;">${line.subtype}</div>`,
        iconAnchor: [30, 8],
      });
      const lbl = L.marker(mid, { icon: lblIcon, interactive: false, zIndexOffset: -100 }).addTo(map);
      linesRef.current[line.id + "_lbl"] = lbl;
    });

    // Point nodes
    prjs.filter(p => p.type !== "Transmission Line" && p.latlng).forEach(project => {
      const visible = isVisible(project);
      const isSel   = selId === project.id;
      const isHl    = hlIds.includes(project.id);
      const sz      = isSel ? 34 : isHl ? 30 : 26;
      const color   = getNodeColor(project);

      const icon = L.divIcon({
        className: "",
        html: makeMarkerHtml(project, isSel, isHl),
        iconSize:   [sz, sz],
        iconAnchor: [sz/2, sz/2],
      });

      const marker = L.marker(project.latlng, { icon, opacity: visible ? 1 : 0.1, zIndexOffset: isSel ? 1000 : 0 }).addTo(map);
      marker.on("click", () => onSelectProject(project));

      const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG["Pre-Construction"];
      marker.bindTooltip(
        `<div style="background:#111827;border:1px solid #374151;border-radius:6px;padding:8px 12px;font-family:'Plus Jakarta Sans',sans-serif;max-width:230px;box-shadow:0 4px 16px rgba(0,0,0,0.6);">
          <div style="font-size:10px;color:#0E91A5;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:3px;">${project.subtype} · ${project.island}</div>
          <div style="font-size:13px;font-weight:600;color:#F9FAFB;line-height:1.3;margin-bottom:6px;">${project.name}</div>
          <div style="display:flex;align-items:center;gap:5px;">
            <div style="width:6px;height:6px;border-radius:50%;background:${statusCfg.color};box-shadow:0 0 4px ${statusCfg.color};"></div>
            <span style="font-size:11px;color:${statusCfg.color};font-weight:600;">${project.status}</span>
          </div>
        </div>`,
        { direction: "top", offset: [0, -(sz/2+4)], permanent: false, className: "pln-tooltip" }
      );

      markersRef.current[project.id] = marker;
    });
  }

  // ── single combined effect ────────────────────────────────────────

  useEffect(() => {
    const L = window.L;
    if (!L || !mapContainerRef.current) return;

    // Init map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-2.5, 118.0],
        zoom: 5,
        zoomControl: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);
      mapInstanceRef.current = map;

      // Defer first draw until Leaflet is fully ready
      map.whenReady(() => {
        clearOverlays(map);
        drawOverlays(map, projects, highlightedIds, selectedId, activeFilters, activeProvinces);
      });
      return;
    }

    const map = mapInstanceRef.current;
    setTimeout(() => {
      clearOverlays(map);
      drawOverlays(map, projects, highlightedIds, selectedId, activeFilters, activeProvinces);
    }, 0);

  }, [projects, selectedId, highlightedIds, activeFilters, activeProvinces]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={mapPanelStyles.wrapper}>
      <div ref={mapContainerRef} style={mapPanelStyles.map}></div>
      <div style={mapPanelStyles.legend}>
        {[
          { type: "circle",  color: "#10B981", label: "Power Plant" },
          { type: "diamond", color: "#0E91A5", label: "Substation" },
          { type: "line",    color: "#F59E0B", label: "SUTET 500kV" },
          { type: "line",    color: "#3B82F6", label: "SUTT 150kV" },
          { type: "circle",  color: "#EF4444", label: "Has Issue" },
        ].map(item => (
          <div key={item.label} style={mapPanelStyles.legendItem}>
            {item.type === "circle"  && <div style={{ width:10, height:10, borderRadius:"50%", background:item.color, boxShadow:`0 0 6px ${item.color}` }}></div>}
            {item.type === "diamond" && <div style={{ width:9,  height:9,  background:item.color, transform:"rotate(45deg)", boxShadow:`0 0 6px ${item.color}` }}></div>}
            {item.type === "line"    && <div style={{ width:20, height:2.5, background:item.color, boxShadow:`0 0 4px ${item.color}`, borderRadius:2 }}></div>}
            <span style={mapPanelStyles.legendLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const mapPanelStyles = {
  wrapper: { position:"relative", flex:1, overflow:"hidden" },
  map:     { width:"100%", height:"100%" },
  legend: {
    position:"absolute", bottom:24, left:16, zIndex:1000,
    background:"rgba(11,18,32,0.88)", border:"1px solid #1F2937",
    borderRadius:8, padding:"10px 14px",
    display:"flex", flexDirection:"column", gap:7,
    backdropFilter:"blur(8px)",
  },
  legendItem:  { display:"flex", alignItems:"center", gap:8 },
  legendLabel: { fontSize:10, color:"#9CA3AF", fontFamily:"'Plus Jakarta Sans',sans-serif" },
};

Object.assign(window, { MapPanel });
