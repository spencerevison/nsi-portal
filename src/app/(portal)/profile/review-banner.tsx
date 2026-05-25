import { Card, CardContent } from "@/components/ui/card";

export function ReviewBanner() {
  return (
    <Card className="ring-cream-400/60 dark:ring-cream-800/60 from-cream-100 to-cream-200 dark:from-cream-950/40 dark:to-cream-900/30 bg-linear-to-b">
      <CardContent className="p-5">
        <p className="text-muted-foreground/80 text-xs font-medium tracking-[0.14em] uppercase">
          Please review
        </p>
        <h2 className="mt-1 text-base font-semibold">
          Take a moment to check your details
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Edit anything that needs updating and click <b>Save Changes</b>, or if
          everything is already correct, click <b>Everything&apos;s correct</b>{" "}
          at the bottom.
        </p>
      </CardContent>
    </Card>
  );
}
