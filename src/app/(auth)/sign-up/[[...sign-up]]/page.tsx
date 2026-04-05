import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

type SearchParams = Promise<{ __clerk_ticket?: string; __clerk_status?: string }>;

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const ticket = params.__clerk_ticket;

  // NSI is invitation-only — landing here without a ticket means either
  // the user guessed the URL or the invite link was mangled. Send them
  // somewhere friendlier rather than showing a confusing signup form.
  if (!ticket) {
    return (
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold">Invitation required</h1>
        <p className="text-sm text-neutral-600">
          The NSI portal is members-only. If you&rsquo;re a community member
          and haven&rsquo;t received an invitation, contact the administrator.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/sign-in" className="text-blue-600 hover:underline">
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    );
  }

  // ticket present — let Clerk handle validation + pre-fill the email
  return <SignUp />;
}
