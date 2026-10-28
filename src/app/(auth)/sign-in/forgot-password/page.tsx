"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

import { NsiMark } from "../nsi-mark";

type Step = "email" | "code" | "password";

const inputCls =
  "h-11 w-full rounded-md border border-cream-400 bg-white px-3.5 text-sm text-foreground outline-none focus:border-accent-600";
const labelCls = "text-accent-800 mb-1.5 block text-xs font-medium";

export default function ForgotPasswordPage() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn || busy) return;
    setError(null);
    setBusy(true);
    try {
      let res: { error: { longMessage?: string; message: string } | null };

      if (step === "email") {
        res = await signIn.create({ identifier: value });
        if (!res.error) res = await signIn.resetPasswordEmailCode.sendCode();
      } else if (step === "code") {
        res = await signIn.resetPasswordEmailCode.verifyCode({ code: value });
      } else {
        res = await signIn.resetPasswordEmailCode.submitPassword({
          password: value,
          signOutOfOtherSessions: true,
        });
        // ponytail: no MFA branch, MFA is off (Pro-only), add if it's ever enabled
        if (!res.error) res = await signIn.finalize();
      }

      if (res.error) {
        setError(res.error.longMessage ?? res.error.message);
        return;
      }

      if (step === "password") {
        router.push("/");
        return;
      }
      setValue("");
      setStep(step === "email" ? "code" : "password");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const copy = {
    email: [
      "Reset your password",
      "Enter your email and we'll send you a code.",
    ],
    code: ["Check your email", "Enter the code we just sent you."],
    password: ["Choose a new password", "You'll be signed in right after."],
  }[step];

  return (
    <main className="bg-cream-100 flex min-h-screen items-center justify-center px-6 py-8">
      <section className="w-full max-w-[380px]">
        <div className="mb-8">
          <NsiMark variant="onpaper" />
        </div>
        <h1 className="text-accent-900 m-0 mb-2.5 text-[28px] leading-[1.2] font-semibold tracking-tight">
          {copy[0]}
        </h1>
        <p className="m-0 mb-8 text-sm leading-[1.5] text-[oklch(0.48_0_0)]">
          {copy[1]}
        </p>

        {error ? (
          <div role="alert" className="text-destructive mb-4 text-sm">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="value" className={labelCls}>
            {step === "email" ? "Email" : step === "code" ? "Code" : "Password"}
          </label>
          <input
            id="value"
            key={step}
            type={
              step === "email" ? "email" : step === "code" ? "text" : "password"
            }
            autoComplete={
              step === "email"
                ? "email"
                : step === "code"
                  ? "one-time-code"
                  : "new-password"
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode={step === "code" ? "numeric" : undefined}
            aria-invalid={error ? true : undefined}
            required
            autoFocus
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy}
            className="bg-accent-600 text-cream-50 hover:bg-accent-800 mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-medium disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="sr-only">Working…</span>
              </>
            ) : (
              "Continue"
            )}
          </button>
        </form>

        <Link
          href="/sign-in"
          className="text-accent-600 mt-6 inline-block text-xs font-medium hover:underline"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
