// Renders the user's photo if they have one, otherwise their initials on a
// gradient background — entirely local (no external avatar service call),
// which matters for the Android/Capacitor build where every non-GPAY/Google
// external request is something to avoid.
export default function Avatar({ src, name, size = 32, className = '' }) {
  const initials = (name || 'S L')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (src) {
    return <img src={src} alt={name || ''} style={{ width: size, height: size }} className={`rounded-full object-cover ${className}`} />;
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center font-heading font-bold text-primary-900 ${className}`}
    >
      {initials}
    </div>
  );
}
