import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function RoleDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />

      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-1 h-4 w-36" />
        <Skeleton className="mt-1 h-4 w-40" />
      </div>

      {/* Capability grid skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
