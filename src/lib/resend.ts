import "server-only";
import { Resend } from "resend";

// Construct lazily so `next build` (which evaluates server modules while
// collecting page data) never requires RESEND_API_KEY — only an actual send
// needs the key, at runtime.
let client: Resend | null = null;

export function getResend(): Resend {
  return (client ??= new Resend(process.env.RESEND_API_KEY));
}
