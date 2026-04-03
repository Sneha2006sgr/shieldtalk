import { useState, useEffect } from 'react';

function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else answer = a * b;
  return { question: `${a} ${op} ${b} = ?`, answer };
}

export default function StepCaptcha({ onPass }) {
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const verify = () => {
    if (parseInt(input) === captcha.answer) {
      onPass();
    } else {
      setError('Incorrect. Try again.');
      setCaptcha(generateCaptcha());
      setInput('');
    }
  };

  return (
    <div className="text-center space-y-6">
      <div className="text-military text-sm tracking-widest">STEP 2 OF 6</div>
      <h2 className="text-2xl font-bold text-white">CAPTCHA VERIFICATION</h2>
      <p className="text-gray-400 text-sm">Prove you are human</p>

      <div className="glass rounded-lg p-6 mx-auto max-w-xs">
        <div className="text-3xl font-mono text-military tracking-widest mb-4 select-none"
          style={{ fontFamily: 'monospace', letterSpacing: '0.3em', textShadow: '0 0 10px #00ff64' }}>
          {captcha.question}
        </div>
        <input
          type="number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="Enter answer"
          className="w-full bg-black/50 border border-green-500/30 text-white text-center text-xl p-3 rounded font-mono focus:outline-none focus:border-green-400"
        />
      </div>

      {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

      <button onClick={verify}
        className="px-8 py-3 bg-green-900/50 border border-green-500/50 text-military rounded hover:bg-green-800/50 transition font-mono tracking-wider">
        VERIFY
      </button>
    </div>
  );
}
