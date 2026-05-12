import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ProjectSlim, Project, ProjectStage, STAGE_CONFIG, TYPE_LABELS } from '../lib/types';
import { projectsApi } from '../lib/api';
import FilterBar, { ProjectCounts } from '../components/FilterBar';
import MapPanel from '../components/MapPanel';
import DetailPanel from '../components/DetailPanel';
import { useProjectStats } from '../context/ProjectStatsContext';
import { useColors } from '../context/ThemeContext';

export default function MapPage() {
  const { setCounts } = useProjectStats();
  const [projects,        setProjects]        = useState<ProjectSlim[]>([]);
  const [loadingMap,      setLoadingMap]       = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingDetail,   setLoadingDetail]   = useState(false);
  const [activeFilters,   setActiveFilters]   = useState<string[]>([]);
  const [activeProvinces, setActiveProvinces] = useState<string[]>([]);
  const [activeStages,    setActiveStages]    = useState<ProjectStage[]>([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const c = useColors();

  useEffect(() => {
    setLoadingMap(true);
    projectsApi.listSlim()
      .then(res => setProjects(res.data.data ?? res.data))
      .catch(console.error)
      .finally(() => setLoadingMap(false));
  }, []);

  const selectedRef = useRef(selectedProject);
  useEffect(() => { selectedRef.current = selectedProject; }, [selectedProject]);

  const handleSelectProject = useCallback(async (slim: ProjectSlim) => {
    if (selectedRef.current?.id === slim.id) { setSelectedProject(null); return; }
    setLoadingDetail(true);
    try {
      const res = await projectsApi.get(slim.id);
      setSelectedProject(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleProjectUpdated = useCallback((updated: Project) => {
    setSelectedProject(updated);
    setProjects(prev => prev.map(p =>
      p.id === updated.id
        ? { ...p, stage: updated.stage, status: updated.status, issueType: updated.issueType, urgencyCategory: updated.urgencyCategory, lat: updated.lat, lng: updated.lng, lineFromId: updated.lineFromId, lineToId: updated.lineToId }
        : p
    ));
  }, []);

  const handleProjectDeleted = useCallback((id: string) => {
    setSelectedProject(null);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const highlightedIds = useMemo(() => {
    if (!selectedProject) return [];
    return [selectedProject.id, ...(selectedProject.relatedProjects ?? [])];
  }, [selectedProject]);

  const projectCounts = useMemo((): ProjectCounts => {
    let total = 0, cod = 0, konstruksi = 0, gi = 0, trans = 0, kit = 0;
    for (const p of projects) {
      if (activeStages.length   > 0 && !activeStages.includes(p.stage)) continue;
      if (activeFilters.length  > 0 && !p.urgencyCategory.some(u => activeFilters.includes(u))) continue;
      if (activeProvinces.length > 0 && !activeProvinces.includes(p.province)) continue;
      total++;
      if (p.stage === 'COD')        cod++;
      if (p.stage === 'KONSTRUKSI') konstruksi++;
      if (p.type  === 'GI')         gi++;
      else if (p.type === 'TRANS')  trans++;
      else                          kit++;
    }
    return { total, cod, konstruksi, gi, trans, kit };
  }, [projects, activeFilters, activeProvinces, activeStages]);

  useEffect(() => { setCounts(projectCounts); }, [projectCounts, setCounts]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return projects.filter(p =>
      p.name.toLowerCase().includes(q) || p.province?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchQuery, projects]);

  const handleSearchSelect = useCallback(async (slim: ProjectSlim) => {
    setSearchQuery('');
    await handleSelectProject(slim);
  }, [handleSelectProject]);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', minHeight:0 }}>
      <FilterBar
        activeFilters={activeFilters}
        onToggle={opt => setActiveFilters(prev => prev.includes(opt) ? prev.filter(f => f !== opt) : [...prev, opt])}
        onClearAll={() => setActiveFilters([])}
        projectCounts={projectCounts}
        activeProvinces={activeProvinces}
        onProvinceToggle={prov => setActiveProvinces(prev => prev.includes(prov) ? prev.filter(p => p !== prov) : [...prev, prov])}
        onProvinceClear={() => setActiveProvinces([])}
        activeStages={activeStages}
        onStageToggle={s => setActiveStages(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
        onStageClear={() => setActiveStages([])}
      />

      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden', borderRight:`1px solid ${c.border}`, position:'relative' }}>
          {loadingMap && (
            <div style={{ position:'absolute', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', background:`${c.bgPage}CC`, flexDirection:'column', gap:10 }}>
              <div style={{ width:24, height:24, border:`2px solid ${c.spinnerBdr}`, borderTopColor:c.spinnerTop, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <span style={{ fontSize:12, color:c.textMuted }}>Memuat peta…</span>
            </div>
          )}
          <MapPanel
            projects={projects}
            selectedId={selectedProject?.id ?? null}
            highlightedIds={highlightedIds}
            onSelectProject={handleSelectProject}
            activeFilters={activeFilters}
            activeProvinces={activeProvinces}
            activeStages={activeStages}
          />
        </div>

        <div style={{ width:400, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', background:c.bgCard }}>
          <div ref={searchRef} style={{ padding:'10px 12px', borderBottom:`1px solid ${c.border}`, flexShrink:0, position:'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearchQuery('')}
              placeholder="Cari nama proyek atau provinsi…"
              style={{ width:'100%', boxSizing:'border-box', background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:6, padding:'7px 32px 7px 10px', fontSize:12, color:c.textPrimary, fontFamily:'inherit', outline:'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position:'absolute', right:20, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:c.textMuted, cursor:'pointer', fontSize:16, lineHeight:1, padding:2 }}>×</button>
            )}
            {searchResults.length > 0 && (
              <div style={{ position:'absolute', top:'calc(100% - 2px)', left:12, right:12, zIndex:500, background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:6, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', maxHeight:320, overflowY:'auto' }}>
                {searchResults.map(p => {
                  const cfg = STAGE_CONFIG[p.stage] ?? STAGE_CONFIG.OBC;
                  return (
                    <div key={p.id} onClick={() => handleSearchSelect(p)} style={{ padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid ${c.border}`, display:'flex', alignItems:'center', gap:10 }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:c.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize:10, color:c.textMuted, marginTop:1 }}>{TYPE_LABELS[p.type] ?? p.type} · {p.province}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div style={{ position:'absolute', top:'calc(100% - 2px)', left:12, right:12, zIndex:500, background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:6, padding:'12px', fontSize:12, color:c.textMuted, textAlign:'center' }}>Tidak ada proyek ditemukan</div>
            )}
          </div>

          <DetailPanel
            project={selectedProject}
            loading={loadingDetail}
            slimProjects={projects}
            onSelectProject={handleSelectProject}
            onProjectUpdated={handleProjectUpdated}
            onProjectDeleted={handleProjectDeleted}
          />
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'5px 20px', background:c.statusBar, borderTop:`1px solid ${c.border}`, flexShrink:0, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:c.textMuted, display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', boxShadow:'0 0 6px #10B981', animation:'pulse 2s infinite', display:'inline-block' }} />
          System Online
        </span>
        {[
          { color: '#F97316', label: 'SUTET 500 kV' },
          { color: '#A855F7', label: 'SUTT 275 kV'  },
          { color: '#38BDF8', label: 'SUTT 150 kV'  },
          { color: '#4ADE80', label: 'SUTT 70 kV'   },
        ].map(v => (
          <span key={v.label} style={{ fontSize:10, color:c.textMuted, display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ display:'inline-block', width:16, height:2, background:v.color, borderRadius:1 }} />
            {v.label}
          </span>
        ))}
        <span style={{ fontSize:10, color:c.textMuted }}>
          {(activeFilters.length > 0 || activeProvinces.length > 0 || activeStages.length > 0)
            ? `Filter aktif: ${[...activeStages.map(s => STAGE_CONFIG[s].label), ...activeProvinces, ...activeFilters].join(' · ')}`
            : `Menampilkan ${projects.length} proyek · Klik node untuk detail`}
        </span>
        <span style={{ fontSize:10, color:c.textMuted, marginLeft:'auto' }}>RUPTL 2024–2033 · PLN Pusat</span>
      </div>
    </div>
  );
}
