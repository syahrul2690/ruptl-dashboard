import { useState, useEffect, useMemo, useCallback } from 'react';
import { ProjectSlim, Project, ProjectStatus, STATUS_CONFIG } from '../lib/types';
import { projectsApi } from '../lib/api';
import FilterBar, { ProjectCounts } from '../components/FilterBar';
import MapPanel from '../components/MapPanel';
import DetailPanel from '../components/DetailPanel';
import { useProjectStats } from '../context/ProjectStatsContext';

export default function MapPage() {
  const { setCounts } = useProjectStats();
  const [projects,        setProjects]        = useState<ProjectSlim[]>([]);
  const [loadingMap,      setLoadingMap]       = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingDetail,   setLoadingDetail]   = useState(false);
  const [activeFilters,   setActiveFilters]   = useState<string[]>([]);
  const [activeProvinces, setActiveProvinces] = useState<string[]>([]);
  const [activeStatuses,  setActiveStatuses]  = useState<ProjectStatus[]>([]);

  // Fetch slim project list on mount
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

  // After an inline edit, update the full selected project AND patch the slim list
  const handleProjectUpdated = useCallback((updated: Project) => {
    setSelectedProject(updated);
    setProjects(prev => prev.map(p =>
      p.id === updated.id
        ? { ...p, status: updated.status, issueType: updated.issueType, urgencyCategory: updated.urgencyCategory }
        : p
    ));
  }, []);

  // After delete, remove from slim list and deselect
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

  // Sync counts to NavBar via context
  useEffect(() => { setCounts(projectCounts); }, [projectCounts, setCounts]);

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
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden', borderRight:'1px solid #1F2937', position:'relative' }}>
          {loadingMap && (
            <div style={{ position:'absolute', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(11,18,32,0.7)', flexDirection:'column', gap:10 }}>
              <div style={{ width:24, height:24, border:'2px solid #374151', borderTopColor:'#0E91A5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <span style={{ fontSize:12, color:'#4B5563' }}>Memuat peta…</span>
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

        {/* Right panel: detail */}
        <div style={{ width:400, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden', background:'#111827' }}>

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
      <div style={{ display:'flex', alignItems:'center', gap:20, padding:'5px 20px', background:'#0D1526', borderTop:'1px solid #1F2937', flexShrink:0 }}>
        {[
          { color: '#10B981', label: 'System Online' },
        ].map(s => (
          <span key={s.label} style={{ fontSize:10, color:'#4B5563', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, boxShadow:`0 0 6px ${s.color}`, animation:'pulse 2s infinite', display:'inline-block' }} />
            {s.label}
          </span>
        ))}
        <span style={{ fontSize:10, color:'#4B5563' }}>
          {(activeFilters.length > 0 || activeProvinces.length > 0 || activeStatuses.length > 0)
            ? `Filter aktif: ${[...activeStatuses.map(s => STATUS_CONFIG[s].label), ...activeProvinces, ...activeFilters].join(' · ')}`
            : `Menampilkan ${projects.length} proyek · Klik node untuk detail`}
        </span>
        <span style={{ fontSize:10, color:'#4B5563', marginLeft:'auto' }}>RUPTL 2024–2033 · PLN Pusat</span>
      </div>
    </div>
  );
}
