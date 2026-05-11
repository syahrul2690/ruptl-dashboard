import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectStatsProvider } from './context/ProjectStatsContext';
import { ThemeProvider, useColors } from './context/ThemeContext';
import { Role } from './lib/types';
import LoginPage     from './pages/LoginPage';
import MapPage       from './pages/MapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import InputPage     from './pages/InputPage';
import DataProyekPage from './pages/DataProyekPage';
import AdminPage     from './pages/AdminPage';
import NavBar        from './components/NavBar';

function Protected({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const c = useColors();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:c.bgPage, color:c.textMuted, fontSize:13 }}>
      Memuat…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Layout({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:c.bgPage }}>
      <NavBar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <ProjectStatsProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <Protected><Layout><MapPage /></Layout></Protected>
          } />
          <Route path="/analytics" element={
            <Protected><Layout><AnalyticsPage /></Layout></Protected>
          } />
          <Route path="/data-proyek" element={
            <Protected><Layout><DataProyekPage /></Layout></Protected>
          } />
          <Route path="/input" element={
            <Protected roles={['ADMIN', 'PIC']}><Layout><InputPage /></Layout></Protected>
          } />
          <Route path="/admin" element={
            <Protected roles={['ADMIN']}><Layout><AdminPage /></Layout></Protected>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ProjectStatsProvider>
    </ThemeProvider>
  );
}
