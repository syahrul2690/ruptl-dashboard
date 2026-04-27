import { CSSProperties } from 'react';
import { Project, ProjectSlim, STATUS_CONFIG } from '../lib/types';

interface Props {
  project:          Project | null;
  loading:          boolean;
  slimProjects:     ProjectSlim[];
  onSelectProject:  (p: ProjectSlim) => void;
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11, color:'#6B7280' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'monospace' }}>{value}%</span>
      </div>
      <div style={{ height:7, background:'#1F2937', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value}%`, background:color, borderRadius:4, transition:'width 600ms ease' }} />
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
      <span style={{ fontSize:11, color:'#6B7280' }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:500, color: highlight ? '#F59E0B' : '#E5E7EB', fontFamily:'monospace' }}>{value ?? '—'}</span>
    </div>
  );
}

function typeLabel(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function DetailPanel({ project, loading, slimProjects, onSelectProject }: Props) {
  if (loading) {
    return (
      <div style={d.empty}>
        <div style={{ width:20, height:20, border:'2px solid #374151', borderTopColor:'#0E91A5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <span style={{ fontSize:12, color:'#4B5563', marginTop:8 }}>Memuat detail…</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={d.empty}>
        <div style={{ fontSize:36, opacity:0.3 }}>⚡</div>
        <div style={{ fontSize:15, fontWeight:600, color:'#4B5563' }}>Pilih Proyek</div>
        <div style={{ fontSize:12, color:'#374151', lineHeight:1.5, maxWidth:200, textAlign:'center' }}>
          Klik node atau jalur transmisi pada peta untuk melihat detail proyek.
        </div>
      </div>
    );
  }

  const cfg       = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
  const dev       = project.deviasi;
  const devColor  = dev > 0 ? '#10B981' : dev < 0 ? '#EF4444' : '#9CA3AF';
  const devLabel  = dev > 0 ? `+${dev}%` : `${dev}%`;
  const devText   = dev > 0 ? '▲ Ahead of schedule' : dev < 0 ? '▼ Behind schedule' : '● On schedule';

  const related = (project.relatedProjects ?? [])
    .map(id => slimProjects.find(p => p.id === id))
    .filter(Boolean) as ProjectSlim[];

  return (
    <div style={d.panel}>
      {/* Header */}
      <div style={d.header}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', color:'#0E91A5', textTransform:'uppercase' }}>
            {typeLabel(project.type)} · {project.subtype}
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:4, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}40` }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color }} />
            {cfg.label}
          </div>
        </div>
        <div style={{ fontSize:16, fontWeight:700, color:'#F9FAFB', lineHeight:1.3, marginBottom:4 }}>{project.name}</div>
        <div style={{ fontSize:11, color:'#1BAFC4', fontFamily:'monospace', marginBottom:6 }}>{project.ruptlCode}</div>
        <span style={{ display:'inline-block', fontSize:10, fontWeight:600, color:'#4B5563', background:'#1F2937', padding:'2px 8px', borderRadius:9999, letterSpacing:'0.05em' }}>
          {project.island}
        </span>
      </div>

      {/* Scrollable body */}
      <div style={d.body}>
        <div style={d.section}>
          <div style={d.sTitle}>COD Dates</div>
          <Field label="COD Target RUPTL"  value={project.codTargetRUPTL} />
          <Field label="COD Kontraktual"   value={project.codKontraktual} />
          <Field label="COD Estimasi"      value={project.codEstimasi} highlight={project.codEstimasi !== project.codKontraktual} />
        </div>

        <div style={d.divider} />

        <div style={d.section}>
          <div style={d.sTitle}>Progress Fisik</div>
          <ProgressBar label="Progress Plan"      value={project.progressPlan}      color="#3B82F6" />
          <ProgressBar label="Progress Realisasi" value={project.progressRealisasi} color="#10B981" />
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
            <span style={{ fontSize:11, color:'#6B7280' }}>Deviasi</span>
            <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:devColor }}>{devLabel}</span>
            <span style={{ fontSize:11, color:devColor }}>{devText}</span>
          </div>
        </div>

        <div style={d.divider} />

        <div style={d.section}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:11, color:'#6B7280' }}>Issue Type</span>
            <span style={{ fontSize:12, fontWeight:600, color: project.issueType === 'None' ? '#10B981' : '#EF4444' }}>
              {project.issueType}
            </span>
          </div>
        </div>

        <div style={d.divider} />

        <div style={d.section}>
          <div style={d.sTitle}>Urgency Category</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {(project.urgencyCategory ?? []).map(u => (
              <span key={u} style={{ padding:'3px 8px', borderRadius:9999, fontSize:10, fontWeight:500, background:'rgba(14,145,165,0.1)', color:'#0E91A5', border:'1px solid rgba(14,145,165,0.3)' }}>
                {u}
              </span>
            ))}
          </div>
        </div>

        {project.detail && (
          <>
            <div style={d.divider} />
            <div style={d.section}>
              <div style={d.sTitle}>Detail Informasi</div>
              <p style={{ fontSize:12, color:'#9CA3AF', lineHeight:1.6 }}>{project.detail}</p>
            </div>
          </>
        )}

        {related.length > 0 && (
          <>
            <div style={d.divider} />
            <div style={d.section}>
              <div style={d.sTitle}>Rantai Evakuasi / Proyek Terkait</div>
              {related.map(rp => {
                const rpCfg = STATUS_CONFIG[rp.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
                return (
                  <div key={rp.id} onClick={() => onSelectProject(rp)} style={d.relCard}>
                    <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:rpCfg.color }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#E5E7EB', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rp.name}</div>
                      <div style={{ fontSize:10, color:'#4B5563', marginTop:1 }}>{typeLabel(rp.type)} · {rpCfg.label}</div>
                    </div>
                    <span style={{ fontSize:16, color:'#374151', flexShrink:0 }}>›</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const d: Record<string, CSSProperties> = {
  panel:   { display:'flex', flexDirection:'column', height:'100%', background:'#111827', overflow:'hidden' },
  empty:   { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, padding:'40px 24px', textAlign:'center' },
  header:  { padding:'16px 20px', background:'#0D1526', borderBottom:'1px solid #1F2937', flexShrink:0 },
  body:    { flex:1, overflowY:'auto', padding:0 },
  section: { padding:'14px 20px' },
  sTitle:  { fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#4B5563', marginBottom:10 },
  divider: { height:1, background:'#1F2937' },
  relCard: { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:6, background:'#0D1526', border:'1px solid #1F2937', marginBottom:6, cursor:'pointer' },
};
