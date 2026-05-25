// Shared metadata for support requests — categories, statuses, badge styling.
// Consumed by the help submit action (email template), the admin table, and
// the admin detail view. Keep this file framework-agnostic (no JSX) so the
// server-side help action can import it without dragging React in.

export const SUPPORT_CATEGORIES = [
  "bug",
  "feature",
  "question",
  "other",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUSES = ["new", "read", "complete"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  bug: "Bug / Issue",
  feature: "Feature Request",
  question: "Question",
  other: "Other",
};

export const CATEGORY_BADGE_CLASS: Record<SupportCategory, string> = {
  bug: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  feature:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  question:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  other: "",
};

export const STATUS_LABELS: Record<SupportStatus, string> = {
  new: "New",
  read: "Read",
  complete: "Complete",
};

// Empty string => uses the Badge's variant styling directly (e.g. "outline")
export const STATUS_BADGE_CLASS: Record<SupportStatus, string> = {
  new: "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  read: "",
  complete:
    "border-green-200 bg-green-100 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300",
};

export const STATUS_SORT_ORDER: Record<SupportStatus, number> = {
  new: 0,
  read: 1,
  complete: 2,
};

export function isSupportCategory(v: string): v is SupportCategory {
  return (SUPPORT_CATEGORIES as readonly string[]).includes(v);
}
