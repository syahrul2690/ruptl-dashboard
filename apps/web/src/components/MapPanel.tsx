import { useEffect, useRef, CSSProperties } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { ProjectSlim, STATUS_CONFIG, ProjectStatus } from '../lib/types';

interface Props {
  projects:        ProjectSlim[];
  selectedId:      string | null;
  highlightedIds:  string[];
  onSelectProject: (p: ProjectSlim) => void;
  activeFilters:   string[];
  activeProvinces: string[];
  activeStatuses:  ProjectStatus[];
}

// Derive line color from voltage level embedded in subtype string
// Falls back to status color if voltage can't be determined
function lineVoltageColor(subtype: string): string {
  const s = subtype.toUpperCase();
  if (s.includes('500')) return '#F97316'; // orange  — SUTET 500 kV
  if (s.includes('275')) return '#A855F7'; // purple  — SUTT 275 kV
  if (s.includes('150')) return '#38BDF8'; // sky     — SUTT 150 kV
  if (s.includes('70'))  return '#4ADE80'; // lime    — SUTT 70 kV
  return '#9CA3AF';                        // gray    — unknown
}

function nodeColor(p: ProjectSlim): string {
  return (STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION).color;
}

function markerHtml(p: ProjectSlim, isSel: boolean, isHl: boolean): string {
  const color    = nodeColor(p);
  const hasIssue = p.issueType !== 'None';
  const size     = isSel ? 22 : isHl ? 18 : 14;
  const glow     = size + 12;
  const isGI     = p.type === 'SUBSTATION';
  const shape    = isGI ? '' : 'border-radius:50%;';
  const rotate   = isGI ? 'transform:rotate(45deg);' : '';

  // White ring when selected
  const selRing   = isSel
    ? `<div style="position:absolute;width:${size+10}px;height:${size+10}px;${shape}${rotate}border:1.5px solid rgba(255,255,255,0.65);"></div>`
    : '';
  // Red border ring when issue exists — sits just outside the icon shape
  const issueRing = hasIssue
    ? `<div style="position:absolute;width:${size+5}px;height:${size+5}px;${shape}${rotate}border:2px solid #EF4444;box-shadow:0 0 7px rgba(239,68,68,0.55);z-index:2;"></div>`
    : '';

  if (isGI) {
    return `<div style="position:relative;width:${glow}px;height:${glow}px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:${isSel?0.35:0.12};filter:blur(5px);"></div>
      ${selRing}${issueRing}
      <div style="width:${size}px;height:${size}px;background:${color};transform:rotate(45deg);box-shadow:0 0 ${isSel?14:7}px ${color};z-index:1;"></div>
    </div>`;
  }
  return `<div style="position:relative;width:${glow}px;height:${glow}px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:${isSel?0.35:0.12};filter:blur(5px);"></div>
    ${selRing}${issueRing}
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 ${isSel?14:7}px ${color};z-index:1;display:flex;align-items:center;justify-content:center;">
      <div style="width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.9);"></div>
    </div>
  </div>`;
}

function tooltipHtml(p: ProjectSlim): string {
  const cfg   = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
  const tType = p.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `<div style="background:#111827;border:1px solid #374151;border-radius:6px;padding:8px 12px;font-family:'Plus Jakarta Sans',sans-serif;max-width:230px;box-shadow:0 4px 16px rgba(0,0,0,0.6);">
    <div style="font-size:10px;color:#0E91A5;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:3px;">${p.subtype} · ${p.island}</div>
    <div style="font-size:13px;font-weight:600;color:#F9FAFB;line-height:1.3;margin-bottom:6px;">${p.name}</div>
    <div style="display:flex;align-items:center;gap:5px;">
      <div style="width:6px;height:6px;border-radius:50%;background:${cfg.color};box-shadow:0 0 4px ${cfg.color};"></div>
      <span style="font-size:11px;color:${cfg.color};font-weight:600;">${cfg.label}</span>
    </div>
  </div>`;
}

