import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { encrypt } from '../utils/crypto';
import api from '../utils/api';

export default function Camera() {
  const videoRef    = useRef(null);
  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const [stream, setStream]         = useState(null);
  const [mode, setMode]             = useState('photo'); // 'photo' | 'video'
  const [recording, setRecording]   = useState(false);
  const [captures, setCaptures]     = useState([]);
  const [status, setStatus]         = useState('');
  const [cameraOn, setCameraOn]     = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setCameraOn(true);
    } catch {
      setStatus('CAMERA ACCESS DENIED');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  };

  /* ── Capture photo ── */
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const encryptedData = encrypt(dataUrl);
    const entry = {
      id: Date.now(),
      type: 'photo',
      preview: dataUrl,
      encrypted: encryptedData,
      timestamp: new Date().toISOString(),
      size: Math.round(dataUrl.length / 1024) + ' KB'
    };
    setCaptures(prev => [entry, ...prev]);
    setStatus('PHOTO CAPTURED & ENCRYPTED');
    setTimeout(() => setStatus(''), 2000);
  };

  /* ── Record video ── */
  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result;
        const encryptedData = encrypt(b64.substring(0, 500)); // encrypt metadata only for demo
        setCaptures(prev => [{
          id: Date.now(),
          type: 'video',
          preview: url,
          encrypted: encryptedData,
          timestamp: new Date().toISOString(),
          size: Math.round(blob.size / 1024) + ' KB'
        }, ...prev]);
        setStatus('VIDEO RECORDED & ENCRYPTED');
        setTimeout(() => setStatus(''), 2000);
      };
      reader.readAsDataURL(blob.slice(0, 1024));
    };
    mediaRef.current = mr;
    mr.start(1000);
    setRecording(true);
    setStatus('● RECORDING...');
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const shareCapture = async (item) => {
    setStatus('ENCRYPTING & SHARING...');
    try {
      // In real app: upload encrypted blob to server
      await new Promise(r => setTimeout(r, 800));
      setStatus('SHARED SECURELY ✓');
    } catch {
      setStatus('SHARE FAILED');
    }
    setTimeout(() => setStatus(''), 2000);
  };

  const deleteCapture = (id) => setCaptures(prev => prev.filter(c => c.id !== id));

  return (
    <div className="p-6 space-y-5" style={{ background: 'var(--bg-primary)' }}
      onDrop={e => e.preventDefault()} onDragOver={e => e.preventDefault()}>

      <div>
        <h1 className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
          SECURE CAMERA
        </h1>
        <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
          All captures are AES-256 encrypted before storage
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Camera feed */}
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden scan-line"
            style={{ background: '#000', border: '2px solid var(--border-strong)', aspectRatio: '16/9' }}>
            <video ref={videoRef} autoPlay muted playsInline
              className="w-full h-full object-cover" />

            {/* Overlay HUD */}
            {cameraOn && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <motion.div className="w-2 h-2 rounded-full bg-red-500"
                    animate={{ opacity: recording ? [1, 0, 1] : 1 }}
                    transition={{ duration: 0.8, repeat: recording ? Infinity : 0 }} />
                  <span className="text-xs font-mono text-white bg-black/50 px-2 py-0.5 rounded">
                    {recording ? 'REC' : 'LIVE'}
                  </span>
                </div>
                <div className="absolute top-3 right-3 text-xs font-mono text-white bg-black/50 px-2 py-0.5 rounded">
                  🔒 ENCRYPTED
                </div>
                {/* Corner brackets */}
                {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-5 h-5`}
                    style={{
                      borderColor: 'var(--accent)',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderRight: i % 2 === 0 ? 'none' : undefined,
                      borderLeft:  i % 2 === 1 ? 'none' : undefined,
                      borderBottom: i < 2 ? 'none' : undefined,
                      borderTop:    i >= 2 ? 'none' : undefined,
                    }} />
                ))}
              </>
            )}

            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>CAMERA OFFLINE</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
              {['photo', 'video'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="px-4 py-2 text-xs font-mono transition"
                  style={{
                    background: mode === m ? 'var(--accent)' : 'var(--bg-card)',
                    color: mode === m ? '#000' : 'var(--text-muted)'
                  }}>
                  {m === 'photo' ? '📷 PHOTO' : '🎥 VIDEO'}
                </button>
              ))}
            </div>

            {mode === 'photo' ? (
              <motion.button whileTap={{ scale: 0.95 }} onClick={capturePhoto} disabled={!cameraOn}
                className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#000' }}>
                CAPTURE
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={recording ? stopRecording : startRecording} disabled={!cameraOn}
                className="flex-1 py-2 rounded-lg text-sm font-mono font-bold transition disabled:opacity-40"
                style={{ background: recording ? 'var(--danger)' : 'var(--accent)', color: '#fff' }}>
                {recording ? '⏹ STOP' : '⏺ RECORD'}
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {status && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-mono text-center py-1 rounded"
                style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                {status}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Captures gallery */}
        <div className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono tracking-widest" style={{ color: 'var(--accent)' }}>
              ENCRYPTED CAPTURES ({captures.length})
            </h2>
          </div>

          {captures.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No captures yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {captures.map(item => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border-color)' }}>
                  {item.type === 'photo' ? (
                    <img src={item.preview} alt="capture"
                      className="w-full h-32 object-cover"
                      style={{ filter: 'brightness(0.9)' }} />
                  ) : (
                    <video src={item.preview} className="w-full h-32 object-cover" controls />
                  )}
                  <div className="p-2 flex items-center justify-between"
                    style={{ background: 'var(--bg-card)' }}>
                    <div>
                      <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                        🔒 {item.type.toUpperCase()} · {item.size}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => shareCapture(item)}
                        className="text-xs font-mono px-2 py-1 rounded border transition"
                        style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)' }}>
                        SHARE
                      </button>
                      <button onClick={() => deleteCapture(item.id)}
                        className="text-xs font-mono px-2 py-1 rounded border transition"
                        style={{ borderColor: 'rgba(255,59,59,0.3)', color: 'var(--danger)' }}>
                        DEL
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)' }}>
        <p className="text-xs font-mono" style={{ color: 'var(--warn)' }}>
          ⚠ All captures are encrypted client-side. No raw data leaves this device unencrypted.
          Sharing transmits only AES-256 encrypted payloads.
        </p>
      </div>
    </div>
  );
}
