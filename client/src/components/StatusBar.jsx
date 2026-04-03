import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function StatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      background: 'rgba(2,11,24,0.95)',
      borderBottom: '1px solid rgba(0,255,100,0.2)',
      fontFamily: 'monospace', fontSize: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <motion.span style={{ color: '#00ff64' }}
          animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          ● SECURE TUNNEL ACTIVE
        </motion.span>
        <span style={{ color: '#1a4a2e' }}>AES-256 ENCRYPTED</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#1a4a2e' }}>INDIA-ONLY ACCESS</span>
        <span style={{ color: '#00ff64' }}>
          {time.toLocaleTimeString('en-IN', { hour12: false })} IST
        </span>
      </div>
    </div>
  );
}
