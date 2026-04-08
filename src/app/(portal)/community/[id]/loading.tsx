import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function PostLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-40" />

      {/* Post card */}
      <Card className="py-0!">
        <CardContent className="p-5">
          <Skeleton className="h-5 w-64" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <div className="border-border mt-4 flex items-center gap-3 border-t pt-4">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <div>
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="divide-border divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-4 first:pt-0">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="mt-2 pl-8">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="mt-1 h-3.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
