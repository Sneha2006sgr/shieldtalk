import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CHECKS = [
  'VERIFYING SECURE ENVIRONMENT...',
  'CHECKING DEVICE INTEGRITY...',
  'ESTABLISHING ENCRYPTED TUNNEL...',
  'VALIDATING CLEARANCE LEVEL...',
  'GENERATING SESSION TOKEN...',
  'ACCESS GRANTED'
];

export default function StepFinalCheck({ onComplete }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx < CHECKS.length - 1) {
      const t = setTimeout(() => setIdx(i => i + 1), 600);
      return () => clearTimeout(t);
    } else {
      setTimeout(onComplete, 800);
    }
  }, [idx]);

  return (
    <div className="text-center space-y-6">
      <div className="text-military text-sm tracking-widest">STEP 6 OF 6</div>
      <h2 className="text-2xl font-bold text-white">FINAL SECURITY CHECK</h2>

      <div className="space-y-3 max-w-sm mx-auto text-left">
        {CHECKS.map((check, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={i <= idx ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-3 font-mono text-sm
              ${i < idx ? 'text-military' : i === idx ? 'text-yellow-400' : 'text-gray-700'}`}>
            <span>{i < idx ? '✓' : i === idx ? '►' : '○'}</span>
            <span>{check}</span>
            {i === idx && i < CHECKS.length - 1 && (
              <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>_</motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
