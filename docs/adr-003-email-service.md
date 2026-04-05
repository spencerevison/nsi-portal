# ADR-003: Email Service

**Status:** Accepted
**Date:** 2026-04-04
**Author:** Spencer Campbell

## Context

The NSI Community Portal requires an email service for two use cases:

1. **Group email / broadcast** — Allison or a council member composing and sending an email to a group (Council, First Gen, Second Gen, Third Gen, Work Party, or All Members). This is one of the three core MVP pillars and the primary use case for the email service.
2. **Notification email** — System-triggered emails when someone posts on the community board, replies to a thread, or other automated events. These are transactional, one-to-one emails.

Clerk (ADR-001) handles its own invitation and password reset emails, so the email service chosen here does not need to cover authentication-related emails.

**Volume estimate:** ~70–112 members. Group broadcasts will go out a few times per month at most. Community board notifications depend on activity but will be low for a 14-property community. Realistic monthly volume is 500–1,500 emails, with a theoretical maximum of ~3,400 if a broadcast went to all members every day.

**Deliverability is the top priority.** Community members use a range of email providers, including older/legacy providers like Shaw (now owned by Rogers), Hotmail/Outlook, and Yahoo. Emails landing in spam or not arriving at all is the exact problem the portal is meant to solve — the current email-based communication system already suffers from members not receiving emails.

## Options Considered

### Option A: Resend

Resend is a developer-focused email API built by the team behind React Email. It provides a REST API, Node.js SDK, and native integration with React Email for building email templates as JSX components.

**Free tier:** 3,000 emails/month, 100 emails/day, 1 custom domain, webhook support. No credit card required, no expiration.

**Pros:**

- Free tier is more than sufficient for NSI's volume — unlikely to ever need a paid plan
- React Email integration means email templates are JSX components in the codebase, version-controlled and styled with the same patterns as the rest of the app
- Clean, well-documented API with a modern developer experience
- Webhook support for tracking delivery events (bounces, opens, clicks) — useful for logging delivery status to the `EmailLog` table in Supabase
- Batch API supports sending up to 100 emails per API call, efficient for group broadcasts
- Domain verification with SPF, DKIM, and DMARC configuration guidance — critical for deliverability to legacy providers
- Shared IP pool is actively managed for reputation

**Cons:**

- Newer company (founded 2023) — less track record than established providers, though adoption has been strong
- Free tier has a 100 emails/day cap — not a concern for NSI's volume, but worth noting
- Broadcast/marketing email is priced separately from transactional email on paid plans — irrelevant at NSI's volume but would matter at scale

**Cost:** $0/month (free tier). Pro plan at $20/month for 50,000 emails if ever needed.

### Option B: SendGrid (Twilio)

SendGrid is an established email delivery platform, now owned by Twilio. It has been widely used for both transactional and marketing email.

**Pros:**

- Long track record, large infrastructure, battle-tested at scale
- Comprehensive analytics and deliverability tooling
- Well-known in the industry with extensive documentation

**Cons:**

- Free tier was eliminated in May 2025 — only a 60-day trial remains, after which the minimum paid plan is $19.95/month
- $19.95/month for the Essentials plan is hard to justify for a community that sends a few hundred emails per month
- More complex API and dashboard than needed for NSI's simple use case
- Template system uses its own syntax rather than integrating with the application's component framework

**Cost:** $19.95/month minimum after the 60-day trial (Essentials plan, up to 50,000 emails/month).

### Option C: AWS SES

AWS Simple Email Service is raw email infrastructure — the cheapest option at scale ($0.10 per 1,000 emails) but requires building your own template management, analytics, bounce handling, and deliverability monitoring.

**Pros:**

- Cheapest per-email cost at any volume
- Full control over sending infrastructure
- No vendor lock-in beyond AWS

**Cons:**

- No managed dashboard, template editor, or analytics — all must be built or sourced separately
- Deliverability monitoring and bounce handling are the developer's responsibility
- AWS console is not user-friendly for a project optimizing for simplicity and maintainability
- Contradicts the design principle of paying for managed services over minimizing cost
- Spencer's prior experience with SES was not positive

