import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { UserMenu } from "./user-menu";
import { PortalNav } from "./portal-nav";
import { MobileNav } from "./mobile-nav";
import { getCurrentAppUser, getCurrentCapabilities } from "@/lib/current-user";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAppUser();
  const caps = await getCurrentCapabilities();

  // Clerk-authenticated but no matching app_user row, or deactivated.
  // Can't redirect to /sign-in (Clerk would just send them back here),
  // so render a blocking screen with a sign-out button.
  if (!user || !user.active) {
    const reason = !user
      ? "Your account isn't linked to a member profile."
      : "Your account has been deactivated.";
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold">Access unavailable</h1>
          <p className="mb-4 text-sm text-neutral-600">
            {reason} If you believe this is wrong, contact the administrator.
          </p>
          <SignOutButton>
            <button className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </main>
    );
  }

  // build nav links based on capabilities
  const baseLinks = [
    { href: "/documents", label: "Documents" },
    { href: "/directory", label: "Directory" },
    { href: "/community", label: "Community" },
  ];
  const extraLinks: { href: string; label: string }[] = [];
  if (caps.has("email.send"))
    extraLinks.push({ href: "/email/compose", label: "Email" });
  if (caps.has("admin.access"))
    extraLinks.push({ href: "/admin", label: "Admin" });
  const allLinks = [...baseLinks, ...extraLinks];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-nsi.svg" alt="NSI" className="size-9" />
            NSI Portal
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <PortalNav extraLinks={extraLinks} />
            <UserMenu />
          </nav>
          {/* Mobile nav */}
          <div className="flex items-center gap-2 md:hidden">
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
