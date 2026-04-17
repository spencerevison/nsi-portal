import type { MemberStatus } from "./members";

// Badge styling for each member-status value. Used in the admin members
// table today; hoisted here so future surfaces (profile, audit log, etc)
// render the same pill without copy-pasting the class strings.
export const memberStatusBadge: Record<
  MemberStatus,
  { variant: "secondary" | "outline" | "destructive"; className?: string }
> = {
  Draft: { variant: "outline" },
  Invited: {
    variant: "secondary",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
  Active: {
    variant: "secondary",
    className: "bg-green-100 text-green-900 border-green-200",
  },
  Revoked: { variant: "destructive" },
  Inactive: { variant: "secondary" },
};
