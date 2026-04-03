import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

export default function SOS() {
  const [status, setStatus] = useState('idle'); // idle | locating | sending | sent | error
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const triggerSOS = () => {
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setLocation(loc);
        setStatus('sending');
        try {
          await api.post('/sos/trigger', { location: loc });
          setStatus('sent');
          const res = await api.get('/sos/my-alerts');
          setAlerts(res.data);
        } catch {
          setStatus('error');
        }
      },
      async () => {
        const loc = { lat: 28.6139, lng: 77.2090 };
        setLocation(loc);
        setStatus('sending');
        try {
          await api.post('/sos/trigger', { location: loc });
          setStatus('sent');
        } catch { setStatus('error'); }
      }
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-mono">EMERGENCY SOS</h1>
        <p className="text-gray-500 text-sm font-mono mt-1">Direct line to HQ Command Center</p>
      </div>

      <div className="glass rounded-xl p-8 text-center space-y-6">
        <p className="text-gray-400 font-mono text-sm">
          Press the SOS button to immediately alert HQ with your location and initiate emergency protocol.
        </p>

        {/* SOS Button */}
        <div className="relative inline-block">
          {status === 'idle' && (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="absolute inset-0 rounded-full border-2 border-red-500/30 radar-ring"
                  style={{ animationDelay: `${i * 0.5}s` }} />
              ))}
            </>
          )}
          <motion.button
            onClick={status === 'idle' ? triggerSOS : undefined}
            disabled={status !== 'idle'}
            className={`relative w-40 h-40 rounded-full font-mono font-bold text-lg tracking-widest transition-all
              ${status === 'idle' ? 'bg-red-900/60 border-4 border-red-500 text-red-300 hover:bg-red-800/80 cursor-pointer glow-red' :
                status === 'sent' ? 'bg-green-900/60 border-4 border-green-500 text-military' :
                'bg-gray-900/60 border-4 border-gray-600 text-gray-500 cursor-not-allowed'}`}
            whileTap={status === 'idle' ? { scale: 0.95 } : {}}
            animate={status === 'idle' ? { boxShadow: ['0 0 20px rgba(255,59,59,0.3)', '0 0 40px rgba(255,59,59,0.6)', '0 0 20px rgba(255,59,59,0.3)'] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}>
            {status === 'idle' ? 'SOS' :
             status === 'locating' ? '📍...' :
             status === 'sending' ? 'SENDING' :
             status === 'sent' ? '✓ SENT' : 'ERROR'}
          </motion.button>
        </div>

        <AnimatePresence>
          {status === 'locating' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-yellow-400 font-mono text-sm animate-pulse">
              ACQUIRING GPS COORDINATES...
            </motion.p>
          )}
          {status === 'sending' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-yellow-400 font-mono text-sm animate-pulse">
              TRANSMITTING ALERT TO HQ...
            </motion.p>
          )}
          {status === 'sent' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <p className="text-military font-mono text-sm">✓ HQ NOTIFIED — HELP IS ON THE WAY</p>
              {location && (
                <p className="text-gray-400 font-mono text-xs">
                  COORDINATES: {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
                </p>
              )}
              <button onClick={() => setStatus('idle')}
                className="mt-2 px-4 py-2 border border-green-500/30 text-military font-mono text-xs rounded hover:bg-green-900/20 transition">
                RESET
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="glass rounded-xl p-4 border border-red-500/20">
        <p className="text-red-400 font-mono text-xs">
          ⚠ WARNING: False SOS alerts are a punishable offence. Use only in genuine emergencies.
        </p>
      </div>
    </div>
  );
}
