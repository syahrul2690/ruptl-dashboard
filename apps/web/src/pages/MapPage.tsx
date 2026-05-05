import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ProjectSlim, Project, ProjectStatus, STATUS_CONFIG } from '../lib/types';
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
  const [activeStatuses,  setActiveStatuses]  = useState<ProjectStatus[]>([]);
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

  const handleSelectProject = useCallback(async (slim: ProjectSlim) => {
    if (selectedProject?.id === slim.id) {
      setSelectedProject(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await projectsApi.get(slim.id);
      setSelectedProject(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedProject]);

  const handleProjectUpdated = useCallback((updated: Project) => {
    setSelectedProject(updated);
    setProjects(prev => prev.map(p =>
      p.id === updated.id
        ? { ...p, status: updated.status, issueType: updated.issueType, urgencyCategory: updated.urgencyCategory, lat: updated.lat, lng: updated.lng, lineFromId: updated.lineFromId, lineToId: updated.lineToId }
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
    const visible = projects.filter(p => {
      const statusOk   = activeStatuses.length  === 0 || activeStatuses.includes(p.status);
      const urgencyOk  = activeFilters.length   === 0 || p.urgencyCategory.some(u => activeFilters.includes(u));
      const provinceOk = activeProvinces.length === 0 || activeProvinces.includes(p.province);
      return statusOk && urgencyOk && provinceOk;
    });
    return {
      total:            visible.length,
      energized:        visible.filter(p => p.status === 'ENERGIZED').length,
      construction:     visible.filter(p => p.status === 'CONSTRUCTION').length,
      preCon:           visible.filter(p => p.status === 'PRE_CONSTRUCTION').length,
      powerPlant:       visible.filter(p => p.type === 'POWER_PLANT').length,
      substation:       visible.filter(p => p.type === 'SUBSTATION').length,
      transmissionLine: visible.filter(p => p.type === 'TRANSMISSION_LINE').length,
    };
  }, [projects, activeFilters, activeProvinces, activeStatuses]);

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
      {/* Filter bar */}
      <FilterBar
        activeFilters={activeFilters}
        onToggle={opt => setActiveFilters(prev => prev.includes(opt) ? prev.filter(f => f !== opt) : [...prev, opt])}
        onClearAll={() => setActiveFilters([])}
        projectCounts={projectCounts}
        activeProvinces={activeProvinces}
        onProvinceToggle={prov => setActiveProvinces(prev => prev.includes(prov) ? prev.filter(p => p !== prov) : [...prev, prov])}
        onProvinceClear={() => setActiveProvinces([])}
        activeStatuses={activeStatuses}
        onStatusToggle={s => setActiveStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
        onStatusClear={() => setActiveStatuses([])}
      />

      {/* Map + Detail panel row */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
        {/* Map area */}
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
            activeStatuses={activeStatuses}
          />
        </div>

        {/* Right panel: search + detail */}
        <div style={{ width:400, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', background:c.bgCard }}>

          {/* ── Search bar ── */}
          <div ref={searchRef} style={{ padding:'10px 12px', borderBottom:`1px solid ${c.border}`, flexShrink:0, position:'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setSearchQuery('')}
              placeholder="Cari nama proyek atau provinsi…"
              style={{
                width:'100%', boxSizing:'border-box',
                background:c.bgInput, border:`1px solid ${c.borderInput}`, borderRadius:6,
                padding:'7px 32px 7px 10px', fontSize:12, color:c.textPrimary,
                fontFamily:'inherit', outline:'none',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{
                position:'absolute', right:20, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', color:c.textMuted, cursor:'pointer', fontSize:16, lineHeight:1, padding:2,
              }}>×</button>
            )}

            {searchResults.length > 0 && (
              <div style={{
                position:'absolute', top:'calc(100% - 2px)', left:12, right:12, zIndex:500,
                background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:6,
                boxShadow:'0 8px 24px rgba(0,0,0,0.15)', maxHeight:320, overflowY:'auto',
              }}>
                {searchResults.map(p => {
                  const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PRE_CONSTRUCTION;
                  return (
                    <div key={p.id} onClick={() => handleSearchSelect(p)} style={{
                      padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid ${c.border}`,
                      display:'flex', alignItems:'center', gap:10,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.hoverBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:c.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize:10, color:c.textMuted, marginTop:1 }}>{p.type.replace(/_/g,' ')} · {p.province}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div style={{
                position:'absolute', top:'calc(100% - 2px)', left:12, right:12, zIndex:500,
                background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:6,
                padding:'12px', fontSize:12, color:c.textMuted, textAlign:'center',
              }}>Tidak ada proyek ditemukan</div>
            )}
          </div>

          {/* ── Detail panel ── */}
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

      {/* Status bar */}
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
          {(activeFilters.length > 0 || activeProvinces.length > 0 || activeStatuses.length > 0)
            ? `Filter aktif: ${[...activeStatuses.map(s => STATUS_CONFIG[s].label), ...activeProvinces, ...activeFilters].join(' · ')}`
            : `Menampilkan ${projects.length} proyek · Klik node untuk detail`}
        </span>
        <span style={{ fontSize:10, color:c.textMuted, marginLeft:'auto' }}>RUPTL 2024–2033 · PLN Pusat</span>
      </div>
    </div>
  );
}
