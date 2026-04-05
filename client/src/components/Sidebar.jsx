import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { IconDashboard, IconChat, IconCamera, IconFiles, IconSOS, IconLogout } from './Icons';
import ShieldLogo from './ShieldLogo';

const navItems = [
  { path: '/dashboard', Icon: IconDashboard, label: 'DASHBOARD' },
  { path: '/chat',      Icon: IconChat,      label: 'SECURE CHAT' },
  { path: '/camera',   Icon: IconCamera,    label: 'CAMERA' },
  { path: '/files',    Icon: IconFiles,     label: 'FILES' },
  { path: '/sos',      Icon: IconSOS,       label: 'SOS ALERT' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{
      width: 240, height: '100%', minHeight: '100vh',
      background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldLogo size={24} />
          <div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, fontSize: 13 }}>
              SHIELDTALK
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)' }}>CLASSIFIED</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontWeight: 700, fontSize: 14,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>{user?.name}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--accent)' }}>
              {user?.role?.replace(/_/g, ' ').toUpperCase()}
            </div>
          </div>
        </div>
        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 10, color: 'var(--accent)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          SECURE SESSION ACTIVE
        </motion.div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ path, Icon, label }) => (
          <NavLink key={path} to={path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 6,
              fontFamily: 'monospace', fontSize: 12, letterSpacing: 1,
              textDecoration: 'none', transition: 'all 0.15s',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
            })}>
            {({ isActive }) => (
              <>
                <Icon size={16} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-color)' }}>
        <button onClick={handleLogout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
          fontFamily: 'monospace', fontSize: 12, letterSpacing: 1,
          background: 'transparent', border: '1px solid transparent',
          color: 'var(--danger)', transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,59,59,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <IconLogout size={16} color="var(--danger)" />
          <span>TERMINATE SESSION</span>
        </button>
      </div>
    </div>
  );
}
