import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { CommunityLoader } from "./community-loader";

function CommunitySkeleton() {
  return (
    <>
      <Skeleton className="mt-1 h-4 w-48" />

      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 py-0">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3.5 w-full" />
                <Skeleton className="mt-1 h-3.5 w-3/4" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default function CommunityPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Message Board</h1>
      <Suspense fallback={<CommunitySkeleton />}>
        <CommunityLoader />
      </Suspense>
    </div>
  );
}
