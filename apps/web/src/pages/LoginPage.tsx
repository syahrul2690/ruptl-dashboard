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
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <span style={s.bolt}>⚡</span>
        </div>
        <div style={s.title}>RUPTL Dashboard</div>
        <div style={s.subtitle}>Perusahaan Listrik Negara · 2024–2033</div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@pln.local"
              autoFocus
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Masuk…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0B1220' },
  card:    { background:'#111827', border:'1px solid #1F2937', borderRadius:12, padding:'40px 36px', width:380, display:'flex', flexDirection:'column', alignItems:'center', gap:6 },
  logoWrap:{ width:56, height:56, borderRadius:'50%', background:'rgba(14,145,165,0.12)', border:'1px solid rgba(14,145,165,0.3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 },
  bolt:    { fontSize:26 },
  title:   { fontSize:20, fontWeight:700, color:'#F9FAFB' },
  subtitle:{ fontSize:11, color:'#4B5563', marginBottom:20 },
  form:    { width:'100%', display:'flex', flexDirection:'column', gap:14 },
  field:   { display:'flex', flexDirection:'column', gap:5 },
  label:   { fontSize:11, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.03em' },
  input:   { background:'#0D1526', border:'1px solid #374151', borderRadius:6, padding:'9px 12px', fontSize:13, color:'#F9FAFB', fontFamily:'inherit', outline:'none', width:'100%' },
  error:   { fontSize:12, color:'#EF4444', padding:'8px 12px', background:'rgba(239,68,68,0.08)', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)' },
  btn:     { background:'#0E91A5', color:'#fff', border:'none', borderRadius:6, padding:'10px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'opacity 150ms', width:'100%' },
};
