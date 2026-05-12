export type Role = 'ADMIN' | 'PIC' | 'MANAGEMENT';

export type ProjectStage =
  | 'OBC'
  | 'CENTRALIZED_PLANNING'
  | 'TVV'
  | 'KOMITE_INVESTASI'
  | 'RKAP'
  | 'SKAI'
  | 'RENDAN'
  | 'LAKDAN'
  | 'KONSTRUKSI'
  | 'COD';

export type ProjectType =
  | 'GI'
  | 'TRANS'
  | 'KIT'
  | 'KIT_EBT'
  | 'KIT_NONEBT'
  | 'FSRU'
  | 'KIT_RELOKASI';

export interface User {
  id:    string;
  email: string;
  name:  string;
  role:  Role;
}

export interface ProjectSlim {
  id:              string;
  lat:             number | null;
  lng:             number | null;
  stage:           ProjectStage;
  status:          string;
  type:            ProjectType;
  subtype:         string;
  issueType:       string;
  name:            string;
  island:          string;
  region:          string;
  province:        string;
  urgencyCategory: string[];
  lineFromId?:     string | null;
  lineToId?:       string | null;
}

export interface Project extends ProjectSlim {
  ruptlCode:         string;
  priority?:         string | null;
  codTargetRUPTL?:   string;
  codKontraktual?:   string;
  codEstimasi?:      string;
  issueStrategic?:   string | null;
  progressPlan:      number;
  progressRealisasi: number;
  deviasi:           number;
  gridSystem:        string;
  capacity?:         number;
  capacityUnit?:     string;
  circuitLength?:    number;
  voltageLevel?:     string;
  lineFromId?:       string;
  lineToId?:         string;
  notification?:     string | null;
  bpoNotes?:         string | null;
  bpoLastModified?:  string | null;
  comment?:          string | null;
  detail?:           string;
  relatedProjects:   string[];
  createdAt:         string;
  updatedAt:         string;
}

export interface PaginatedResponse<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}

export interface ProjectFilters {
  stage?:    ProjectStage;
  status?:   string;
  province?: string;
  island?:   string;
  region?:   string;
  urgency?:  string;
  search?:   string;
  page?:     number;
  limit?:    number;
  fields?:   'slim';
}

// ── Stage config — 10 stages ──────────────────────────────────────────────────
export const STAGE_CONFIG: Record<ProjectStage, { color: string; bg: string; glow: string; label: string }> = {
  OBC:                  { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', glow: 'rgba(148,163,184,0.4)', label: '01. OBC' },
  CENTRALIZED_PLANNING: { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', glow: 'rgba(167,139,250,0.4)', label: '02. CP' },
  TVV:                  { color: '#818CF8', bg: 'rgba(129,140,248,0.12)', glow: 'rgba(129,140,248,0.4)', label: '03. TVV' },
  KOMITE_INVESTASI:     { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  glow: 'rgba(96,165,250,0.4)',  label: '04. KI' },
  RKAP:                 { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)',  glow: 'rgba(56,189,248,0.4)',  label: '05. RKAP' },
  SKAI:                 { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  glow: 'rgba(52,211,153,0.4)',  label: '06. SKAI' },
  RENDAN:               { color: '#86EFAC', bg: 'rgba(134,239,172,0.12)', glow: 'rgba(134,239,172,0.4)', label: '07. RENDAN' },
  LAKDAN:               { color: '#FCD34D', bg: 'rgba(252,211,77,0.12)',  glow: 'rgba(252,211,77,0.4)',  label: '08. LAKDAN' },
  KONSTRUKSI:           { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  glow: 'rgba(245,158,11,0.4)',  label: '09. Konstruksi' },
  COD:                  { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  glow: 'rgba(16,185,129,0.4)',  label: '10. COD' },
};

// Progress status values (from Excel STATUS column)
export const STATUS_OPTIONS = [
  'Leading', 'Lagging', 'On-track', 'Completed', 'Cancelled', 'Terminasi', 'Started',
];

export const STATUS_COLORS: Record<string, string> = {
  'Leading':    '#10B981',
  'On-track':   '#3B82F6',
  'Lagging':    '#EF4444',
  'Completed':  '#8B5CF6',
  'Cancelled':  '#6B7280',
  'Terminasi':  '#F59E0B',
  'Started':    '#38BDF8',
};

// ── Type labels ───────────────────────────────────────────────────────────────
export const TYPE_LABELS: Record<ProjectType, string> = {
  GI:          'Gardu Induk',
  TRANS:       'Transmisi',
  KIT:         'KIT',
  KIT_EBT:     'KIT-EBT',
  KIT_NONEBT:  'KIT-NONEBT',
  FSRU:        'FSRU',
  KIT_RELOKASI:'KIT (Relokasi)',
};

// ── Urgency ───────────────────────────────────────────────────────────────────
export const URGENCY_OPTIONS = [
  'RUPTL',
  'Pemenuhan EBT',
  'NON LIST',
  'Kerawanan Sistem',
  'Keandalan Sistem',
  'Evakuasi Daya',
  'KTT',
  'Interkoneksi',
  'Penurunan BPP',
  'Demand KTT',
];

export const URGENCY_COLORS: Record<string, string> = {
  'RUPTL':            '#64748B',
  'Pemenuhan EBT':    '#10B981',
  'NON LIST':         '#6B7280',
  'Kerawanan Sistem': '#EF4444',
  'Keandalan Sistem': '#008BA0',
  'Evakuasi Daya':    '#3B82F6',
  'KTT':              '#F59E0B',
  'Interkoneksi':     '#8B5CF6',
  'Penurunan BPP':    '#F472B6',
  'Demand KTT':       '#A78BFA',
};

// ── Region & Province ─────────────────────────────────────────────────────────
export const REGION_OPTIONS = ['JAMALI', 'SUMATERA', 'SULAWESI', 'KALIMANTAN', 'MAPA', 'NUSRA'];

export const PROVINCE_OPTIONS = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
  'Jambi', 'Bengkulu', 'Sumatera Selatan', 'Kepulauan Bangka Belitung', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah', 'Sulawesi Barat',
  'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara',
  'Papua Barat', 'Papua', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
];
