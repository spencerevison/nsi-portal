import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  CATEGORY_BADGE_CLASS,
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
  type SupportCategory,
  type SupportStatus,
  isSupportCategory,
} from "./_config";

export function CategoryBadge({ category }: { category: string }) {
  if (!isSupportCategory(category)) {
    return <Badge variant="secondary">{category}</Badge>;
  }
  return (
    <Badge
      variant="secondary"
      className={CATEGORY_BADGE_CLASS[category as SupportCategory]}
    >
      {CATEGORY_LABELS[category as SupportCategory]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  // Statuses we don't recognize fall back to a plain outline badge
  if (!(status in STATUS_LABELS)) {
    return <Badge variant="outline">{status}</Badge>;
  }
  const s = status as SupportStatus;
  const cls = STATUS_BADGE_CLASS[s];
  // "read" has no custom class — use outline variant so it isn't filled
  if (!cls) {
    return <Badge variant="outline">{STATUS_LABELS[s]}</Badge>;
  }
  return (
    <Badge variant="secondary" className={cls}>
      {STATUS_LABELS[s]}
    </Badge>
  );
}
