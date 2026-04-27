// AddProjectPage.jsx — Manual form + Excel upload

const { useState: useAddState, useRef: useAddRef, useCallback: useAddCallback } = React;

const FIELD_DEFS = [
  { key: "name",            label: "Nama Proyek",          type: "text",   required: true,  col: 2 },
  { key: "type",            label: "Tipe Proyek",          type: "select", required: true,  options: ["Power Plant","Substation","Transmission Line"] },
  { key: "subtype",         label: "Sub-tipe",             type: "select", required: true,  options: ["PLTU","PLTMG","PLTGU","PLTS","PLTM","GI 150kV","GIS 500kV","SUTT 150kV","SUTET 500kV"] },
  { key: "ruptlCode",       label: "Kode RUPTL",           type: "text",   required: true  },
  { key: "status",          label: "Status",               type: "select", required: true,  options: ["Pre-Construction","Construction","Energized"] },
  { key: "province",        label: "Provinsi",             type: "select", required: true,  options: ["Jawa Tengah","Jawa Barat","Jawa Timur","DKI Jakarta","Banten","Sumatera Utara","Sumatera Selatan","Sumatera Barat","Riau","Lampung","Kalimantan Timur","Kalimantan Selatan","Kalimantan Tengah","Kalimantan Barat","Sulawesi Selatan","Sulawesi Utara","Sulawesi Tengah","Papua","Papua Barat","Nusa Tenggara Barat","Nusa Tenggara Timur","Bali","Maluku"] },
  { key: "island",          label: "Pulau",                type: "select", required: true,  options: ["Java","Sumatra","Kalimantan","Sulawesi","Papua","Nusa Tenggara","Maluku","Bali"] },
  { key: "gridSystem",      label: "Sistem Grid",          type: "select", required: true,  options: ["Jawa-Madura-Bali (JAMALI)","Sumatera Bagian Utara","Sumatera Bagian Selatan","Kalimantan Timur","Kalimantan Selatan-Tengah","Sulawesi Selatan-Tenggara","Papua","Nusa Tenggara","Maluku"] },
  { key: "codTargetRUPTL",  label: "COD Target RUPTL",     type: "text",   placeholder: "e.g. Desember 2025" },
  { key: "codKontraktual",  label: "COD Kontraktual",      type: "text",   placeholder: "e.g. Maret 2026" },
  { key: "codEstimasi",     label: "COD Estimasi",         type: "text",   placeholder: "e.g. Juni 2026" },
  { key: "issueType",       label: "Issue Type",           type: "select", options: ["None","Land Acquisition","ROW","Permitting","Funding","Design","Other"] },
  { key: "progressPlan",    label: "Progress Plan (%)",    type: "number", min: 0, max: 100 },
  { key: "progressRealisasi", label: "Progress Realisasi (%)", type: "number", min: 0, max: 100 },
  { key: "capacity",        label: "Kapasitas (MW / MVA)", type: "number", min: 0 },
  { key: "capacityUnit",    label: "Satuan Kapasitas",     type: "select", options: ["MW","MVA","MWp"] },
  { key: "circuitLength",   label: "Panjang Jalur (km)",   type: "number", min: 0 },
  { key: "voltageLevel",    label: "Level Tegangan",       type: "select", options: ["—","150kV","500kV"] },
  { key: "lat",             label: "Latitude",             type: "number", placeholder: "e.g. -6.970" },
  { key: "lng",             label: "Longitude",            type: "number", placeholder: "e.g. 110.423" },
  { key: "urgencyCategory", label: "Kategori Urgensi",     type: "multiselect", options: ["Kehandalan Sistem","RUPTL","Penurunan BPP","Pemenuhan EBT","Kerawanan Sistem","Demand KTT","Evakuasi Daya"] },
  { key: "detail",          label: "Detail Informasi",     type: "textarea", col: 2 },
];

const EXCEL_COLUMNS = ["name","type","subtype","ruptlCode","status","province","island","gridSystem","codTargetRUPTL","codKontraktual","codEstimasi","issueType","progressPlan","progressRealisasi","capacity","capacityUnit","circuitLength","voltageLevel","lat","lng","urgencyCategory","detail"];

