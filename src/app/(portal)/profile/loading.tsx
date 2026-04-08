import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Avatar + name area */}
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-3.5 w-44" />
            </div>
          </div>

          {/* Form fields */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}

          <Skeleton className="h-9 w-32 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