**Cost:** ~$0.10/month at NSI's volume (effectively free). But the hidden cost is development and maintenance time for surrounding infrastructure.

## Decision

**Resend.**

The primary driver is developer experience aligned with the stack. Resend's React Email integration means email templates are JSX components — built, styled, and tested alongside the rest of the Next.js application. For a solo developer building a full-stack portal, eliminating a separate email template system reduces cognitive overhead and keeps the entire codebase in one paradigm.

The secondary driver is cost. Resend's free tier covers NSI's volume with significant headroom. SendGrid's elimination of its free tier means a minimum $20/month commitment for a service that would send a few hundred emails per month — poor value and unnecessary spend against a finite budget.

The tertiary driver is deliverability. Resend provides domain verification tooling with clear guidance for SPF, DKIM, and DMARC configuration. Proper DNS authentication is the most important factor for inbox placement on legacy providers like Shaw, Hotmail, and Yahoo. Resend's actively managed shared IP pool provides good default deliverability without requiring a dedicated IP (which NSI's volume wouldn't sustain anyway — dedicated IPs need consistent sending volume to maintain reputation).

AWS SES was eliminated because it trades infrastructure cost for maintenance cost, directly contradicting the project's design principles. The email infrastructure would become an ongoing maintenance obligation rather than a managed service.

## Implementation Notes

### Group email flow

1. Allison (or a council member with `email.send` capability) opens the email compose UI in the portal
2. Selects target group(s) — e.g., "Work Party" or "All Members"
3. Writes subject and body using a rich text editor
4. Clicks send → the application resolves group membership to a list of email addresses from Supabase
5. Emails are sent via Resend's batch API (up to 100 per API call)
6. An `EmailLog` record is created in Supabase with subject, body, sender, target group, recipient count, and timestamp
7. Resend webhooks report delivery events (delivered, bounced, opened) which can be logged against the `EmailLog` record

### Email templates

Templates will be built using React Email — JSX components that render to HTML email. Key templates:

- **Group broadcast** — the main email template for Allison's group emails, with the portal's branding, the composed message body, and an unsubscribe/preferences link
- **Community board notification** — triggered when a new post is created or a reply is made, with a link back to the post in the portal
- **Welcome email** — sent after a member completes onboarding (separate from Clerk's invitation email), introducing the portal features

### Domain and DNS configuration

A custom sending domain (e.g., `mail.nsi-portal.ca` or similar) will be configured with:

- **SPF** — authorizes Resend's servers to send on behalf of the domain
- **DKIM** — cryptographic signature for email authenticity
- **DMARC** — policy for how receiving servers should handle authentication failures

This is the single most impactful step for deliverability to legacy providers and must be completed before any emails are sent to real members.

### Reply-to address

Group emails will use a reply-to address that routes to the sender's personal email (e.g., Allison's email). This keeps responses personal and natural rather than routing them to a no-reply address or a shared inbox. The from address will be the portal's domain (for deliverability), but replies go to the human who composed the email.

## Consequences

**Enables:**

- Email templates as version-controlled JSX components in the application codebase
- Free email delivery at NSI's volume with no paid plan needed
- Webhook-based delivery tracking for logging and debugging
- Clean API integration from Next.js API routes or server actions

**Constrains:**

- Coupled to Resend's API for email sending — migration to another provider would require updating API calls and rebuilding templates if not using React Email's provider-agnostic output
- Free tier has a 100/day API request cap and 3,000/month email cap — sufficient for NSI but would require a paid plan if volume grew significantly
- Resend is a younger company than SendGrid or AWS — less track record, though adoption has been strong

**Accepts:**

- Dependency on Resend for email delivery, though the API surface is small and migration to another provider would be straightforward (~1 day of work)
- The free tier could change, potentially requiring up to $20/month — well within budget
- Shared IP deliverability is dependent on Resend's IP reputation management, which is outside our control
