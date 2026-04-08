import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { UserMenu } from "./user-menu";
import { PortalNav } from "./portal-nav";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { getCurrentAppUser, getCurrentCapabilities } from "@/lib/current-user";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAppUser();
  const caps = await getCurrentCapabilities();

  if (!user || !user.active) {
    const reason = !user
      ? "Your account isn't linked to a member profile."
      : "Your account has been deactivated.";
    return (
      <main className="bg-muted flex min-h-screen items-center justify-center p-6">
        <div className="border-border bg-card w-full max-w-md rounded-lg border p-8 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Access unavailable</h1>
          <p className="text-muted-foreground mb-4 text-sm">
            {reason} If you believe this is wrong, contact the administrator.
          </p>
          <SignOutButton>
            <button className="border-border hover:bg-muted rounded border px-4 py-2 text-sm">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </main>
    );
  }

  const baseLinks = [
    { href: "/documents", label: "Documents" },
    { href: "/directory", label: "Directory" },
    { href: "/community", label: "Message Board" },
  ];
  const extraLinks: { href: string; label: string }[] = [];
  if (caps.has("email.send"))
    extraLinks.push({ href: "/email/compose", label: "Email" });
  const allLinks = [...baseLinks, ...extraLinks];
  const hasAdmin = caps.has("admin.access");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-card sticky top-0 border-b">
        <div className="flex h-12 items-center gap-4 px-6 md:h-16 lg:gap-8">
          <Link
            href="/"
            className="hover:text-accent-400 text-accent-600 dark:text-cream-300 dark:hover:text-cream-100 flex shrink-0 items-center gap-2 text-xs font-semibold sm:text-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-nsi.svg" alt="NSI" className="size-9" />
            <span className="xs:inline hidden">Community Portal</span>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden h-full w-full items-center gap-6 lg:flex">
            <PortalNav extraLinks={extraLinks} showAdmin={hasAdmin} />
            <ThemeToggle className="ml-auto" />
            <UserMenu />
          </nav>
          {/* Mobile nav */}
          <div className="ml-auto flex items-center gap-4 lg:hidden">
            <ThemeToggle />
            <UserMenu />
            <MobileNav links={allLinks} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
