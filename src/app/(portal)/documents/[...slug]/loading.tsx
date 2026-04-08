import { Skeleton } from "@/components/ui/skeleton";

export default function FolderLoading() {
  return (
    <div className="border-border bg-card rounded-lg border">
      {/* Header */}
      <div className="border-border border-b px-4 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-1.5 h-5 w-32" />
        <Skeleton className="mt-1 h-3 w-14" />
      </div>

      {/* File rows */}
      <div className="divide-border divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-5 rounded" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="mt-1 h-3 w-20" />
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