function isVisible(p: ProjectSlim, filters: string[], provinces: string[], statuses: ProjectStatus[]): boolean {
  if (statuses.length > 0 && !statuses.includes(p.status)) return false;
  if (filters.length  > 0 && !p.urgencyCategory.some(u => filters.includes(u))) return false;
  if (provinces.length > 0 && !provinces.includes(p.province)) return false;
  return true;
}

export default function MapPanel({ projects, selectedId, highlightedIds, onSelectProject, activeFilters, activeProvinces, activeStatuses }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const clusterRef    = useRef<L.MarkerClusterGroup | null>(null);
  const linesRef      = useRef<L.Layer[]>([]);
  const labelsRef     = useRef<L.Layer[]>([]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;

    const map = L.map(container, {
      center: [-2.5, 118.0],
      zoom: 5,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    mapRef.current = map;

    // Force Leaflet to recalculate container size (fixes flex-layout height issues)
    setTimeout(() => map.invalidateSize(), 0);

    // Keep map sized correctly when the container resizes (e.g. panel open/close)
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);

    return () => ro.disconnect();
  }, []);

  // Redraw overlays when data/filters/selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous overlays
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    linesRef.current.forEach(l => map.removeLayer(l));
    labelsRef.current.forEach(l => map.removeLayer(l));
    linesRef.current = [];
    labelsRef.current = [];

    const byId = new Map(projects.map(p => [p.id, p]));

    // ── Transmission lines (drawn below markers) ─────────────────────
    projects
      .filter(p => p.type === 'TRANSMISSION_LINE' && p.lineFromId && p.lineToId && p.lineFromId !== p.lineToId)
      .forEach(line => {
        const from = byId.get(line.lineFromId!);
        const to   = byId.get(line.lineToId!);
        if (!from || !to || from.lat == null || from.lng == null || to.lat == null || to.lng == null) return;

        const visible  = isVisible(line, activeFilters, activeProvinces, activeStatuses);
        const isSel    = line.id === selectedId;
        const isHl     = highlightedIds.includes(line.id);
        const color    = lineVoltageColor(line.subtype);
        const weight   = isSel ? 4.5 : isHl ? 3.5 : 2.5;
        const opacity  = visible ? 1 : 0.06;
        const dash     = line.status === 'PRE_CONSTRUCTION' ? '8,5' : undefined;
        const latlngs: L.LatLngTuple[] = [[from.lat, from.lng], [to.lat, to.lng]];

        if (isSel || isHl) {
          const glow = L.polyline(latlngs, { color, weight: weight + 7, opacity: 0.18, dashArray: dash }).addTo(map);
          linesRef.current.push(glow);
        }
        const poly = L.polyline(latlngs, { color, weight, opacity, dashArray: dash }).addTo(map);
        poly.on('click', () => onSelectProject(line));
        poly.on('mouseover', () => poly.setStyle({ weight: weight + 2 }));
        poly.on('mouseout',  () => poly.setStyle({ weight }));
        linesRef.current.push(poly);

        // Mid-point label
        const mid: L.LatLngTuple = [(from.lat! + to.lat!) / 2, (from.lng! + to.lng!) / 2];
        const lblIcon = L.divIcon({
          className: '',
          html: `<div style="background:rgba(11,18,32,0.85);color:${color};font-size:9px;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;padding:2px 6px;border-radius:3px;border:1px solid ${color}40;white-space:nowrap;pointer-events:none;">${line.subtype}</div>`,
          iconAnchor: [30, 8],
        });
        const lbl = L.marker(mid, { icon: lblIcon, interactive: false, zIndexOffset: -100 }).addTo(map);
        labelsRef.current.push(lbl);
      });

    // ── Point markers (clustered) ─────────────────────────────────────
    if (typeof (L as any).markerClusterGroup !== 'function') {
      console.error('[MapPanel] L.markerClusterGroup is not available — leaflet.markercluster may not have loaded');
      return;
    }
    const cluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        return L.divIcon({
          html: `<div style="background:rgba(14,145,165,0.85);border:2px solid rgba(14,145,165,0.5);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;color:#fff;box-shadow:0 0 10px rgba(14,145,165,0.4);">${count}</div>`,
          className: '', iconSize: [34, 34], iconAnchor: [17, 17],
        });
      },
    }) as L.MarkerClusterGroup;

    projects
      .filter(p => p.type !== 'TRANSMISSION_LINE' && p.lat != null && p.lng != null)
      .forEach(p => {
        const isSel = p.id === selectedId;
        const isHl  = highlightedIds.includes(p.id);
        const vis   = isVisible(p, activeFilters, activeProvinces, activeStatuses);
        const sz    = isSel ? 34 : isHl ? 30 : 26;

        const icon = L.divIcon({
          className: '',
          html: markerHtml(p, isSel, isHl),
          iconSize:   [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
        });

        const marker = L.marker([p.lat!, p.lng!], {
          icon,
          opacity:       vis ? 1 : 0.08,
          zIndexOffset:  isSel ? 1000 : 0,
        });

        marker.on('click', () => onSelectProject(p));
        marker.bindTooltip(tooltipHtml(p), {
          direction: 'top',
          offset: [0, -(sz / 2 + 4)],
          permanent: false,
          className: 'pln-tooltip',
        });

        cluster.addLayer(marker);
      });

    map.addLayer(cluster);
    clusterRef.current = cluster;
    console.log(`[MapPanel] drew ${projects.filter(p => p.type !== 'TRANSMISSION_LINE' && p.lat != null).length} markers, ${projects.filter(p => p.type === 'TRANSMISSION_LINE').length} lines`);
  }, [projects, selectedId, highlightedIds, activeFilters, activeProvinces, activeStatuses]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div style={mp.wrapper}>
      <div ref={containerRef} style={mp.map} />
      <div style={mp.legend}>
        {[
          { type: 'circle',  color: '#10B981', label: 'Power Plant' },
          { type: 'diamond', color: '#0E91A5', label: 'Substation'  },
          { type: 'line',    color: '#F59E0B', label: 'SUTET 500kV' },
          { type: 'line',    color: '#3B82F6', label: 'SUTT 150kV'  },
          { type: 'circle',  color: '#EF4444', label: 'Has Issue'   },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            {item.type === 'circle'  && <div style={{ width:10, height:10, borderRadius:'50%', background:item.color, boxShadow:`0 0 6px ${item.color}` }} />}
            {item.type === 'diamond' && <div style={{ width:9,  height:9,  background:item.color, transform:'rotate(45deg)', boxShadow:`0 0 6px ${item.color}` }} />}
            {item.type === 'line'    && <div style={{ width:20, height:2.5, background:item.color, boxShadow:`0 0 4px ${item.color}`, borderRadius:2 }} />}
            <span style={{ fontSize:10, color:'#9CA3AF', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{item.label}</span>
          </div>
        ))}
      </div>
      <style>{`
        .leaflet-container { background: #0B1526 !important; font-family: 'Plus Jakarta Sans', sans-serif; }
        .leaflet-control-attribution { background: rgba(11,18,32,0.7) !important; color: #374151 !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: #4B5563 !important; }
        .leaflet-bar a { background: #111827 !important; color: #9CA3AF !important; border-color: #374151 !important; }
        .leaflet-bar a:hover { background: #1F2937 !important; color: #F9FAFB !important; }
        .pln-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .pln-tooltip .leaflet-tooltip-tip { display: none !important; }
        .leaflet-marker-icon { transition: opacity 300ms; }
      `}</style>
    </div>
  );
}

const mp: Record<string, CSSProperties> = {
  wrapper: { position:'relative', flex:1, overflow:'hidden' },
  map:     { width:'100%', height:'100%' },
  legend:  {
    position:'absolute', bottom:24, left:16, zIndex:1000,
    background:'rgba(11,18,32,0.88)', border:'1px solid #1F2937',
    borderRadius:8, padding:'10px 14px',
    display:'flex', flexDirection:'column', gap:7,
    backdropFilter:'blur(8px)',
  },
};
