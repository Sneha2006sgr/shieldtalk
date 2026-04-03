import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';

export default function Files() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/files').then(r => setFiles(r.data)).catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setStatus('ENCRYPTING FILE...');
    const form = new FormData();
    form.append('file', file);
    setTimeout(async () => {
      try {
        await api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setStatus('FILE ENCRYPTED & UPLOADED');
        const res = await api.get('/files');
        setFiles(res.data);
      } catch {
        setStatus('UPLOAD FAILED');
      }
      setUploading(false);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-mono">SECURE FILE VAULT</h1>
        <p className="text-gray-500 text-sm font-mono mt-1">All files are AES-256 encrypted at rest</p>
      </div>

      {/* Upload */}
      <div className="glass rounded-xl p-6">
        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition
          ${uploading ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-green-500/30 hover:border-green-400/60 hover:bg-green-900/10'}`}>
          <div className="text-center">
            <div className="text-3xl mb-2">{uploading ? '🔐' : '📤'}</div>
            <p className="text-military font-mono text-sm">
              {uploading ? status : 'CLICK TO UPLOAD CLASSIFIED FILE'}
            </p>
            <p className="text-gray-600 text-xs font-mono mt-1">Max 10MB — All formats accepted</p>
          </div>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {/* File list */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-military font-mono text-sm tracking-widest mb-4">ENCRYPTED FILES ({files.length})</h2>
        {files.length === 0 ? (
          <p className="text-gray-600 font-mono text-sm">No files uploaded.</p>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <motion.div key={f._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 bg-black/30 rounded border border-green-500/10">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="text-white text-sm font-mono">{f.originalName}</p>
                    <p className="text-gray-500 text-xs font-mono">
                      {(f.size / 1024).toFixed(1)} KB • {new Date(f.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-military font-mono border border-green-500/30 px-2 py-1 rounded">ENCRYPTED</span>
                  <button onClick={() => api.post(`/files/access/${f._id}`)}
                    className="text-xs text-gray-400 font-mono border border-gray-700 px-2 py-1 rounded hover:border-green-500/30 hover:text-military transition">
                    VIEW
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-4 border border-yellow-500/20">
        <p className="text-yellow-400 font-mono text-xs">
          ⚠ External downloads are restricted. Files can only be accessed within the ShieldTalk ecosystem.
        </p>
      </div>
    </div>
  );
}
