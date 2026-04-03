import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Blocks screenshot, copy, right-click; detects tab switch
export default function SecurityOverlay({ onViolation }) {
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    // Disable right-click
    const noContext = (e) => e.preventDefault();
    // Disable copy/paste
    const noCopy = (e) => e.preventDefault();
    // Detect PrintScreen (limited)
    const keyDown = (e) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard?.writeText('').catch(() => {});
        setBlurred(true);
        setTimeout(() => setBlurred(false), 2000);
      }
    };
    // Tab switch detection
    const visibilityChange = () => {
      if (document.hidden) {
        onViolation?.('TAB_SWITCH');
      }
    };

    document.addEventListener('contextmenu', noContext);
    document.addEventListener('copy', noCopy);
    document.addEventListener('paste', noCopy);
    document.addEventListener('keydown', keyDown);
    document.addEventListener('visibilitychange', visibilityChange);

    return () => {
      document.removeEventListener('contextmenu', noContext);
      document.removeEventListener('copy', noCopy);
      document.removeEventListener('paste', noCopy);
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('visibilitychange', visibilityChange);
    };
  }, [onViolation]);

  return (
    <AnimatePresence>
      {blurred && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.9)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠</div>
            <p className="text-red-400 font-mono text-lg">SCREENSHOT ATTEMPT DETECTED</p>
            <p className="text-gray-500 text-sm mt-2">Security violation logged</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
