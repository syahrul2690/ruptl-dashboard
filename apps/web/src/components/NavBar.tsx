import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../lib/types';

const NAV_ITEMS: { path: string; label: string; roles: Role[] }[] = [
  { path: '/',          label: 'Peta Proyek',  roles: ['ADMIN', 'PIC', 'MANAGEMENT'] },
  { path: '/analytics', label: 'Ringkasan',    roles: ['ADMIN', 'PIC', 'MANAGEMENT'] },
  { path: '/input',     label: 'Input Proyek', roles: ['ADMIN', 'PIC'] },
  { path: '/admin',     label: 'Admin',        roles: ['ADMIN'] },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const items = NAV_ITEMS.filter(i => user && i.roles.includes(user.role));

  return (
    <div style={s.bar}>
      {/* Brand */}
      <div style={s.brand}>
        <span style={s.bolt}>⚡</span>
        <div style={s.sep} />
        <div>
          <div style={s.title}>RUPTL Dashboard</div>
          <div style={s.subtitle}>Perusahaan Listrik Negara · 2024–2033</div>
        </div>
      </div>

      {/* Tabs */}
      <nav style={s.tabs}>
        {items.map(item => {
          const active = pathname === item.path;
          return (
            <Link key={item.path} to={item.path} style={{
              ...s.tab,
              color:       active ? '#0E91A5' : '#6B7280',
              borderColor: active ? '#0E91A5' : 'transparent',
              background:  active ? 'rgba(14,145,165,0.08)' : 'transparent',
            }}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right — user + logout */}
      <div style={s.right}>
        <div style={s.statusDot} />
        <div style={s.userBlock}>
          <span style={s.userName}>{user?.name}</span>
          <span style={s.userRole}>{user?.role}</span>
        </div>
        <button onClick={logout} style={s.logoutBtn}>Keluar</button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bar:       { display:'flex', alignItems:'center', padding:'0 20px', height:52, background:'#111827', borderBottom:'1px solid #1F2937', flexShrink:0 },
  brand:     { display:'flex', alignItems:'center', gap:12, marginRight:24 },
  bolt:      { fontSize:18 },
  sep:       { width:1, height:20, background:'#1F2937' },
  title:     { fontSize:12, fontWeight:700, color:'#F9FAFB', lineHeight:1.2 },
  subtitle:  { fontSize:9,  color:'#4B5563' },
  tabs:      { display:'flex', gap:2, flex:1 },
  tab:       { display:'inline-flex', alignItems:'center', padding:'0 16px', height:52, fontSize:12, fontWeight:600, borderBottom:'2px solid', textDecoration:'none', transition:'all 150ms', whiteSpace:'nowrap' },
  right:     { display:'flex', alignItems:'center', gap:10, marginLeft:'auto' },
  statusDot: { width:6, height:6, borderRadius:'50%', background:'#10B981', boxShadow:'0 0 6px #10B981', animation:'pulse 2s infinite', flexShrink:0 },
  userBlock: { display:'flex', flexDirection:'column', alignItems:'flex-end' },
  userName:  { fontSize:11, fontWeight:600, color:'#E5E7EB' },
  userRole:  { fontSize:9, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.06em' },
  logoutBtn: { padding:'5px 12px', borderRadius:5, background:'transparent', color:'#6B7280', border:'1px solid #374151', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit' },
};
