import { useState, useRef, useEffect, CSSProperties } from 'react';
import { ProjectStatus, URGENCY_OPTIONS, URGENCY_COLORS, PROVINCE_OPTIONS } from '../lib/types';

export interface ProjectCounts {
  total:            number;
  energized:        number;
  construction:     number;
  preCon:           number;
  powerPlant:       number;
  substation:       number;
  transmissionLine: number;
}

interface Props {
  activeFilters:    string[];
  onToggle:         (opt: string) => void;
  onClearAll:       () => void;
  projectCounts:    ProjectCounts;
  activeProvinces:  string[];
  onProvinceToggle: (prov: string) => void;
  onProvinceClear:  () => void;
  activeStatuses:   ProjectStatus[];
  onStatusToggle:   (s: ProjectStatus) => void;
  onStatusClear:    () => void;
}

function hexToRgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

function ProvinceDropdown({ activeProvinces, onToggle, onClearAll }: {
  activeProvinces: string[]; onToggle: (p: string) => void; onClearAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const has   = activeProvinces.length > 0;
  const label = has
    ? activeProvinces.length === 1 ? activeProvinces[0] : `${activeProvinces.length} Provinsi`
    : 'Semua Provinsi';

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        ...f.pill,
        background:  has ? 'rgba(14,145,165,0.12)' : 'rgba(255,255,255,0.04)',
        color:       has ? '#0E91A5' : '#9CA3AF',
        borderColor: has ? 'rgba(14,145,165,0.5)' : '#374151',
        padding: '4px 11px', gap: 5,
      }}>
        📍 {label}
        <span style={{ marginLeft:2, display:'inline-block', transform:open?'rotate(180deg)':'none', transition:'transform 150ms' }}>▾</span>
      </button>

      {open && (
        <div style={f.dropdown}>
          <div style={f.dropHead}>
            <span style={f.dropTitle}>Filter Provinsi</span>
            {has && <button onClick={() => { onClearAll(); setOpen(false); }} style={f.dropClear}>Reset</button>}
          </div>
          {PROVINCE_OPTIONS.map(prov => {
            const active = activeProvinces.includes(prov);
            return (
              <div key={prov} onClick={() => onToggle(prov)} style={{ ...f.dropItem, background: active ? 'rgba(14,145,165,0.1)' : 'transparent', color: active ? '#0E91A5' : '#9CA3AF' }}>
                <div style={{ width:14, height:14, borderRadius:3, flexShrink:0, border:`1.5px solid ${active?'#0E91A5':'#374151'}`, background:active?'#0E91A5':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {active && <span style={{ color:'#fff', fontSize:9, lineHeight:1 }}>✓</span>}
                </div>
                {prov}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STATUS_PILLS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'ENERGIZED',        label: 'Energized',        color: '#10B981' },
  { value: 'CONSTRUCTION',     label: 'Construction',     color: '#F59E0B' },
  { value: 'PRE_CONSTRUCTION', label: 'Pre-Construction', color: '#3B82F6' },
];

export default function FilterBar({
  activeFilters, onToggle, onClearAll, projectCounts,
  activeProvinces, onProvinceToggle, onProvinceClear,
  activeStatuses, onStatusToggle, onStatusClear,
}: Props) {
  // suppress unused-var warning — projectCounts is kept in interface for MapPage
  void projectCounts;

  return (
    <div style={f.bar}>

      {/* Province dropdown */}
      <ProvinceDropdown activeProvinces={activeProvinces} onToggle={onProvinceToggle} onClearAll={onProvinceClear} />

      <div style={f.divider} />

      {/* Status filter */}
      <div style={{ ...f.group, flexShrink:0 }}>
        <span style={f.label}>STATUS</span>
        {STATUS_PILLS.map(({ value, label, color }) => {
          const active = activeStatuses.includes(value);
          return (
            <button key={value} onClick={() => onStatusToggle(value)} style={{
              ...f.pill,
              background:  active ? `rgba(${hexToRgb(color)},0.15)` : 'rgba(255,255,255,0.04)',
              color:       active ? color : '#6B7280',
              borderColor: active ? `rgba(${hexToRgb(color)},0.5)` : '#374151',
            }}>
              {active && <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />}
              {label}
            </button>
          );
        })}
        {activeStatuses.length > 0 && (
          <button onClick={onStatusClear} style={f.clearBtn}>✕</button>
        )}
      </div>

      <div style={f.divider} />

      {/* Urgency filter — flex:1 so it gets all remaining space */}
      <div style={{ ...f.group, flex:1, minWidth:0, flexWrap:'wrap' }}>
        <span style={f.label}>URGENCY</span>
        {URGENCY_OPTIONS.map(opt => {
          const active = activeFilters.includes(opt);
          const color  = URGENCY_COLORS[opt];
          return (
            <button key={opt} onClick={() => onToggle(opt)} style={{
              ...f.pill,
              background:  active ? `rgba(${hexToRgb(color)},0.15)` : 'rgba(255,255,255,0.04)',
              color:       active ? color : '#6B7280',
              borderColor: active ? `rgba(${hexToRgb(color)},0.5)` : '#374151',
            }}>
              {active && <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />}
              {opt}
            </button>
          );
        })}
        {activeFilters.length > 0 && (
          <button onClick={onClearAll} style={f.clearBtn}>✕ Clear</button>
        )}
      </div>

    </div>
  );
}

const f: Record<string, CSSProperties> = {
  bar:      { display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:'#111827', borderBottom:'1px solid #1F2937', flexShrink:0, flexWrap:'nowrap' },
  divider:  { width:1, height:24, background:'#1F2937', alignSelf:'center', flexShrink:0 },
  group:    { display:'flex', alignItems:'center', gap:5, flexWrap:'nowrap' },
  label:    { fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'#4B5563', flexShrink:0, textTransform:'uppercase' },
  pill:     { display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:9999, fontSize:10, fontWeight:500, cursor:'pointer', border:'1px solid', transition:'all 150ms', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap' },
  clearBtn: { padding:'3px 8px', borderRadius:9999, fontSize:10, fontWeight:600, background:'transparent', color:'#6B7280', border:'1px solid #374151', cursor:'pointer', fontFamily:'inherit', flexShrink:0 },
  dropdown: { position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:9999, background:'#111827', border:'1px solid #374151', borderRadius:8, minWidth:200, boxShadow:'0 8px 24px rgba(0,0,0,0.6)', overflow:'hidden', maxHeight:320, overflowY:'auto' },
  dropHead: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderBottom:'1px solid #1F2937' },
  dropTitle:{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#4B5563' },
  dropClear:{ fontSize:10, color:'#EF4444', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 },
  dropItem: { display:'flex', alignItems:'center', gap:8, padding:'8px 12px', fontSize:12, fontWeight:500, cursor:'pointer', transition:'background 100ms' },
};
