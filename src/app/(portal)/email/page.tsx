import { redirect } from "next/navigation";

// Default email landing page — change this to "/email/history" to
// make history the default tab instead of compose.
const DEFAULT_EMAIL_TAB = "/email/compose";

export default function EmailPage() {
  redirect(DEFAULT_EMAIL_TAB);
}
