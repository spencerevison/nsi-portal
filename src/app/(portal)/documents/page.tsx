import { Folder } from "lucide-react";

export default function DocumentsIndexPage() {
  return (
    <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
      <div className="text-center">
        <Folder className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Select a folder to view documents
        </p>
      </div>
    </div>
  );
}
