import { getCurrentCapabilities } from "@/lib/current-user";
import { notFound } from "next/navigation";
import { EmailNav } from "./email-nav";

export default async function EmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caps = await getCurrentCapabilities();
  if (!caps.has("email.send")) notFound();

  return (
    <div className="space-y-4">
      <EmailNav />
      {children}
    </div>
  );
}
