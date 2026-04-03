import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Activate from './pages/Activate';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import SOS from './pages/SOS';
import Files from './pages/Files';
import Camera from './pages/Camera';
import HQDashboard from './pages/HQ';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !['hq_admin', 'admin_officer'].includes(user?.role)) return <Navigate to="/dashboard" />;
  return <AppLayout>{children}</AppLayout>;
}

function HQRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!['hq_admin', 'admin_officer'].includes(user?.role)) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/sos" element={<ProtectedRoute><SOS /></ProtectedRoute>} />
          <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
          <Route path="/camera" element={<ProtectedRoute><Camera /></ProtectedRoute>} />
          <Route path="/hq" element={<HQRoute><HQDashboard /></HQRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
