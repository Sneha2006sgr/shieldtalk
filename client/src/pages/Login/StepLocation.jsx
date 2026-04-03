import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Free IP geolocation — no API key needed
const IP_GEO_URL = 'https://ipapi.co/json/';

// India bounding box
const inIndia = (lat, lng) => lat >= 6 && lat <= 37 && lng >= 68 && lng <= 98;

export default function StepLocation({ onPass }) {
  const [phase, setPhase]       = useState('idle');   // idle|gps|ip|passed|blocked|denied
  const [locData, setLocData]   = useState(null);
  const [error, setError]       = useState('');
  const [ipInfo, setIpInfo]     = useState(null);

  const handlePass = (data) => {
    setLocData(data);
    setPhase('passed');
    setTimeout(() => onPass(data), 1400);
  };

  const handleBlock = (reason) => {
    setError(reason);
    setPhase('blocked');
  };

  /* ── Try GPS first, then IP fallback ── */
  const startVerification = () => {
    setPhase('gps');
    setError('');

    if (!navigator.geolocation) {
      tryIPFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (inIndia(lat, lng)) {
          handlePass({ lat, lng, accuracy, method: 'GPS', city: 'India' });
        } else {
          handleBlock(`GPS COORDINATES OUT OF BOUNDS\nLAT: ${lat.toFixed(4)} LNG: ${lng.toFixed(4)}\nAccess restricted to Indian territory.`);
        }
      },
      (err) => {
        // GPS denied or unavailable — try IP geolocation
        if (err.code === err.PERMISSION_DENIED) {
          setPhase('ip');
          tryIPFallback();
        } else {
          setPhase('ip');
          tryIPFallback();
        }
      },
      { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  const tryIPFallback = async () => {
    setPhase('ip');
    try {
      const res  = await fetch(IP_GEO_URL);
      const data = await res.json();
      setIpInfo(data);

      if (data.country_code === 'IN') {
        handlePass({
          lat: data.latitude,
          lng: data.longitude,
          city: data.city,
          region: data.region,
          method: 'IP',
          ip: data.ip,
        });
      } else {
        handleBlock(
          `IP GEOLOCATION: ${data.country_name || 'UNKNOWN'}\n` +
          `IP: ${data.ip}\n` +
          `Access is restricted to Indian territory only.`
        );
      }
    } catch {
      // If IP lookup also fails (offline / CORS), hard block
      handleBlock('LOCATION VERIFICATION FAILED\nCannot determine your location.\nEnable GPS or check your connection.');
    }
  };

  return (
    <div className="text-center space-y-5">
      <div className="text-military text-sm tracking-widest">STEP 1 OF 6</div>
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        LOCATION VERIFICATION
      </h2>
      <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
        Access restricted to Indian territory only
      </p>

      {/* Radar animation */}
      <div className="relative w-36 h-36 mx-auto">
        {[1, 2, 3].map(i => (
          <motion.div key={i}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: 'rgba(0,255,100,0.25)' }}
            animate={['gps', 'ip'].includes(phase)
              ? { scale: [1, 1.4 + i * 0.25], opacity: [0.6, 0] }
              : {}}
            transition={{ duration: 1.5, delay: i * 0.35, repeat: Infinity }}
          />
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-4xl">
            {phase === 'passed' ? '✅' : phase === 'blocked' ? '🚫' : '📍'}
          </span>
          {['gps', 'ip'].includes(phase) && (
            <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
              {phase === 'gps' ? 'GPS' : 'IP GEO'}
            </span>
          )}
        </div>
      </div>

      {/* Status messages */}
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.button key="btn"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={startVerification}
            className="px-8 py-3 rounded font-mono tracking-wider text-sm transition"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-strong)', color: 'var(--accent)' }}>
            VERIFY LOCATION
          </motion.button>
        )}

        {phase === 'gps' && (
          <motion.div key="gps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-1">
            <p className="font-mono text-sm animate-pulse" style={{ color: 'var(--accent)' }}>
              ACQUIRING GPS COORDINATES...
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Please allow location access when prompted
            </p>
          </motion.div>
        )}

        {phase === 'ip' && (
          <motion.div key="ip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-1">
            <p className="font-mono text-sm animate-pulse" style={{ color: '#facc15' }}>
              GPS UNAVAILABLE — VERIFYING VIA IP GEOLOCATION...
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              This may take a moment
            </p>
          </motion.div>
        )}

        {phase === 'passed' && locData && (
          <motion.div key="passed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="space-y-2 p-4 rounded-lg"
            style={{ background: 'rgba(0,255,100,0.05)', border: '1px solid rgba(0,255,100,0.2)' }}>
            <p className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
              ✓ LOCATION VERIFIED — INDIA
            </p>
            <div className="text-xs font-mono space-y-0.5" style={{ color: 'var(--text-muted)' }}>
              {locData.city && <p>📍 {locData.city}{locData.region ? `, ${locData.region}` : ''}</p>}
              <p>LAT: {locData.lat?.toFixed(4)}° | LNG: {locData.lng?.toFixed(4)}°</p>
              <p>METHOD: {locData.method}</p>
            </div>
          </motion.div>
        )}

        {phase === 'blocked' && (
          <motion.div key="blocked" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="space-y-3 p-4 rounded-lg"
            style={{ background: 'rgba(255,59,59,0.05)', border: '1px solid rgba(255,59,59,0.3)' }}>
            <p className="font-mono text-sm font-bold" style={{ color: 'var(--danger)' }}>
              ✗ ACCESS DENIED
            </p>
            {error.split('\n').map((line, i) => (
              <p key={i} className="text-xs font-mono" style={{ color: i === 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                {line}
              </p>
            ))}
            <div className="pt-2 p-3 rounded text-xs font-mono"
              style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)' }}>
              🔒 This system is exclusively for Indian defence personnel.
              If you believe this is an error, contact your unit HQ.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
