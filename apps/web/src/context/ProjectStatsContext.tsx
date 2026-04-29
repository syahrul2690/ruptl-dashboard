import { createContext, useContext, useState, ReactNode } from 'react';
import { ProjectCounts } from '../components/FilterBar';

interface ProjectStatsCtx {
  counts:    ProjectCounts | null;
  setCounts: (c: ProjectCounts) => void;
}

const Ctx = createContext<ProjectStatsCtx>(null!);

export function ProjectStatsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<ProjectCounts | null>(null);
  return <Ctx.Provider value={{ counts, setCounts }}>{children}</Ctx.Provider>;
}

export const useProjectStats = () => useContext(Ctx);
