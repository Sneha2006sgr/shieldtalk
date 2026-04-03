import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import RadarBackground from '../../components/RadarBackground';
import StatusBar from '../../components/StatusBar';
import StepLocation from './StepLocation';
import StepCaptcha from './StepCaptcha';
import StepLiveness from './StepLiveness';
import StepBiometric from './StepBiometric';
import StepCredentials from './StepCredentials';
import StepFinalCheck from './StepFinalCheck';

export default function Login() {
  const [step, setStep] = useState(0);
  const [locationData, setLocationData] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Tab switch resets login
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && step > 0 && step < 5) {
        setStep(0);
        setError('SESSION RESET: Tab switch detected. Restart authentication.');
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [step]);

  const handleCredentials = (creds) => {
    setCredentials(creds);
    setStep(5);
  };

  const handleFinalCheck = async () => {
    try {
      const res = await api.post('/auth/login', {
        ...credentials,
        deviceInfo: { userAgent: navigator.userAgent },
        location: locationData
      });
      login(res.data.user, res.data.token);
      const role = res.data.user.role;
      if (role === 'hq_admin' || role === 'admin_officer') navigate('/hq');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
      setStep(4);
    }
  };

  const steps = [
    <StepLocation onPass={(loc) => { setLocationData(loc); setStep(1); }} />,
    <StepCaptcha onPass={() => setStep(2)} />,
    <StepLiveness onPass={() => setStep(3)} />,
    <StepBiometric onPass={() => setStep(4)} />,
    <StepCredentials onPass={handleCredentials} />,
    <StepFinalCheck onComplete={handleFinalCheck} />
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      <RadarBackground />
      <StatusBar />

      <div className="relative z-10 w-full max-w-md px-4 mt-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div className="text-5xl mb-2" animate={{ rotateY: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
            🛡️
          </motion.div>
          <h1 className="text-3xl font-bold text-military tracking-widest font-mono">SHIELDTALK</h1>
          <p className="text-gray-500 text-xs tracking-widest mt-1">CLASSIFIED DEFENCE COMMUNICATION SYSTEM</p>
          <div className="flex justify-center gap-1 mt-2">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className={`h-1 w-8 rounded-full transition-all duration-500 ${i <= step ? 'bg-green-500' : 'bg-gray-700'}`} />
            ))}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-400 text-sm font-mono text-center">
            ⚠ {error}
          </motion.div>
        )}

        <motion.div className="glass rounded-xl p-8 glow"
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}>
          {steps[step]}
        </motion.div>

        <p className="text-center text-gray-600 text-xs mt-4 font-mono">
          NOT REGISTERED?{' '}
          <a href="/register" className="text-military hover:underline">REQUEST ACCESS</a>
        </p>
      </div>
    </div>
  );
}
