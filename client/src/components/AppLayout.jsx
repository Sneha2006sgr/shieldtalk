import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import SecurityOverlay from './SecurityOverlay';
import FaceMonitor from './FaceMonitor';
import IdleTimer from './IdleTimer';
import api from '../utils/api';

export default function AppLayout({ children }) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated]);

  const handleViolation = async (type) => {
    try { await api.post('/auth/logout'); } catch {}
    if (type === 'TAB_SWITCH') {
      await logout();
      navigate('/login?reason=security_violation');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <StatusBar />
      <SecurityOverlay onViolation={handleViolation} />
      <FaceMonitor onLock={() => {}} />
      <IdleTimer />
      {/* Sidebar — fixed width, full height, below status bar */}
      <div style={{ width: 240, flexShrink: 0, paddingTop: 32 }}>
        <Sidebar />
      </div>
      {/* Main content — scrollable, below status bar */}
      <main style={{ flex: 1, paddingTop: 32, overflowY: 'auto', minWidth: 0, background: 'var(--bg-primary)' }}>
        {children}
      </main>
    </div>
  );
}
