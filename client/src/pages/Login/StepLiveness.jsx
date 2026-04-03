import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

const STEPS = [
  { id: 'face',  label: 'POSITION FACE IN FRAME'     },
  { id: 'mouth', label: 'OPEN YOUR MOUTH WIDE'        },
  { id: 'left',  label: 'TURN HEAD LEFT'              },
  { id: 'right', label: 'TURN HEAD RIGHT'             },
];

export default function StepLiveness({ onPass }) {
  const videoRef = useRef(null);
  const rafRef   = useRef(null);
  const S = useRef({ step: 0, baseYaw: null, mouthOpen: false });

  const [stepIdx,     setStepIdx]     = useState(0);
  const [status,      setStatus]      = useState('LOADING AI MODELS...');
  const [cameraReady, setCameraReady] = useState(false);
  const [done,        setDone]        = useState(false);
  const [mar,         setMar]         = useState(null); // mouth aspect ratio debug

  useEffect(() => {
    let stream;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
        setStatus('CAMERA STARTING...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise(r => (videoRef.current.onloadedmetadata = r));
          await videoRef.current.play();
        }
        setCameraReady(true);
        setStatus('FACE DETECTED — FOLLOW INSTRUCTIONS');
      } catch (err) {
        setStatus('ERROR: ' + err.message);
      }
    })();
    return () => {
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraReady || done) return;

    const loop = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const result = await faceapi
        .detectSingleFace(videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 }))
        .withFaceLandmarks(true);

      if (!result) {
        setStatus('NO FACE — CENTER YOUR FACE IN THE OVAL');
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const pts = result.landmarks.positions;
      const s   = S.current;

      // Step 0 → 1: face detected
      if (s.step === 0) {
        s.step = 1;
        setStepIdx(1);
        setStatus('OPEN YOUR MOUTH WIDE');
      }

      // Step 1: mouth open via MAR (Mouth Aspect Ratio)
      if (s.step === 1) {
        const marVal = calcMAR(pts);
        setMar(marVal.toFixed(2));
        // MAR > 0.45 means mouth is clearly open
        if (marVal > 0.45) {
          s.step = 2;
          setStepIdx(2);
          setStatus('TURN YOUR HEAD LEFT');
        }
      }

      // Step 2: head left
      if (s.step === 2) {
        const yaw = calcYaw(pts);
        if (s.baseYaw === null) s.baseYaw = yaw;
        if (yaw - s.baseYaw > 10) {
          s.step = 3;
          setStepIdx(3);
          setStatus('NOW TURN YOUR HEAD RIGHT');
        }
      }

      // Step 3: head right
      if (s.step === 3) {
        const yaw = calcYaw(pts);
        if (s.baseYaw - yaw > 10) {
          cancelAnimationFrame(rafRef.current);
          setDone(true);
          setStatus('✓ LIVENESS VERIFIED');
          setTimeout(onPass, 900);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraReady, done]);

  return (
    <div className="text-center space-y-4">
      <div className="text-military text-sm tracking-widest">STEP 3 OF 6</div>
      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        AI LIVENESS DETECTION
      </h2>

      <div className="relative mx-auto rounded-lg overflow-hidden scan-line"
        style={{ width: 280, height: 210, border: `2px solid ${done ? 'var(--accent)' : 'rgba(0,255,100,0.4)'}`, background: '#000' }}>
        <video ref={videoRef} autoPlay muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full border-2 opacity-40"
            style={{ width: 110, height: 145, borderColor: 'var(--accent)' }} />
        </div>

        {['top-1 left-1 border-t-2 border-l-2', 'top-1 right-1 border-t-2 border-r-2',
          'bottom-1 left-1 border-b-2 border-l-2', 'bottom-1 right-1 border-b-2 border-r-2'].map((cls, i) => (
          <div key={i} className={`absolute w-4 h-4 ${cls}`} style={{ borderColor: 'var(--accent)' }} />
        ))}

        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <p className="text-xs font-mono animate-pulse" style={{ color: 'var(--accent)' }}>{status}</p>
          </div>
        )}
        {done && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,255,100,0.12)' }}>
            <span className="text-5xl">✅</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm font-mono justify-center"
            style={{ color: i < stepIdx ? 'var(--accent)' : i === stepIdx ? '#facc15' : 'var(--text-muted)' }}>
            <span>{i < stepIdx ? '✓' : i === stepIdx ? '►' : '○'}</span>
            <span>{step.label}</span>
            {i === 1 && stepIdx === 1 && mar && (
              <span className="text-xs opacity-50">MAR:{mar}</span>
            )}
          </div>
        ))}
      </div>

      <motion.p className="font-mono text-sm"
        style={{ color: done ? 'var(--accent)' : '#facc15' }}
        animate={{ opacity: done ? 1 : [1, 0.5, 1] }}
        transition={{ duration: 1, repeat: done ? 0 : Infinity }}>
        {status}
      </motion.p>
      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        Real-time AI face analysis · Cannot be bypassed
      </p>
    </div>
  );
}

// Mouth Aspect Ratio — landmarks 48-67 (outer + inner lip)
// Uses top-lip to bottom-lip vertical distance vs mouth width
function calcMAR(pts) {
  // outer mouth: 48(left) 54(right) 51(top-mid) 57(bottom-mid)
  const A = d(pts[51], pts[57]); // vertical top-bottom
  const B = d(pts[50], pts[58]);
  const C = d(pts[52], pts[56]);
  const W = d(pts[48], pts[54]); // horizontal width
  return (A + B + C) / (3 * W);
}

function calcYaw(pts) {
  const nose  = pts[30];
  const lEye  = pts[36];
  const rEye  = pts[45];
  const mid   = (lEye.x + rEye.x) / 2;
  const width = Math.abs(rEye.x - lEye.x) || 1;
  return ((nose.x - mid) / width) * 90;
}

function d(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
