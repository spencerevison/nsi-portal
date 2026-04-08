import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ComposeLoader } from "./compose-loader";

function ComposeSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        {/* Recipients */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-md" />
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-40 w-full rounded-md" />
        </div>

        <Skeleton className="h-9 w-28 rounded-md" />
      </CardContent>
    </Card>
  );
}

export default function ComposePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Send Email</h1>
        <p className="text-muted-foreground text-sm">
          Send a group email to community members
        </p>
      </div>

      <Suspense fallback={<ComposeSkeleton />}>
        <ComposeLoader />
      </Suspense>
    </div>
  );
}
