import { priorityClassMap } from '../../constants';
import { useI18n } from '../../i18n';

export function PriorityBadge({ value }: { value: string }) {
  const cls = priorityClassMap[value] || 'priority-medium';
  const t = useI18n((s) => s.t);
  return (
    <span className={`priority-badge ${cls}`}>
      <i /> {t(`priorities.${value}`) || value}
    </span>
  );
}