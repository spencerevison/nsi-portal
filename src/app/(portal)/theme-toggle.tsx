"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const modes = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

// track whether we're mounted (client-side) to avoid hydration mismatch
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!mounted) return <div className="size-8" />;

  const current = modes.find((m) => m.value === theme) ?? modes[2];
  const next = modes[(modes.indexOf(current) + 1) % modes.length];

  return (
    <button
      onClick={() => setTheme(next.value)}
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors",
        className,
      )}
      title={`Theme: ${current.label}. Click for ${next.label}`}
    >
      <current.icon className="size-4" />
    </button>
  );
}
