import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts]   = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [logs, setLogs]           = useState([]);
  const [time, setTime]           = useState(new Date());
  const [pulse, setPulse]         = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    const pulseT = setInterval(() => setPulse(p => !p), 2000);
    return () => { clearInterval(interval); clearInterval(clock); clearInterval(pulseT); };
  }, []);

  const fetchData = () => {
    api.get('/messages/contacts').then(r => setContacts(r.data)).catch(() => {});
    api.get('/sos/my-alerts').then(r => setAlerts(r.data)).catch(() => {});
  };

  const online = contacts.filter(c => c.isOnline);
  const clearance = user?.role === 'hq_admin' ? 'LEVEL 5 — TOP SECRET' :
                    user?.role === 'admin_officer' ? 'LEVEL 4 — SECRET' :
                    user?.role === 'defence_personnel' ? 'LEVEL 2 — CONFIDENTIAL' : 'LEVEL 1 — RESTRICTED';

  return (
    <div className="p-6 space-y-5 min-h-full" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Top header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
            {time.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            WELCOME, <span style={{ color: 'var(--accent)' }}>{user?.name?.toUpperCase()}</span>
          </h1>
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
            CLEARANCE: <span style={{ color: 'var(--accent)' }}>{clearance}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ opacity: pulse ? 1 : 0.5 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
            SESSION SECURE
          </motion.div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold" style={{ color: 'var(--accent)' }}>
              {time.toLocaleTimeString('en-IN', { hour12: false })}
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>IST</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ONLINE NOW',    value: online.length,    icon: '🟢', color: '#22c55e' },
          { label: 'TOTAL CONTACTS',value: contacts.length,  icon: '👥', color: 'var(--accent)' },
          { label: 'SOS ALERTS',    value: alerts.length,    icon: '🚨', color: 'var(--danger)' },
          { label: 'CLEARANCE',     value: user?.role === 'hq_admin' ? 'L5' : user?.role === 'admin_officer' ? 'L4' : 'L2',
            icon: '🔐', color: 'var(--accent)' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ scale: 1.03, y: -2 }}
            className="rounded-xl p-5 cursor-default"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--glow)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{s.icon}</span>
              <motion.span className="text-3xl font-bold font-mono" style={{ color: s.color }}
                animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}>
                {s.value}
              </motion.span>
            </div>
            <p className="text-xs font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Online personnel */}
        <div className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono tracking-widest" style={{ color: 'var(--accent)' }}>
              ACTIVE PERSONNEL
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {online.length} ONLINE
            </span>
          </div>
          {contacts.length === 0 ? (
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No contacts available.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {contacts.map(c => (
                <motion.div key={c._id} whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                  onClick={() => navigate(`/chat?user=${c._id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border"
                        style={{ background: c.isOnline ? '#22c55e' : '#64748b', borderColor: 'var(--bg-card)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {c.role?.replace(/_/g, ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-mono px-3 py-1 rounded border transition hover:opacity-80"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)' }}>
                    CHAT
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-xl p-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-xs font-mono tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              QUICK ACTIONS
            </h2>
            <div className="space-y-2">
              {[
                { label: 'SECURE CHAT',  icon: '💬', path: '/chat',  color: 'var(--accent)' },
                { label: 'FILE VAULT',   icon: '📁', path: '/files', color: '#60a5fa' },
                { label: 'SOS ALERT',    icon: '🚨', path: '/sos',   color: 'var(--danger)' },
                { label: 'CAMERA',       icon: '📷', path: '/camera',color: '#a78bfa' },
              ].map(a => (
                <motion.button key={a.path} whileHover={{ x: 4 }} onClick={() => navigate(a.path)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-mono transition"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: a.color }}>
                  <span>{a.icon}</span>
                  <span>{a.label}</span>
                  <span className="ml-auto opacity-50">›</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Security status */}
          <div className="rounded-xl p-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-xs font-mono tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
              SECURITY STATUS
            </h2>
            {[
              { label: 'ENCRYPTION',   status: 'ACTIVE',  ok: true },
              { label: 'VPN TUNNEL',   status: 'ACTIVE',  ok: true },
              { label: 'FACE MONITOR', status: 'ACTIVE',  ok: true },
              { label: 'SOS ALERTS',   status: alerts.length > 0 ? `${alerts.length} ACTIVE` : 'CLEAR', ok: alerts.length === 0 },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0"
                style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <motion.span className="text-xs font-mono"
                  style={{ color: s.ok ? 'var(--accent)' : 'var(--danger)' }}
                  animate={{ opacity: s.ok ? 1 : [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: s.ok ? 0 : Infinity }}>
                  {s.status}
                </motion.span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── OPSEC notice ── */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--warn)' }}>
          ⚠ OPSEC REMINDER: All communications are monitored and encrypted.
          Unauthorized disclosure is a punishable offence under the Official Secrets Act, 1923.
        </p>
      </div>
    </div>
  );
}
