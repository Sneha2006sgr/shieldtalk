// Shield logo component — uses the same emoji as the login page
// Written as a dedicated file so the emoji bytes are preserved correctly

export default function ShieldLogo({ size = 24, spin = false }) {
  return (
    <span
      style={{
        fontSize: size,
        display: 'inline-block',
        animation: spin ? 'shieldSpin 4s linear infinite' : 'none',
        lineHeight: 1,
      }}
      role="img"
      aria-label="ShieldTalk"
    >
      🛡️
    </span>
  );
}
