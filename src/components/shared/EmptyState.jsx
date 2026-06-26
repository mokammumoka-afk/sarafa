export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 text-zinc-500">
      {Icon && <Icon size={36} className="mb-3 opacity-50" />}
      <p className="font-medium text-zinc-300">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