const AddProjectPage = ({ onProjectAdded }) => {
  const [tab, setTab]         = useAddState("form");
  const [form, setForm]       = useAddState({});
  const [errors, setErrors]   = useAddState({});
  const [submitted, setSubmitted] = useAddState(false);
  const [dragOver, setDragOver]   = useAddState(false);
  const [uploadResult, setUploadResult] = useAddState(null);
  const [previewRows, setPreviewRows]   = useAddState([]);
  const fileInputRef = useAddRef(null);

  const setValue = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleMulti = (key, val) => {
    setForm(f => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const validate = () => {
    const errs = {};
    FIELD_DEFS.filter(f => f.required).forEach(f => {
      if (!form[f.key] || form[f.key] === "") errs[f.key] = "Wajib diisi";
    });
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitted(true);
    setForm({});
    setErrors({});
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      setUploadResult({ type: "error", msg: "Format tidak didukung. Gunakan .xlsx, .xls, atau .csv" });
      return;
    }
    // Simulate parsing for demo (real impl would use SheetJS)
    setUploadResult({ type: "loading" });
    setTimeout(() => {
      const demo = MOCK_PROJECTS.slice(0, 3).map(p => ({
        name: p.name, type: p.type, subtype: p.subtype,
        status: p.status, province: p.province,
        progressPlan: p.progressPlan, progressRealisasi: p.progressRealisasi,
      }));
      setPreviewRows(demo);
      setUploadResult({ type: "success", count: demo.length, filename: file.name });
    }, 1200);
  };

  const downloadTemplate = () => {
    const header = EXCEL_COLUMNS.join(",");
    const example = ["PLTMG Contoh 150MW","Power Plant","PLTMG","RUPTL-XXX-001","Construction","Jawa Tengah","Java","Jawa-Madura-Bali (JAMALI)","Desember 2025","Maret 2026","Juni 2026","None","72","68","150","MW","","","−6.970","110.423","Kehandalan Sistem;RUPTL","Deskripsi proyek."].join(",");
    const csv = header + "\n" + example;
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "Template_RUPTL_Projects.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={addStyles.page}>
      <div style={addStyles.container}>
        {/* Page header */}
        <div style={addStyles.pageHeader}>
          <div>
            <div style={addStyles.pageTitle}>Input Data Proyek</div>
            <div style={addStyles.pageSubtitle}>Tambah proyek baru ke database RUPTL secara manual atau melalui unggah berkas Excel</div>
          </div>
        </div>

        {/* Method tabs */}
        <div style={addStyles.methodTabs}>
          {[
            { id: "form",   label: "Form Manual",   icon: "✎" },
            { id: "upload", label: "Unggah Excel",   icon: "⬆" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...addStyles.methodTab,
                background:  tab === t.id ? "#0E91A5" : "#1F2937",
                color:       tab === t.id ? "#fff" : "#9CA3AF",
                borderColor: tab === t.id ? "#0E91A5" : "#374151",
              }}
            >{t.icon} {t.label}</button>
          ))}
        </div>

        {/* ── MANUAL FORM ── */}
        {tab === "form" && (
          <div style={addStyles.card}>
            {submitted && (
              <div style={addStyles.successBanner}>
                ✓ Proyek berhasil ditambahkan ke database RUPTL.
              </div>
            )}
            <div style={addStyles.formGrid}>
              {FIELD_DEFS.map(field => (
                <div key={field.key} style={{ gridColumn: field.col === 2 ? "1 / -1" : "auto" }}>
                  <label style={addStyles.label}>
                    {field.label}
                    {field.required && <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>}
                  </label>

                  {field.type === "text" && (
                    <input
                      value={form[field.key] || ""}
                      onChange={e => setValue(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      style={{ ...addStyles.input, borderColor: errors[field.key] ? "#EF4444" : "#374151" }}
                    />
                  )}
                  {field.type === "number" && (
                    <input
                      type="number" min={field.min} max={field.max}
                      value={form[field.key] || ""}
                      onChange={e => setValue(field.key, e.target.value)}
                      placeholder={field.placeholder || ""}
                      style={{ ...addStyles.input, borderColor: errors[field.key] ? "#EF4444" : "#374151" }}
                    />
                  )}
                  {field.type === "select" && (
                    <select
                      value={form[field.key] || ""}
                      onChange={e => setValue(field.key, e.target.value)}
                      style={{ ...addStyles.input, ...addStyles.select, borderColor: errors[field.key] ? "#EF4444" : "#374151" }}
                    >
                      <option value="">— Pilih —</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {field.type === "textarea" && (
                    <textarea
                      value={form[field.key] || ""}
                      onChange={e => setValue(field.key, e.target.value)}
                      rows={3}
                      style={{ ...addStyles.input, resize: "vertical", lineHeight: 1.5 }}
                    />
                  )}
                  {field.type === "multiselect" && (
                    <div style={addStyles.multiSelect}>
                      {field.options.map(opt => {
                        const selected = (form[field.key] || []).includes(opt);
                        return (
                          <div
                            key={opt}
                            onClick={() => toggleMulti(field.key, opt)}
                            style={{
                              ...addStyles.multiChip,
                              background: selected ? "rgba(14,145,165,0.15)" : "transparent",
                              color: selected ? "#0E91A5" : "#6B7280",
                              borderColor: selected ? "#0E91A5" : "#374151",
                            }}
                          >{opt}</div>
                        );
                      })}
                    </div>
                  )}
                  {errors[field.key] && <div style={addStyles.errorMsg}>{errors[field.key]}</div>}
                </div>
              ))}
            </div>
            <div style={addStyles.formFooter}>
              <button onClick={() => { setForm({}); setErrors({}); }} style={addStyles.btnSecondary}>Reset</button>
              <button onClick={handleSubmit} style={addStyles.btnPrimary}>Simpan Proyek</button>
            </div>
          </div>
        )}

        {/* ── EXCEL UPLOAD ── */}
        {tab === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Format guide */}
            <div style={addStyles.card}>
              <div style={addStyles.sectionTitle}>Format Berkas Excel</div>
              <p style={addStyles.guideText}>Unduh template di bawah ini, isi data proyek sesuai kolom yang tersedia, lalu unggah kembali. Satu baris = satu proyek. Kolom <code style={addStyles.code}>urgencyCategory</code> dapat diisi lebih dari satu nilai, pisahkan dengan titik koma (<code style={addStyles.code}>;</code>).</p>
              <div style={addStyles.columnList}>
                {EXCEL_COLUMNS.map((col, i) => (
                  <span key={col} style={addStyles.colChip}>
                    <span style={{ color: "#4B5563", marginRight: 4 }}>{i+1}.</span>{col}
                  </span>
                ))}
              </div>
              <button onClick={downloadTemplate} style={{ ...addStyles.btnPrimary, marginTop: "14px", alignSelf: "flex-start" }}>
                ⬇ Unduh Template CSV
              </button>
            </div>

            {/* Drop zone */}
            <div style={addStyles.card}>
              <div style={addStyles.sectionTitle}>Unggah Berkas</div>
              <div
                style={{
                  ...addStyles.dropZone,
                  borderColor: dragOver ? "#0E91A5" : "#374151",
                  background:  dragOver ? "rgba(14,145,165,0.06)" : "rgba(255,255,255,0.02)",
                }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={addStyles.dropIcon}>📂</div>
                <div style={addStyles.dropTitle}>Seret & lepas berkas di sini</div>
                <div style={addStyles.dropSub}>atau klik untuk memilih · .xlsx, .xls, .csv</div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              </div>

              {/* Upload result */}
              {uploadResult?.type === "loading" && (
                <div style={addStyles.uploadStatus}>
                  <div style={addStyles.spinner}></div>
                  <span style={{ color: "#9CA3AF", fontSize: 12 }}>Memproses berkas…</span>
                </div>
              )}
              {uploadResult?.type === "error" && (
                <div style={{ ...addStyles.uploadStatus, color: "#EF4444" }}>✕ {uploadResult.msg}</div>
              )}
              {uploadResult?.type === "success" && (
                <div style={addStyles.uploadSuccess}>
                  ✓ {uploadResult.count} proyek berhasil dibaca dari <strong>{uploadResult.filename}</strong>
                </div>
              )}
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <div style={addStyles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={addStyles.sectionTitle}>Preview Data ({previewRows.length} baris)</div>
                  <button style={addStyles.btnPrimary}>Impor Semua</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={addStyles.table}>
                    <thead>
                      <tr>
                        {["Nama Proyek","Tipe","Sub-tipe","Status","Provinsi","Plan %","Realisasi %"].map(h => (
                          <th key={h} style={addStyles.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => {
                        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG["Pre-Construction"];
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #1F2937" }}>
                            <td style={addStyles.td}>{row.name}</td>
                            <td style={addStyles.td}>{row.type}</td>
                            <td style={addStyles.td}>{row.subtype}</td>
                            <td style={addStyles.td}>
                              <span style={{ color: cfg.color, fontWeight: 600, fontSize: 11 }}>{row.status}</span>
                            </td>
                            <td style={addStyles.td}>{row.province}</td>
                            <td style={{ ...addStyles.td, color: "#3B82F6", fontFamily: "monospace" }}>{row.progressPlan}%</td>
                            <td style={{ ...addStyles.td, color: "#10B981", fontFamily: "monospace" }}>{row.progressRealisasi}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const addStyles = {
  page:       { flex:1, overflowY:"auto", background:"#0B1220", padding:"24px" },
  container:  { maxWidth:"960px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"20px" },
  pageHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start" },
  pageTitle:  { fontSize:"20px", fontWeight:700, color:"#F9FAFB", marginBottom:"4px" },
  pageSubtitle:{ fontSize:"12px", color:"#6B7280" },
  methodTabs: { display:"flex", gap:"8px" },
  methodTab:  { padding:"8px 18px", borderRadius:"6px", fontSize:"13px", fontWeight:600, cursor:"pointer", border:"1px solid", transition:"all 150ms", fontFamily:"inherit" },
  card:       { background:"#111827", border:"1px solid #1F2937", borderRadius:"10px", padding:"24px", display:"flex", flexDirection:"column" },
  sectionTitle:{ fontSize:"11px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#4B5563", marginBottom:"12px" },
  formGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px 20px" },
  label:      { display:"block", fontSize:"11px", fontWeight:600, color:"#9CA3AF", marginBottom:"5px", letterSpacing:"0.02em" },
  input:      { width:"100%", background:"#0D1526", border:"1px solid", borderRadius:"6px", padding:"8px 12px", fontSize:"13px", color:"#F9FAFB", fontFamily:"'Plus Jakarta Sans',sans-serif", outline:"none" },
  select:     { appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236B7280'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center", paddingRight:"28px" },
  multiSelect:{ display:"flex", flexWrap:"wrap", gap:"5px" },
  multiChip:  { padding:"4px 10px", borderRadius:"9999px", fontSize:"11px", fontWeight:500, cursor:"pointer", border:"1px solid", transition:"all 100ms" },
  errorMsg:   { fontSize:"11px", color:"#EF4444", marginTop:"3px" },
  formFooter: { display:"flex", justifyContent:"flex-end", gap:"10px", marginTop:"24px", paddingTop:"16px", borderTop:"1px solid #1F2937" },
  btnPrimary: { padding:"8px 20px", borderRadius:"6px", background:"#0E91A5", color:"#fff", fontSize:"13px", fontWeight:600, border:"none", cursor:"pointer", fontFamily:"inherit" },
  btnSecondary:{ padding:"8px 20px", borderRadius:"6px", background:"#1F2937", color:"#9CA3AF", fontSize:"13px", fontWeight:600, border:"1px solid #374151", cursor:"pointer", fontFamily:"inherit" },
  successBanner:{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:"6px", padding:"10px 14px", fontSize:"13px", color:"#10B981", marginBottom:"20px" },
  guideText:  { fontSize:"12px", color:"#9CA3AF", lineHeight:1.6, marginBottom:"12px" },
  code:       { fontFamily:"monospace", background:"#1F2937", padding:"1px 5px", borderRadius:"3px", color:"#1BAFC4", fontSize:"11px" },
  columnList: { display:"flex", flexWrap:"wrap", gap:"6px" },
  colChip:    { fontSize:"11px", fontFamily:"monospace", background:"#1F2937", color:"#9CA3AF", padding:"3px 8px", borderRadius:"4px", border:"1px solid #374151" },
  dropZone:   { border:"2px dashed", borderRadius:"10px", padding:"40px 24px", textAlign:"center", cursor:"pointer", transition:"all 150ms" },
  dropIcon:   { fontSize:"32px", marginBottom:"10px" },
  dropTitle:  { fontSize:"14px", fontWeight:600, color:"#F9FAFB", marginBottom:"4px" },
  dropSub:    { fontSize:"12px", color:"#6B7280" },
  uploadStatus:{ display:"flex", alignItems:"center", gap:"8px", marginTop:"12px", padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:"6px" },
  uploadSuccess:{ marginTop:"12px", padding:"10px 14px", background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:"6px", fontSize:"12px", color:"#10B981" },
  spinner:    { width:"14px", height:"14px", border:"2px solid #374151", borderTopColor:"#0E91A5", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  table:      { width:"100%", borderCollapse:"collapse", fontSize:"12px" },
  th:         { padding:"8px 12px", textAlign:"left", fontSize:"10px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"#4B5563", borderBottom:"1px solid #1F2937", whiteSpace:"nowrap" },
  td:         { padding:"10px 12px", color:"#E5E7EB", whiteSpace:"nowrap" },
};

Object.assign(window, { AddProjectPage });
