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
  if (caps.has("admin.access"))
    extraLinks.push({ href: "/admin", label: "Admin" });
  const allLinks = [...baseLinks, ...extraLinks];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-card relative border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-nsi.svg" alt="NSI" className="size-9" />
            Community Portal
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <PortalNav extraLinks={extraLinks} />
            <ThemeToggle />
            <UserMenu />
          </nav>
          {/* Mobile nav */}
          <div className="flex items-center gap-2 md:hidden">
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
