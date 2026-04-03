import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import RadarBackground from '../components/RadarBackground';
import StatusBar from '../components/StatusBar';

export default function Register() {
  const videoRef    = useRef(null);
  const [form, setForm]       = useState({ name: '', aadhaar: '', relation: '', role: 'defence_personnel' });
  const [photo, setPhoto]     = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream]   = useState(null);
  const [status, setStatus]   = useState('idle');
  const [message, setMessage] = useState('');

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      setStream(s);
      setCameraOpen(true);
      // Set srcObject after state update so the video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch { alert('Camera access denied — please allow camera permission'); }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth  || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(dataUrl);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
    canvas.toBlob(blob => {
      if (blob) setPhotoFile(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.85);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!photo) return setMessage('Please capture your photo for HQ verification.');
    setStatus('loading');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append('photo', photoFile);
      const res = await api.post('/auth/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(res.data.message);
      setStatus('success');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed.');
      setStatus('error');
    }
  };

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: 'var(--bg-primary)' }}>
      <RadarBackground />
      <StatusBar />

      <div className="relative z-10 w-full max-w-lg px-4 mt-8 pb-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🛡️</div>
          <h1 className="text-2xl font-bold tracking-widest font-mono" style={{ color: 'var(--accent)' }}>
            REQUEST ACCESS
          </h1>
          <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
            SHIELDTALK DEFENCE COMMUNICATION SYSTEM
          </p>
        </div>

        {status === 'success' ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-8 text-center space-y-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="text-5xl">✅</div>
            <p className="font-mono text-lg" style={{ color: 'var(--accent)' }}>REQUEST SUBMITTED</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              HQ will review your application including your photo and send an activation link.
            </p>
            <a href="/login" className="block mt-4 font-mono text-sm hover:underline" style={{ color: 'var(--accent)' }}>
              ← BACK TO LOGIN
            </a>
          </motion.div>
        ) : (
          <motion.div className="rounded-xl p-6 space-y-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--glow)' }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* Photo capture */}
            <div>
              <label className="text-xs font-mono tracking-wider" style={{ color: 'var(--accent)' }}>
                IDENTITY PHOTO (REQUIRED FOR HQ VERIFICATION)
              </label>
              <div className="mt-2 flex items-center gap-4">
                {photo ? (
                  <div className="relative">
                    <img src={photo} alt="ID" className="w-20 h-20 rounded-lg object-cover border-2"
                      style={{ borderColor: 'var(--accent)' }} />
                    <button onClick={() => setPhoto(null)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center"
                      style={{ background: 'var(--danger)', color: '#fff' }}>×</button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center"
                    style={{ borderColor: 'var(--border-strong)' }}>
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                <div className="space-y-2">
                  <button type="button" onClick={openCamera}
                    className="block px-4 py-2 rounded text-xs font-mono border transition"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                    📷 OPEN CAMERA
                  </button>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    Live photo required
                  </p>
                </div>
              </div>
            </div>

            {/* Camera modal */}
            <AnimatePresence>
              {cameraOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.85)' }}>
                  <div className="rounded-xl overflow-hidden p-4 space-y-3"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', width: 360 }}>
                    <p className="text-xs font-mono text-center" style={{ color: 'var(--accent)' }}>
                      POSITION YOUR FACE AND CAPTURE
                    </p>
                    <div className="relative rounded-lg overflow-hidden scan-line" style={{ aspectRatio: '4/3', background: '#000' }}>
                      <video ref={videoRef} autoPlay muted playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-32 h-40 rounded-full border-2 opacity-50"
                          style={{ borderColor: 'var(--accent)' }} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={capturePhoto}
                        className="flex-1 py-2 rounded text-sm font-mono font-bold"
                        style={{ background: 'var(--accent)', color: '#000' }}>
                        CAPTURE
                      </button>
                      <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); setCameraOpen(false); }}
                        className="px-4 py-2 rounded text-sm font-mono border"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                        CANCEL
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form fields */}
            <form onSubmit={submit} className="space-y-3">
              {[
                { name: 'name',     label: 'FULL NAME',       placeholder: 'As per service records' },
                { name: 'aadhaar',  label: 'AADHAAR NUMBER',  placeholder: 'XXXX XXXX XXXX' },
                { name: 'relation', label: 'UNIT / RELATION', placeholder: 'e.g. 21 Rajput Regiment' },
              ].map(f => (
                <div key={f.name}>
                  <label className="text-xs font-mono tracking-wider" style={{ color: 'var(--accent)' }}>
                    {f.label}
                  </label>
                  <input name={f.name} value={form[f.name]} onChange={handle} required
                    className="w-full mt-1 p-3 rounded font-mono text-sm focus:outline-none"
                    style={{ ...inputStyle, focusBorderColor: 'var(--accent)' }}
                    placeholder={f.placeholder} />
                </div>
              ))}

              <div>
                <label className="text-xs font-mono tracking-wider" style={{ color: 'var(--accent)' }}>ROLE</label>
                <select name="role" value={form.role} onChange={handle}
                  className="w-full mt-1 p-3 rounded font-mono text-sm focus:outline-none"
                  style={inputStyle}>
                  <option value="defence_personnel">Defence Personnel</option>
                  <option value="family_member">Family Member (Aadhaar-linked)</option>
                </select>
              </div>

              {status === 'error' && (
                <p className="text-sm font-mono" style={{ color: 'var(--danger)' }}>{message}</p>
              )}

              <button type="submit" disabled={status === 'loading'}
                className="w-full py-3 rounded font-mono tracking-wider text-sm font-bold transition disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#000' }}>
                {status === 'loading' ? 'SUBMITTING...' : 'SUBMIT REQUEST TO HQ'}
              </button>
            </form>

            <p className="text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              ALREADY REGISTERED?{' '}
              <a href="/login" className="hover:underline" style={{ color: 'var(--accent)' }}>LOGIN</a>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
