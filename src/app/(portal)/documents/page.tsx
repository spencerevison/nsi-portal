import { Folder } from "lucide-react";

export default function DocumentsIndexPage() {
  return (
    <div className="border-border bg-card flex items-center justify-center rounded-lg border p-12">
      <h1 className="sr-only">Documents</h1>
      <div className="text-center">
        <Folder aria-hidden="true" className="text-muted-foreground mx-auto mb-3 size-8" />
        <p className="text-muted-foreground text-sm">
          Select a folder to view documents
        </p>
      </div>
    </div>
  );
}
