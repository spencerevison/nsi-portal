import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { UserMenu } from "./user-menu";
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">
            NSI Portal
          </Link>
          <nav className="flex items-center gap-6 text-sm text-neutral-600">
            <Link href="/documents">Documents</Link>
            <Link href="/directory">Directory</Link>
            <Link href="/community">Community</Link>
            {caps.has("email.send") && <Link href="/email/compose">Email</Link>}
            {caps.has("admin.access") && <Link href="/admin">Admin</Link>}
            <UserMenu />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
