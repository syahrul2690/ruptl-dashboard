// DetailPanel.jsx — Project detail side panel

const DetailPanel = ({ project, allProjects, onSelectProject }) => {
  if (!project) {
    return (
      <div style={detailStyles.empty}>
        <div style={detailStyles.emptyIcon}>⚡</div>
        <div style={detailStyles.emptyTitle}>Select a Project</div>
        <div style={detailStyles.emptyText}>Click any node or transmission line on the map to view project details.</div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG["Pre-Construction"];
  const deviation = project.deviasi;
  const devColor = deviation > 0 ? "#10B981" : deviation < 0 ? "#EF4444" : "#9CA3AF";
  const devLabel = deviation > 0 ? `+${deviation}%` : `${deviation}%`;
  const devText = deviation > 0 ? "▲ Ahead of schedule" : deviation < 0 ? "▼ Behind schedule" : "● On schedule";

  const relatedProjects = (project.relatedProjects || [])
    .map(id => allProjects.find(p => p.id === id))
    .filter(Boolean);

  return (
    <div style={detailStyles.panel}>
      {/* Header */}
      <div style={detailStyles.header}>
        <div style={detailStyles.headerTop}>
          <div style={detailStyles.typeTag}>{project.type} · {project.subtype}</div>
          <div style={{ ...detailStyles.badge, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>
            <span style={{ ...detailStyles.dot, background: statusCfg.color }}></span>
            {project.status}
          </div>
        </div>
        <div style={detailStyles.projectName}>{project.name}</div>
        <div style={detailStyles.ruptlCode}>{project.ruptlCode}</div>
        <div style={detailStyles.islandTag}>{project.island}</div>
      </div>

      <div style={detailStyles.body}>
        {/* COD Dates */}
        <div style={detailStyles.section}>
          <div style={detailStyles.sectionTitle}>COD Dates</div>
          <div style={detailStyles.fieldGrid}>
            <Field label="COD Target RUPTL" value={project.codTargetRUPTL} />
            <Field label="COD Kontraktual" value={project.codKontraktual} />
            <Field label="COD Estimasi" value={project.codEstimasi} highlight={project.codEstimasi !== project.codKontraktual} />
          </div>
        </div>

        <div style={detailStyles.divider}></div>

        {/* Progress */}
        <div style={detailStyles.section}>
          <div style={detailStyles.sectionTitle}>Progress Fisik</div>
          <ProgressBar label="Progress Plan" value={project.progressPlan} color="#3B82F6" />
          <ProgressBar label="Progress Realisasi" value={project.progressRealisasi} color="#10B981" />
          <div style={detailStyles.devRow}>
            <span style={detailStyles.devLabel}>Deviasi</span>
            <span style={{ ...detailStyles.devValue, color: devColor }}>{devLabel}</span>
            <span style={{ fontSize: "11px", color: devColor }}>{devText}</span>
          </div>
        </div>

        <div style={detailStyles.divider}></div>

        {/* Issue */}
        <div style={detailStyles.section}>
          <div style={detailStyles.fieldRow}>
            <span style={detailStyles.fieldLabel}>Issue Type</span>
            <span style={{ ...detailStyles.fieldValue, color: project.issueType === "None" ? "#10B981" : "#EF4444", fontWeight: 600 }}>
              {project.issueType}
            </span>
          </div>
        </div>

        <div style={detailStyles.divider}></div>

        {/* Urgency */}
        <div style={detailStyles.section}>
          <div style={detailStyles.sectionTitle}>Urgency Category</div>
          <div style={detailStyles.tagRow}>
            {project.urgencyCategory.map(u => (
              <span key={u} style={detailStyles.urgencyTag}>{u}</span>
            ))}
          </div>
        </div>

        <div style={detailStyles.divider}></div>

        {/* Detail info */}
        <div style={detailStyles.section}>
          <div style={detailStyles.sectionTitle}>Detail Informasi</div>
          <p style={detailStyles.detailText}>{project.detail}</p>
        </div>

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <>
            <div style={detailStyles.divider}></div>
            <div style={detailStyles.section}>
              <div style={detailStyles.sectionTitle}>Rantai Evakuasi / Proyek Terkait</div>
              {relatedProjects.map(rp => {
                const rpCfg = STATUS_CONFIG[rp.status] || STATUS_CONFIG["Pre-Construction"];
                return (
                  <div key={rp.id} style={detailStyles.relatedCard} onClick={() => onSelectProject(rp)}>
                    <div style={{ ...detailStyles.relatedDot, background: rpCfg.color }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={detailStyles.relatedName}>{rp.name}</div>
                      <div style={detailStyles.relatedMeta}>{rp.type} · {rp.status}</div>
                    </div>
                    <span style={detailStyles.relatedArrow}>›</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value, highlight }) => (
  <div style={detailStyles.fieldRow}>
    <span style={detailStyles.fieldLabel}>{label}</span>
    <span style={{ ...detailStyles.fieldValue, color: highlight ? "#F59E0B" : "#E5E7EB" }}>{value}</span>
  </div>
);

const ProgressBar = ({ label, value, color }) => (
  <div style={{ marginBottom: "8px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ fontSize: "11px", color: "#6B7280" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 700, color, fontFamily: "monospace" }}>{value}%</span>
    </div>
    <div style={{ height: "7px", background: "#1F2937", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: "4px", transition: "width 600ms ease" }}></div>
    </div>
  </div>
);

const detailStyles = {
  panel: { display: "flex", flexDirection: "column", height: "100%", background: "#111827", overflow: "hidden" },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", padding: "40px 24px", textAlign: "center" },
  emptyIcon: { fontSize: "36px", opacity: 0.3 },
  emptyTitle: { fontSize: "15px", fontWeight: 600, color: "#4B5563" },
  emptyText: { fontSize: "12px", color: "#374151", lineHeight: 1.5, maxWidth: "200px" },

  header: { padding: "16px 20px", background: "#0D1526", borderBottom: "1px solid #1F2937", flexShrink: 0 },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  typeTag: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "#0E91A5", textTransform: "uppercase" },
  badge: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "4px", fontSize: "11px", fontWeight: 600 },
  dot: { width: "6px", height: "6px", borderRadius: "50%" },
  projectName: { fontSize: "16px", fontWeight: 700, color: "#F9FAFB", lineHeight: 1.3, marginBottom: "4px" },
  ruptlCode: { fontSize: "11px", color: "#1BAFC4", fontFamily: "monospace", marginBottom: "6px" },
  islandTag: { display: "inline-block", fontSize: "10px", fontWeight: 600, color: "#4B5563", background: "#1F2937", padding: "2px 8px", borderRadius: "9999px", letterSpacing: "0.05em" },

  body: { flex: 1, overflowY: "auto", padding: "0" },
  section: { padding: "14px 20px" },
  sectionTitle: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4B5563", marginBottom: "10px" },
  divider: { height: "1px", background: "#1F2937" },
  fieldGrid: {},
  fieldRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" },
  fieldLabel: { fontSize: "11px", color: "#6B7280" },
  fieldValue: { fontSize: "12px", fontWeight: 500, color: "#E5E7EB", fontFamily: "monospace" },

  devRow: { display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" },
  devLabel: { fontSize: "11px", color: "#6B7280" },
  devValue: { fontSize: "14px", fontWeight: 700, fontFamily: "monospace" },

  tagRow: { display: "flex", flexWrap: "wrap", gap: "5px" },
  urgencyTag: { padding: "3px 8px", borderRadius: "9999px", fontSize: "10px", fontWeight: 500, background: "rgba(14,145,165,0.1)", color: "#0E91A5", border: "1px solid rgba(14,145,165,0.3)" },

  detailText: { fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6 },

  relatedCard: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "6px", background: "#0D1526", border: "1px solid #1F2937", marginBottom: "6px", cursor: "pointer" },
  relatedDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  relatedName: { fontSize: "12px", fontWeight: 500, color: "#E5E7EB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  relatedMeta: { fontSize: "10px", color: "#4B5563", marginTop: "1px" },
  relatedArrow: { fontSize: "16px", color: "#374151", flexShrink: 0 },
};

Object.assign(window, { DetailPanel });
