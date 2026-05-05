import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'simpp';

interface ThemeCtx { theme: Theme; toggleTheme: () => void; isDark: boolean; }

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggleTheme: () => {}, isDark: true });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('ruptl-theme') as Theme) ?? 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ruptl-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'simpp' : 'dark');
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// ── Color tokens ──────────────────────────────────────────────────────────────
export const DARK = {
  bgPage:      '#0B1220',
  bgCard:      '#111827',
  bgNavbar:    '#111827',
  bgInput:     '#0D1526',
  border:      '#1F2937',
  borderInput: '#374151',
  textPrimary: '#F9FAFB',
  textSec:     '#9CA3AF',
  textMuted:   '#4B5563',
  accent:      '#008BA0',
  navActive:   '#008BA0',
  navActiveBg: 'rgba(0,139,160,0.08)',
  hoverBg:     '#1F2937',
  divider:     '#1F2937',
  hbarTrack:   '#1F2937',
  spinnerBdr:  '#374151',
  spinnerTop:  '#008BA0',
  statusBar:   '#0D1526',
} as const;

export const SIMPP = {
  bgPage:      '#EAF2F8',
  bgCard:      '#FFFFFF',
  bgNavbar:    '#1B3A4B',
  bgInput:     '#F4F8FB',
  border:      '#DDE8F0',
  borderInput: '#CBD5E0',
  textPrimary: '#0F1F2B',
  textSec:     '#2E4A5E',
  textMuted:   '#5A7A8F',
  accent:      '#1B3A4B',
  navActive:   '#F6A821',
  navActiveBg: 'rgba(246,168,33,0.10)',
  hoverBg:     '#F4F8FB',
  divider:     '#DDE8F0',
  hbarTrack:   '#EEF3F8',
  spinnerBdr:  '#CBD5E0',
  spinnerTop:  '#1B3A4B',
  statusBar:   '#FFFFFF',
} as const;

export type ThemeTokens = {
  bgPage: string; bgCard: string; bgNavbar: string; bgInput: string;
  border: string; borderInput: string;
  textPrimary: string; textSec: string; textMuted: string;
  accent: string; navActive: string; navActiveBg: string;
  hoverBg: string; divider: string; hbarTrack: string;
  spinnerBdr: string; spinnerTop: string; statusBar: string;
};

export function useColors(): ThemeTokens {
  const { isDark } = useTheme();
  return isDark ? DARK : SIMPP;
}
