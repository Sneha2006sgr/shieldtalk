import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Simulates continuous face monitoring — locks screen if "multiple faces" detected
export default function FaceMonitor({ onLock }) {
  const videoRef = useRef(null);
  const [locked, setLocked] = useState(false);
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    let stream;
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(s => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        // Simulate random multi-face detection for demo
        const interval = setInterval(() => {
          if (Math.random() < 0.02) { // 2% chance per check
            setWarning(true);
            setTimeout(() => {
              setLocked(true);
              onLock?.();
            }, 2000);
          }
        }, 5000);
        return () => clearInterval(interval);
      })
      .catch(() => {});

    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);

  return (
    <>
      {/* Hidden camera feed */}
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />

      <AnimatePresence>
        {warning && !locked && (
          <motion.div className="fixed top-16 right-4 z-50 glass-dark border border-red-500/50 rounded-lg p-3 glow-red"
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <p className="text-red-400 font-mono text-xs">⚠ MULTIPLE FACES DETECTED</p>
            <p className="text-gray-500 text-xs">Locking in 2s...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {locked && (
          <motion.div className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.95)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center space-y-4">
              <div className="text-red-500 text-6xl">🔒</div>
              <p className="text-red-400 font-mono text-xl tracking-widest">SESSION LOCKED</p>
              <p className="text-gray-400 font-mono text-sm">MULTIPLE FACES DETECTED</p>
              <p className="text-gray-500 text-xs">Security violation has been logged</p>
              <button onClick={() => setLocked(false)}
                className="mt-4 px-6 py-2 border border-green-500/50 text-military font-mono text-sm rounded hover:bg-green-900/30 transition">
                UNLOCK SESSION
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
