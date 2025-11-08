import { getWorkloadSize, getWorkloadColor, getWorkloadLabel } from '../utils/visualHelpers';

interface WorkloadIndicatorProps {
  estimate: number;
  showLabel?: boolean;
}

export function WorkloadIndicator({ estimate, showLabel = false }: WorkloadIndicatorProps) {
  const size = getWorkloadSize(estimate);
  const colors = getWorkloadColor(size);
  const label = getWorkloadLabel(estimate);

  return (
    <div className="inline-flex items-center gap-1" title={`${label} (${estimate}h)`}>
      <span
        className="inline-flex items-center justify-center font-bold rounded text-xs px-2 py-1 min-w-[32px]"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {size}
      </span>
      {showLabel && (
        <span className="text-xs text-gray-600">{estimate}h</span>
      )}
    </div>
  );
}
