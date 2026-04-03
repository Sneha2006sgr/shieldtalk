import { useState } from 'react';

export default function StepCredentials({ onPass }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return setError('All fields required.');
    setLoading(true);
    setError('');
    try {
      onPass(form);
    } catch {
      setError('Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div className="text-military text-sm tracking-widest">STEP 5 OF 6</div>
      <h2 className="text-2xl font-bold text-white">SECURE CREDENTIALS</h2>

      <form onSubmit={submit} className="space-y-4 max-w-xs mx-auto">
        <div className="text-left">
          <label className="text-xs text-military font-mono tracking-wider">SERVICE ID / USERNAME</label>
          <input name="username" value={form.username} onChange={handle}
            className="w-full mt-1 bg-black/50 border border-green-500/30 text-white p-3 rounded font-mono focus:outline-none focus:border-green-400"
            placeholder="Enter service ID" autoComplete="off" />
        </div>
        <div className="text-left">
          <label className="text-xs text-military font-mono tracking-wider">PASSWORD</label>
          <input name="password" type="password" value={form.password} onChange={handle}
            className="w-full mt-1 bg-black/50 border border-green-500/30 text-white p-3 rounded font-mono focus:outline-none focus:border-green-400"
            placeholder="••••••••••••" autoComplete="off" />
        </div>
        {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-green-900/50 border border-green-500/50 text-military rounded hover:bg-green-800/50 transition font-mono tracking-wider disabled:opacity-50">
          {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
        </button>
      </form>
    </div>
  );
}
