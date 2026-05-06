import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  if (user) { navigate('/', { replace: true }); return null; }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Email atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#FFFFFF' }}>
      {/* Left — form panel */}
      <div style={{ flex:'0 0 480px', display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 56px', background:'#FFFFFF' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:36 }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:'#1B3A4B', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:8 }}>
            <img src="/pln-logo.png" alt="PLN" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#1B3A4B', lineHeight:1.2 }}>RUPTL Dashboard</div>
            <div style={{ fontSize:10, color:'#8EA8BB' }}>Pusat Manajemen Proyek</div>
          </div>
        </div>

        <div style={{ fontSize:26, fontWeight:700, color:'#1A2F3D', marginBottom:28 }}>Selamat Datang!</div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#1A2F3D' }}>Email<span style={{ color:'#EF4444' }}>*</span></label>
            <input
              style={{ background:'#FFFFFF', border:'1.5px solid #CBD5E0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#1A2F3D', fontFamily:'inherit', outline:'none', width:'100%' }}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Masukkan email anda"
              autoFocus
              required
            />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#1A2F3D' }}>Password<span style={{ color:'#EF4444' }}>*</span></label>
            <input
              style={{ background:'#FFFFFF', border:'1.5px solid #CBD5E0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#1A2F3D', fontFamily:'inherit', outline:'none', width:'100%' }}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password anda"
              required
            />
          </div>
          {error && <div style={{ fontSize:12, color:'#EF4444', padding:'8px 12px', background:'rgba(239,68,68,0.06)', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
          <button style={{ background:'#1B3A4B', color:'#fff', border:'none', borderRadius:8, padding:'11px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'opacity 150ms', width:'100%', marginTop:4, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Masuk…' : 'Masuk'}
          </button>
        </form>
      </div>

      {/* Right — decorative panel */}
      <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#1B3A4B' }}>
        <img src="/login-bg.jpeg" alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.35 }} />
        <svg viewBox="0 0 200 600" preserveAspectRatio="none" style={{ position:'absolute', left:0, top:0, height:'100%', width:60, zIndex:1 }}>
          <path d="M60,0 Q0,150 60,300 Q0,450 60,600 L0,600 L0,0 Z" fill="white" />
        </svg>
        <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:20, padding:'0 48px' }}>
          <div style={{ width:108, height:108, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'2px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', padding:14 }}>
            <img src="/pln-logo.png" alt="PLN" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
          </div>
          <div style={{ fontSize:24, fontWeight:700, color:'#FFFFFF', lineHeight:1.3, textShadow:'0 2px 8px rgba(0,0,0,0.4)' }}>RUPTL Dashboard</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.7, textShadow:'0 1px 4px rgba(0,0,0,0.4)' }}>Pusat Manajemen Proyek<br />Monitoring &amp; pelaporan proyek ketenagalistrikan</div>
        </div>
      </div>
    </div>
  );
}
