export default function BalanceCard({ icon, label, value, sub, accent = false }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-gradient-to-br from-accent-500/20 to-accent-600/5 border border-accent-400/20' : 'bg-surface-800 border border-white/5'}`}>
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
        <span>{icon}</span> {label}
      </div>
      <div className="font-heading font-bold text-2xl text-white">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}
