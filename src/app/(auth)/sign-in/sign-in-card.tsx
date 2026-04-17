"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { NsiMark } from "./nsi-mark";

export function SignInCard() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn.password({ identifier: email, password });
      if (res.error) {
        setError(res.error.longMessage ?? res.error.message);
        return;
      }

      if (signIn.status === "complete") {
        const finalizeRes = await signIn.finalize();
        if (finalizeRes.error) {
          setError(finalizeRes.error.longMessage ?? finalizeRes.error.message);
          return;
        }
        router.push(redirectUrl);
      } else {
        // needs second factor — hand off to Clerk's default MFA UI
        router.push(
          `/sign-in/factor-two?redirect_url=${encodeURIComponent(redirectUrl)}`,
        );
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputBase =
    "h-11 w-full rounded-[var(--radius-md)] border border-cream-400 bg-white px-[14px] text-[14px] text-foreground transition-[border-color,box-shadow] duration-[120ms] outline-none focus:border-accent-600 focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--accent-600)_18%,transparent)] aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_color-mix(in_oklch,var(--destructive)_18%,transparent)]";

  const labelBase =
    "text-accent-800 mb-[6px] block text-[12px] font-medium tracking-[0.01em]";

  return (
    <section className="w-full max-w-[380px]">
      <div className="mb-8">
        <NsiMark variant="onpaper" />
      </div>
      <h1 className="text-accent-900 m-0 mb-[10px] text-[28px] leading-[1.2] font-semibold tracking-[-0.015em]">
        Sign in
      </h1>
      <p className="m-0 mb-8 text-[14px] leading-[1.5] text-[oklch(0.48_0_0)]">
        Welcome back to the NSI community.
      </p>

      {error ? (
        <div
          role="alert"
          className="text-destructive mb-4 text-[14px] leading-[1.4]"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate>
        <div className="mb-[14px]">
          <label htmlFor="email" className={labelBase}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputBase}
          />
        </div>

        <div className="mb-[14px]">
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className={labelBase}>
              Password
            </label>
            <Link
              href="/sign-in/forgot-password"
              className="text-accent-600 text-[12px] font-medium no-underline hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputBase}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "bg-accent-600 text-cream-50 hover:bg-accent-800 mt-[10px] flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border-0 text-[14px] font-medium transition-[background,transform] duration-[120ms] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </section>
  );
}
