import { SignIn } from "@clerk/nextjs";

import { HeroRotation } from "../hero-rotation";

type Params = Promise<{ "sign-in"?: string[] }>;

export default async function SignInPage({ params }: { params: Params }) {
  const { "sign-in": segments } = await params;

  // Subroutes (factor-one, factor-two, sso-callback, …) — fall back to Clerk's
  // default component. The custom hero is reserved for the landing.
  if (segments && segments.length > 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <SignIn />
      </main>
    );
  }

  return <HeroRotation />;
}
