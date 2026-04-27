import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { HeroRotation } from "../hero-rotation";

type Params = Promise<{ "sign-in"?: string[] }>;

export default async function SignInPage({ params }: { params: Params }) {
  const { "sign-in": segments } = await params;
  const isSubroute = !!segments?.length;

  // Already signed in and hitting the landing — bounce to home. Subroutes
  // (factor-one, sso-callback, …) still need to render so Clerk can finish
  // whatever flow it's mid-way through.
  if (!isSubroute) {
    const { userId } = await auth();
    if (userId) redirect("/");
  }

  if (isSubroute) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <SignIn />
      </main>
    );
  }

  return <HeroRotation />;
}
