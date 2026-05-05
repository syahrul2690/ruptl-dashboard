import { useState, useRef, useEffect, CSSProperties } from 'react';
import { ProjectStatus, URGENCY_OPTIONS, URGENCY_COLORS, PROVINCE_OPTIONS } from '../lib/types';
import { useColors } from '../context/ThemeContext';

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
  const c = useColors();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const has   = activeProvinces.length > 0;
  const label = has
    ? activeProvinces.length === 1 ? activeProvinces[0] : `${activeProvinces.length} Provinsi`
    : 'Semua Provinsi';

  const pillStyle: CSSProperties = {
    display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px',
    borderRadius:9999, fontSize:10, fontWeight:500, cursor:'pointer', border:'1px solid',
    transition:'all 150ms', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap',
    background:  has ? 'rgba(0,139,160,0.12)' : c.bgInput,
    color:       has ? '#008BA0' : c.textSec,
    borderColor: has ? 'rgba(0,139,160,0.5)' : c.borderInput,
  } as CSSProperties;

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0 }}>
      <button onClick={() => setOpen(o => !o)} style={pillStyle}>
        📍 {label}
        <span style={{ marginLeft:2, display:'inline-block', transform:open?'rotate(180deg)':'none', transition:'transform 150ms' }}>▾</span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:9999, background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:8, minWidth:200, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', overflow:'hidden', maxHeight:320, overflowY:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', borderBottom:`1px solid ${c.border}` }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:c.textMuted }}>Filter Provinsi</span>
            {has && <button onClick={() => { onClearAll(); setOpen(false); }} style={{ fontSize:10, color:'#EF4444', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Reset</button>}
          </div>
          {PROVINCE_OPTIONS.map(prov => {
            const active = activeProvinces.includes(prov);
            return (
              <div key={prov} onClick={() => onToggle(prov)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', fontSize:12, fontWeight:500, cursor:'pointer', transition:'background 100ms', background: active ? 'rgba(0,139,160,0.1)' : 'transparent', color: active ? '#008BA0' : c.textSec }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = c.hoverBg; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width:14, height:14, borderRadius:3, flexShrink:0, border:`1.5px solid ${active?'#008BA0':c.borderInput}`, background:active?'#008BA0':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
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
  void projectCounts;
  const c = useColors();

  const pill = (active: boolean, color: string): CSSProperties => ({
    display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px',
    borderRadius:9999, fontSize:10, fontWeight:500, cursor:'pointer', border:'1px solid',
    transition:'all 150ms', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap',
    background:  active ? `rgba(${hexToRgb(color)},0.15)` : c.bgInput,
    color:       active ? color : c.textSec,
    borderColor: active ? `rgba(${hexToRgb(color)},0.5)` : c.borderInput,
  });

  const clearBtn: CSSProperties = {
    padding:'3px 8px', borderRadius:9999, fontSize:10, fontWeight:600,
    background:'transparent', color:c.textSec, border:`1px solid ${c.borderInput}`,
    cursor:'pointer', fontFamily:'inherit', flexShrink:0,
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:c.bgCard, borderBottom:`1px solid ${c.border}`, flexShrink:0, flexWrap:'nowrap' }}>

      <ProvinceDropdown activeProvinces={activeProvinces} onToggle={onProvinceToggle} onClearAll={onProvinceClear} />

      <div style={{ width:1, height:24, background:c.border, alignSelf:'center', flexShrink:0 }} />

      {/* Status filter */}
      <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'nowrap', flexShrink:0 }}>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:c.textMuted, flexShrink:0, textTransform:'uppercase' }}>STATUS</span>
        {STATUS_PILLS.map(({ value, label, color }) => {
          const active = activeStatuses.includes(value);
          return (
            <button key={value} onClick={() => onStatusToggle(value)} style={pill(active, color)}>
              {active && <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />}
              {label}
            </button>
          );
        })}
        {activeStatuses.length > 0 && (
          <button onClick={onStatusClear} style={clearBtn}>✕</button>
        )}
      </div>

      <div style={{ width:1, height:24, background:c.border, alignSelf:'center', flexShrink:0 }} />

      {/* Urgency filter */}
      <div style={{ display:'flex', alignItems:'center', gap:5, flex:1, minWidth:0, flexWrap:'wrap' }}>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:c.textMuted, flexShrink:0, textTransform:'uppercase' }}>URGENCY</span>
        {URGENCY_OPTIONS.map(opt => {
          const active = activeFilters.includes(opt);
          const color  = URGENCY_COLORS[opt];
          return (
            <button key={opt} onClick={() => onToggle(opt)} style={pill(active, color)}>
              {active && <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />}
              {opt}
            </button>
          );
        })}
        {activeFilters.length > 0 && (
          <button onClick={onClearAll} style={clearBtn}>✕ Clear</button>
        )}
      </div>

    </div>
  );
}
