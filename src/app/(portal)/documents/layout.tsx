import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderTreeLoader } from "./folder-tree-loader";

function FolderTreeSkeleton() {
  return (
    <div className="border-border bg-card rounded-lg border p-2">
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded px-2 py-1.5"
            style={{ paddingLeft: i > 2 ? "2rem" : undefined }}
          >
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Documents</h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 md:w-72">
          <Suspense fallback={<FolderTreeSkeleton />}>
            <FolderTreeLoader />
          </Suspense>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
