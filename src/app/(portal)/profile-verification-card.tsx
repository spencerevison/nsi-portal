"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseFieldValue } from "@/components/custom-field-editor";
import { confirmProfile } from "./profile/actions";

export type VerificationProfile = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  lot_number: string | null;
  address: string | null;
  custom_fields: { field_name: string; value: string | null }[];
};

export function ProfileVerificationCard({
  profile,
}: {
  profile: VerificationProfile;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"open" | "leaving" | "gone">("open");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    // start fade-out immediately, fire the server action in parallel.
    // the activity feed below slides up as the card collapses.
    setPhase("leaving");
    startTransition(() => {
      confirmProfile();
    });
    // leave the DOM after the CSS transition wraps up — keeps any in-flight
    // revalidation from yanking the card out mid-animation
    setTimeout(() => setPhase("gone"), 320);
  }

  function handleUpdate() {
    router.push("/profile");
  }

  if (phase === "gone") return null;

  const rows: { label: string; value: string | null }[] = [
    {
      label: "Name",
      value: `${profile.first_name} ${profile.last_name}`.trim() || null,
    },
    { label: "Email", value: profile.email || null },
    { label: "Phone", value: profile.phone },
    { label: "Mailing", value: profile.address },
    { label: "Lot", value: profile.lot_number },
    ...profile.custom_fields.map((f) => ({
      label: f.field_name,
      value: formatCustomField(f.value, f.field_name),
    })),
  ];

  const leaving = phase === "leaving";

  return (
    <div
      className={
        "overflow-hidden transition-all duration-300 ease-out " +
        (leaving ? "-mt-2 max-h-0 opacity-0" : "max-h-500 opacity-100")
      }
    >
      <Card className="ring-cream-400/60 dark:ring-cream-800/60 from-cream-100 to-cream-200 dark:from-cream-950/40 dark:to-cream-900/30 bg-linear-to-b ring-inset">
        <CardContent className="p-6">
          <p className="text-muted-foreground/80 text-xs font-medium tracking-[0.14em] uppercase">
            A quick check
          </p>
          <h3 className="mt-1 text-lg font-semibold">Does this look right?</h3>
          <p className="text-muted-foreground mt-1.5 text-sm">
            We&apos;ve added what we had on file to the directory but please
            take a moment to confirm the information is correct.
          </p>

          <dl className="divide-cream-300/60 dark:divide-cream-800/40 mt-5 divide-y">
            {rows.map((r) => (
              <Row key={r.label} label={r.label} value={r.value} />
            ))}
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={handleConfirm} disabled={pending}>
              Looks right
            </Button>
            <Button variant="outline" onClick={handleUpdate} disabled={pending}>
              Edit details
            </Button>
            <p className="text-muted-foreground ml-auto text-xs">
              You can change this anytime in your profile.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCustomField(
  raw: string | null,
  fieldName: string,
): string | null {
  const items = parseFieldValue(raw, fieldName);
  if (!items.length) return null;
  // each entry has a `name`; Children also carry `birthYear`
  const parts = items
    .map((it) => {
      const name = (it.name ?? "").trim();
      if (!name) return null;
      const yr = (it.birthYear ?? "").trim();
      return yr ? `${name} (${yr})` : name;
    })
    .filter((s): s is string => !!s);
  return parts.length ? parts.join(", ") : null;
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-baseline gap-x-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          value ? "text-foreground font-medium" : "text-muted-foreground/60"
        }
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
