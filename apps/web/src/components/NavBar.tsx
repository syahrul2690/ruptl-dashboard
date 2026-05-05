import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjectStats } from '../context/ProjectStatsContext';
import { useTheme, useColors } from '../context/ThemeContext';
import { Role } from '../lib/types';

const NAV_ITEMS: { path: string; label: string; roles: Role[] }[] = [
  { path: '/',          label: 'Peta Proyek',  roles: ['ADMIN', 'PIC', 'MANAGEMENT'] },
  { path: '/analytics', label: 'Ringkasan',    roles: ['ADMIN', 'PIC', 'MANAGEMENT'] },
  { path: '/input',     label: 'Input Proyek', roles: ['ADMIN', 'PIC'] },
  { path: '/admin',     label: 'Admin',        roles: ['ADMIN'] },
];

const STAT_CHIPS = [
  { key: 'total'           as const, label: 'Total',             darkColor: '#E5E7EB', lightColor: '#FFFFFF' },
  { key: 'preCon'          as const, label: 'Pre-Construction',  darkColor: '#3B82F6', lightColor: '#60A5FA' },
  { key: 'construction'    as const, label: 'Construction',      darkColor: '#F59E0B', lightColor: '#F6A821' },
  { key: 'energized'       as const, label: 'Energized',         darkColor: '#10B981', lightColor: '#34D399' },
  { key: 'powerPlant'      as const, label: 'Power Plant',       darkColor: '#10B981', lightColor: '#34D399' },
  { key: 'substation'      as const, label: 'Gardu Induk',       darkColor: '#008BA0', lightColor: '#38BDF8' },
  { key: 'transmissionLine'as const, label: 'Transmission Line', darkColor: '#F59E0B', lightColor: '#F6A821' },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { counts } = useProjectStats();
  const { toggleTheme, isDark } = useTheme();
  const c = useColors();
  const items = NAV_ITEMS.filter(i => user && i.roles.includes(user.role));

  const navBg     = c.bgNavbar;
  const navBorder = isDark ? '#1F2937' : '#152E3C';
  const dividerC  = isDark ? '#1F2937' : 'rgba(255,255,255,0.15)';

  return (
    <div style={{ display:'flex', alignItems:'center', padding:'0 20px', height:52, background:navBg, borderBottom:`1px solid ${navBorder}`, flexShrink:0 }}>
      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginRight:24 }}>
        <img src="/pln-logo.png" alt="PLN" style={{ height:36, width:'auto', objectFit:'contain' }} />
        <div style={{ width:1, height:20, background:dividerC }} />
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#FFFFFF', lineHeight:1.2 }}>RUPTL Dashboard</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)' }}>PT PLN (Persero) Pusat Manajemen Proyek</div>
        </div>
      </div>

      {/* Tabs */}
      <nav style={{ display:'flex', gap:2, flexShrink:0 }}>
        {items.map(item => {
          const active = pathname === item.path;
          return (
            <Link key={item.path} to={item.path} style={{
              display:'inline-flex', alignItems:'center', padding:'0 16px', height:52,
              fontSize:12, fontWeight:600, borderBottom:'2px solid', textDecoration:'none',
              transition:'all 150ms', whiteSpace:'nowrap',
              color:       active ? c.navActive : 'rgba(255,255,255,0.55)',
              borderColor: active ? c.navActive : 'transparent',
              background:  active ? c.navActiveBg : 'transparent',
            }}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Stats chips — only on map page */}
      {pathname === '/' && counts && (
        <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, overflowX:'auto', paddingLeft:8 }}>
          <div style={{ width:1, height:20, background:dividerC, flexShrink:0 }} />
          {STAT_CHIPS.map((chip, i) => {
            const color = isDark ? chip.darkColor : chip.lightColor;
            return (
              <div key={chip.key} style={{
                display:'flex', flexDirection:'column', alignItems:'center', padding:'0 7px', flexShrink:0,
                marginRight:  i === 3 ? 6 : 0,
                paddingRight: i === 3 ? 6 : undefined,
                borderRight:  i === 3 ? `1px solid ${dividerC}` : undefined,
              }}>
                <span style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', color, lineHeight:1 }}>
                  {counts[chip.key]}
                </span>
                <span style={{ fontSize:8, fontWeight:700, letterSpacing:'0.07em', color, opacity:0.6, textTransform:'uppercase', marginTop:1 }}>
                  {chip.label}
                </span>
              </div>
            );
          })}
          <div style={{ width:1, height:20, background:dividerC, flexShrink:0 }} />
        </div>
      )}

      {/* Right — theme toggle + user + logout */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:'auto', flexShrink:0 }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Beralih ke tema SIMPP' : 'Beralih ke tema Gelap'}
          style={{
            padding:'4px 10px', borderRadius:5, cursor:'pointer', fontFamily:'inherit',
            fontSize:11, fontWeight:600, border:`1px solid ${dividerC}`,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.75)',
            display:'flex', alignItems:'center', gap:5, transition:'all 150ms',
          }}
        >
          {isDark ? '☀ SIMPP' : '🌙 Gelap'}
        </button>

        <div style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', boxShadow:'0 0 6px #10B981', animation:'pulse 2s infinite', flexShrink:0 }} />
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
          <span style={{ fontSize:11, fontWeight:600, color:'#FFFFFF' }}>{user?.name}</span>
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{user?.role}</span>
        </div>
        <button onClick={logout} style={{
          padding:'5px 12px', borderRadius:5, background:'transparent',
          color:'rgba(255,255,255,0.6)', border:`1px solid ${dividerC}`,
          fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
        }}>Keluar</button>
      </div>
    </div>
  );
}
