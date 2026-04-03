import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes (30s for demo: change to 30000)

export default function IdleTimer() {
  const timer = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const reset = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await logout();
      navigate('/login?reason=idle');
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, []);

  return null;
}
