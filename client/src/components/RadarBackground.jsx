import { motion } from 'framer-motion';

export default function RadarBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,100,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />
      {/* Radar rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-green-500/10"
            style={{ width: i * 200, height: i * 200, top: -(i * 100), left: -(i * 100) }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
          />
        ))}
      </div>
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-green-500/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-green-500/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-green-500/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-green-500/30" />
    </div>
  );
}
