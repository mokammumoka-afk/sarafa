import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Used at the top of every "secondary" page (deposit, buy/sell, transaction
// detail, settings, etc.) — anything that isn't one of the 5 bottom-nav tab
// roots. The arrow points right because the app is RTL: "back" visually means
// "toward the right" here, matching native RTL app conventions.
export default function PageHeader({ title, subtitle, to, action }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 mb-5 -mt-1">
      <button
        onClick={() => (to ? navigate(to) : navigate(-1))}
        aria-label="رجوع"
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-surface-800 border border-white/5 text-zinc-300 hover:text-accent-400 hover:border-accent-400/30 transition-colors"
      >
        <ChevronRight size={20} />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-heading font-bold text-lg truncate">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-500 truncate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
