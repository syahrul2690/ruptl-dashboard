export type Role          = 'ADMIN' | 'PIC' | 'MANAGEMENT';
export type ProjectStatus = 'ENERGIZED' | 'CONSTRUCTION' | 'PRE_CONSTRUCTION';
export type ProjectType   = 'POWER_PLANT' | 'SUBSTATION' | 'TRANSMISSION_LINE';

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
  status:          ProjectStatus;
  type:            ProjectType;
  subtype:         string;
  issueType:       string;
  name:            string;
  island:          string;
  province:        string;
  urgencyCategory: string[];
  lineFromId?:     string | null;
  lineToId?:       string | null;
}

export interface Project extends ProjectSlim {
  ruptlCode:         string;
  codTargetRUPTL?:   string;
  codKontraktual?:   string;
  codEstimasi?:      string;
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
  status?:   ProjectStatus;
  province?: string;
  island?:   string;
  urgency?:  string;
  search?:   string;
  page?:     number;
  limit?:    number;
  fields?:   'slim';
}

export const STATUS_CONFIG: Record<ProjectStatus, { color: string; bg: string; glow: string; label: string }> = {
  ENERGIZED:        { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  glow: 'rgba(16,185,129,0.5)',  label: 'Energized' },
  CONSTRUCTION:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  glow: 'rgba(245,158,11,0.5)',  label: 'Construction' },
  PRE_CONSTRUCTION: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  glow: 'rgba(59,130,246,0.5)',  label: 'Pre-Construction' },
};

export const URGENCY_OPTIONS = [
  'Kehandalan Sistem', 'RUPTL', 'Penurunan BPP',
  'Pemenuhan EBT', 'Kerawanan Sistem', 'Demand KTT', 'Evakuasi Daya',
];

export const URGENCY_COLORS: Record<string, string> = {
  'Kehandalan Sistem': '#008BA0',
  'RUPTL':             '#F9FAFB',
  'Penurunan BPP':     '#F59E0B',
  'Pemenuhan EBT':     '#10B981',
  'Kerawanan Sistem':  '#EF4444',
  'Demand KTT':        '#8B5CF6',
  'Evakuasi Daya':     '#3B82F6',
};

export const PROVINCE_OPTIONS = [
  'Jawa Tengah', 'Jawa Barat', 'Jawa Timur', 'DKI Jakarta', 'Banten',
  'Sumatera Utara', 'Sumatera Selatan', 'Sumatera Barat', 'Riau', 'Lampung',
  'Kalimantan Timur', 'Kalimantan Selatan', 'Kalimantan Tengah', 'Kalimantan Barat',
  'Sulawesi Selatan', 'Sulawesi Utara', 'Sulawesi Tengah',
  'Papua', 'Papua Barat', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Bali', 'Maluku',
];
