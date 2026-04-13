"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { dismissWelcome } from "./profile/actions";

export function WelcomeBanner({
  firstName,
  showProfilePrompt,
}: {
  firstName: string;
  showProfilePrompt: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDismiss() {
    setDismissed(true);
    startTransition(() => {
      dismissWelcome();
    });
  }

  if (dismissed) return null;

  return (
    <Card className="border-accent-200 bg-accent-50/75 dark:border-accent-800 dark:bg-accent-950/30 relative">
      <button
        onClick={handleDismiss}
        disabled={pending}
        className="text-muted-foreground hover:text-foreground absolute top-3 right-3 rounded p-1 transition-colors"
        aria-label="Dismiss welcome message"
      >
        <X className="size-4" />
      </button>
      <CardContent className="p-5 pr-10">
        <h2 className="text-lg font-semibold">
          Welcome to the NSI Community Portal, {firstName}!
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Here you can browse community documents, look up member contact info,
          and stay connected with the community.
        </p>

        {showProfilePrompt && (
          <div className="mt-3">
            <Link
              href="/profile"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Complete your profile
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
            <p className="text-muted-foreground mt-1.5 text-xs">
              Add info like phone number or lot so other members can find you in
              the directory.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
