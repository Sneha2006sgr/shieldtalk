import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import RadarBackground from '../components/RadarBackground';

export default function Activate() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    api.post('/auth/verify-token', { token })
      .then(res => { setUser(res.data); setStatus('ready'); })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setStatus('loading');
    try {
      await api.post('/auth/set-password', { token, username: form.username, password: form.password });
      setStatus('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Activation failed.');
      setStatus('ready');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <RadarBackground />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🛡️</div>
          <h1 className="text-2xl font-bold text-military font-mono tracking-widest">ACCOUNT ACTIVATION</h1>
        </div>
        <div className="glass rounded-xl p-8 glow">
          {status === 'verifying' && <p className="text-military font-mono text-center animate-pulse">VERIFYING TOKEN...</p>}
          {status === 'invalid' && <p className="text-red-400 font-mono text-center">INVALID OR EXPIRED ACTIVATION LINK</p>}
          {status === 'done' && (
            <div className="text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="text-military font-mono">ACCOUNT ACTIVATED</p>
              <p className="text-gray-400 text-sm">Redirecting to login...</p>
            </div>
          )}
          {(status === 'ready' || status === 'loading') && (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-military font-mono text-sm text-center">Welcome, {user?.name}</p>
              {[
                { name: 'username', label: 'SET SERVICE ID', type: 'text', placeholder: 'Choose a username' },
                { name: 'password', label: 'SET PASSWORD', type: 'password', placeholder: '••••••••' },
                { name: 'confirm', label: 'CONFIRM PASSWORD', type: 'password', placeholder: '••••••••' }
              ].map(f => (
                <div key={f.name}>
                  <label className="text-xs text-military font-mono tracking-wider">{f.label}</label>
                  <input name={f.name} type={f.type} value={form[f.name]}
                    onChange={e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))}
                    className="w-full mt-1 bg-black/50 border border-green-500/30 text-white p-3 rounded font-mono focus:outline-none focus:border-green-400"
                    placeholder={f.placeholder} />
                </div>
              ))}
              {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
              <button type="submit" disabled={status === 'loading'}
                className="w-full py-3 bg-green-900/50 border border-green-500/50 text-military rounded hover:bg-green-800/50 transition font-mono tracking-wider disabled:opacity-50">
                {status === 'loading' ? 'ACTIVATING...' : 'ACTIVATE ACCOUNT'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
