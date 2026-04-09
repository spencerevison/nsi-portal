import { SupportForm } from "./support-form";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Help & Support</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Having trouble, or have an idea for the portal? Let us know and an
          administrator will get back to you.
        </p>
      </div>

      <SupportForm />
    </div>
  );
}
