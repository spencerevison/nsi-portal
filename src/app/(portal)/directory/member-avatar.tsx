import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

export function MemberAvatar({
  member,
  size = "md",
}: {
  member: {
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
  };
  size?: "sm" | "md" | "lg";
}) {
  const initials =
    (member.first_name?.[0] ?? "") + (member.last_name?.[0] ?? "");

  if (member.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatar_url}
        alt={`${member.first_name} ${member.last_name}`}
        className={cn("shrink-0 rounded-full object-cover", sizes[size])}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-accent-600 text-accent-50 flex shrink-0 items-center justify-center rounded-full leading-none font-medium",
        sizes[size],
      )}
    >
      {initials}
    </div>
  );
}
