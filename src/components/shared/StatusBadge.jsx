import { STATUS_LABELS, STATUS_COLORS, cn } from '../../lib/utils';

export default function StatusBadge({ status }) {
  return (
    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[status])}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
