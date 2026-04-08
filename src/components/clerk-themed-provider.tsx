"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

const baseVariables = {
  fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  borderRadius: "0.5rem",
};

export function ClerkThemedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <ClerkProvider
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to the NSI Community Portal",
          },
        },
      }}
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: {
          ...baseVariables,
          ...(isDark
            ? {
                colorPrimary: "#cebf9e",
                colorBackground: "oklch(0.205 0 0)",
                colorInputBackground: "oklch(0.269 0 0)",
                colorInputText: "oklch(0.985 0 0)",
                colorText: "oklch(0.985 0 0)",
                colorTextSecondary: "oklch(0.708 0 0)",
                colorNeutral: "oklch(0.85 0 0)",
              }
            : {
                colorPrimary: "#22444E",
                colorBackground: "#ffffff",
                colorInputBackground: "#ffffff",
                colorInputText: "#1a1a1a",
                colorText: "#1a1a1a",
                colorTextSecondary: "#6b7280",
              }),
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
