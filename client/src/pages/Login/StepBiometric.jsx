import { useState } from 'react';
import { motion } from 'framer-motion';

export default function StepBiometric({ onPass }) {
  const [phase, setPhase] = useState('idle'); // idle | scanning | done

  const startScan = () => {
    setPhase('scanning');
    setTimeout(() => {
      setPhase('done');
      setTimeout(onPass, 800);
    }, 3000);
  };

  return (
    <div className="text-center space-y-6">
      <div className="text-military text-sm tracking-widest">STEP 4 OF 6</div>
      <h2 className="text-2xl font-bold text-white">BIOMETRIC VERIFICATION</h2>
      <p className="text-gray-400 text-sm">Place your finger on the sensor</p>

      <div className="relative mx-auto w-40 h-40 cursor-pointer" onClick={phase === 'idle' ? startScan : undefined}>
        {/* Fingerprint SVG */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {[20, 25, 30, 35, 40, 45].map((r, i) => (
            <ellipse key={i} cx="50" cy="55" rx={r} ry={r * 0.85}
              fill="none"
              stroke={phase === 'done' ? '#00ff64' : phase === 'scanning' ? '#ffa500' : '#1a4a2e'}
              strokeWidth="1.5"
              strokeDasharray={phase === 'scanning' ? `${i * 10} ${100 - i * 10}` : 'none'}
              style={{ transition: 'stroke 0.5s' }}
            />
          ))}
          <line x1="50" y1="10" x2="50" y2="30" stroke={phase === 'done' ? '#00ff64' : '#1a4a2e'} strokeWidth="1.5" />
        </svg>

        {phase === 'scanning' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,165,0,0.2) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
        {phase === 'done' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,255,100,0.2) 0%, transparent 70%)' }}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
          />
        )}
      </div>

      <p className={`font-mono text-sm ${phase === 'done' ? 'text-military' : phase === 'scanning' ? 'text-yellow-400 animate-pulse' : 'text-gray-400'}`}>
        {phase === 'idle' ? 'CLICK TO SIMULATE FINGERPRINT SCAN' :
         phase === 'scanning' ? 'SCANNING BIOMETRIC DATA...' :
         '✓ BIOMETRIC VERIFIED'}
      </p>
    </div>
  );
}
