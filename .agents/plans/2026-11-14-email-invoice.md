# Client contact info and "Email invoice" (issue #9)

**Status:** Approved

## Context

Projects only store `client` (a name) and `address`, so the app has nowhere to keep a client's email or phone. To send an invoice today, the designer has to:

1. download the PDF
2. open a mail app
3. look up the client's address
4. write a message and attach the file
5. come back to the app and press "Mark sent"

That's five chances to drop the ball. Issue #9 asks for two things:
- contact fields on the project
- an **Email invoice** button that hands a pre-filled draft to the designer's own mail app (or the phone's share sheet, with the PDF attached), then offers **Mark sent**

The app still never sends mail itself.

## Scope

**In**
- Optional `clientEmail` and `clientPhone` on projects, editable in the project form (new and edit).
- An **Email invoice** button on invoice detail (`/projects/[id]/invoices/[invoiceId]`) for any invoice that isn't Paid. On an Overdue invoice it works as a reminder.
- Phones and other devices that can share files: `navigator.share({ files: [pdf], title, text })`.
- Everywhere else: a `mailto:` draft (to, subject, body) and the PDF download, triggered by the same click.
- After the hand-off, a confirm sheet offers **Mark sent**, only while the invoice is still Issued. It never marks the invoice sent on its own.
- No email on file: the button still works with To: left blank. A hint links to `/projects/[id]/edit` to add one.

**Out (follow-ups)**
- Showing the email and phone on the project overview (tap to email or call).
- Printing contact details on the PDF.
- Snapshotting the email on the invoice.
- SMS hand-off.
- Editable email templates in Settings.

### Decisions (agreed with you)
- **The To: address is read live from the project.** It is not snapshotted on the invoice. The snapshot model exists so the screen matches the sent PDF, and the email isn't printed on the PDF. A live address means "add an email, come back, send" works right away for an invoice that already exists.
- **Mark sent uses a confirm sheet after the hand-off.**
  - Share: the sheet opens when the share completes. A cancelled share (`AbortError`) opens nothing.
  - `mailto:`: the app can't see what happens in the mail app, so the sheet opens right after the click.

## Approach

### 1. Data model: `lib/db/schema.ts`
Add to `projects`, styled like `address`:
```ts
clientEmail: text('client_email').notNull().default(''),
clientPhone: text('client_phone').notNull().default(''),
```
Using `not null default ''` matches `address` and `account_settings.business_email`, so there's no null handling anywhere. Run `pnpm db:generate`, which creates an additive migration that needs no backfill. `Project`, `ProjectListItem` and `ProjectDetail` pick up the new columns automatically through `$inferSelect` / `getTableColumns`.

### 2. Validation: `lib/validators/projects.ts` and `fields.ts`
- Move the optional-email refine from `SettingsSchema.businessEmail` into a shared `OptionalEmailField` in `lib/validators/fields.ts`. Then use it in both `SettingsSchema` and `ProjectSchema`, so there's one definition.
- `ProjectSchema` gains:
  - `clientEmail: OptionalEmailField`
  - `clientPhone`: optional text, at most 50 characters

  The transform passes both through untouched. `ProjectService.create/update` already spread the parsed input, so I'll confirm that and expect no service change.

### 3. Project form: `components/features/projects/ProjectForm.tsx`
- Add a two-column row under Client name: **Email** (`type="email"`, `autoComplete="off"`) and **Phone** (`type="tel"`, `inputMode="tel"`), both with placeholder "Optional". Add both to `defaultValues`.
- The form must still fit a phone screen without scrolling. I'll check this at 375×667.

### 4. Drafting the email: new `lib/domain/invoice-email.ts`
This module is pure and safe to use in the browser. The wording lives here, not in the component, so it can be reused and tested without the UI.
```ts
buildInvoiceEmail(input: {
  number: number; projectName: string; clientName: string;
  totalCents: number; dueAt: Date | null; paymentTermsDays: number;
  paymentNote: string; fromName: string; clientEmail: string;
}): { to: string; subject: string; body: string }

mailtoHref(draft): string   // encodeURIComponent for subject/body; `to` left raw
```
- **Subject:** `Invoice #12 — Kitchen remodel`, built with `formatInvoiceNumber`.
- **Body:**
  - a greeting with the client's first name
  - the amount, via `formatMoney`
  - the due line:
    - if `dueAt` is set (a resend): "due {formatDate(dueAt)}"
    - otherwise: "due within N days" (or "due on receipt" when N is 0). That way the email never states a date that disagrees with the one Mark sent will set.
  - the payment note, if there is one
  - a sign-off with `fromName`
- The body says the PDF is attached. On phones it is. On desktop the click downloads it so the designer can attach it.

### 5. Page data: `app/(app)/projects/[id]/invoices/[invoiceId]/page.tsx`
Pass `clientEmail={project.clientEmail}` and `paymentTermsDays` (from `services.settings.get()`, loaded in parallel with the invoice) to `InvoiceDetailView`. No new service methods.

### 6. Hand-off logic: new `components/features/invoices/useInvoiceHandoff.ts`
A small client hook that keeps the browser API details out of the view.
- **Load the PDF ahead of the click.** iOS Safari drops the "user tapped" permission across an `await fetch`, which makes `navigator.share` throw `NotAllowedError`. So on mount, if `navigator.canShare` exists:
  1. fetch `/api/invoices/{id}/pdf`
  2. wrap it in a `File` named `invoice-12.pdf`
  3. check `navigator.canShare({ files: [file] })`
  4. keep the file in state

  This effect syncs with an outside resource, which the "no effects for derived state" rule allows. It uses an `AbortController` for cleanup.
- `handOff()` returns `Promise<'shared' | 'drafted' | 'cancelled'>`:
  - **The file is ready and sharable:** call `navigator.share({ files, title: subject, text: body })` right in the click handler. If it resolves, return `'shared'`. On `AbortError`, return `'cancelled'`. On any other error, fall back to mailto.
  - **Otherwise:** trigger the PDF download with a temporary `<a download>`. Then set `window.location.href = mailtoHref(draft)` and return `'drafted'`.
- On some phones (Android Chrome, for example) `canShare` says no to files. Those fall back to mailto, which still opens the mail app.

### 7. Invoice detail UI: `components/features/invoices/InvoiceDetailView.tsx`
- **Footer**, when not Paid:
  - **Download PDF**: outline, icon-only (`Download`, with an aria-label) on phones so three actions fit
  - **Email invoice**: the primary button while Issued, outline afterwards
  - the existing next-step button: **Mark sent** stays as a secondary outline button while Issued, for invoices sent some other way. **Mark paid** stays primary once sent.
- **When there's no email on file**, show a short line above the footer: "No email on file for {client}. Add one", linking to `/projects/{projectId}/edit`. The button still opens the draft with To: blank.
- **After the hand-off**, if the result is `'shared'` or `'drafted'` and the status is Issued, open the existing `ConfirmDialog` with:
  - title "Did you send #12?"
  - the description from `CONFIRMATIONS.sent`
  - confirm label "Mark sent"
  - cancel label "Not yet"

  This reuses the same `markInvoiceSent` action. `'cancelled'` opens nothing. If `ConfirmDialog` has no prop for the cancel label, I'll add an optional `cancelLabel` prop to it.

## Alternatives considered
- **Server-side sending (Resend or similar).** Rejected. It breaks the "no email sending" rule, needs a sending domain and deliverability setup, and replies would come from the app instead of the designer's own inbox.
- **Snapshotting `client_email` on the invoice.** Rejected with you (see Decisions). It makes the "add an email" nudge useless for the invoice in front of you, and nothing printed relies on it.
- **A separate `clients` table** (one client, many projects, with contact info). It's a cleaner model in the long run, but it's a much larger migration and UI change than this issue needs. Today `client` is a field on the project. The new columns can move into a `clients` table later if multi-project clients become a real need.
- **Fetching the PDF inside the click handler.** Simpler, but iOS Safari loses the tap permission across the await and the share fails. Loading it ahead of time avoids that.

## Files
- `lib/db/schema.ts`, plus the generated `drizzle/` migration
- `lib/validators/fields.ts`, `lib/validators/projects.ts`, `lib/validators/settings.ts` (switch to the shared email field)
- `lib/domain/invoice-email.ts` (new)
- `components/features/projects/ProjectForm.tsx`
- `components/features/invoices/InvoiceDetailView.tsx`, `components/features/invoices/useInvoiceHandoff.ts` (new)
- `components/ui/confirm-dialog.tsx` (optional `cancelLabel`, if needed)
- `app/(app)/projects/[id]/invoices/[invoiceId]/page.tsx`
- `AGENTS.md`: Billing model, add that "Email invoice" hands a draft to the user's own mail app or share sheet and that the app still sends nothing. Data layer, add the project contact fields.

## Workflow
1. Run `treehouse get --lease --json -b email-invoice`, move into the worktree, then `pnpm install`.
2. Commit this plan to `.agents/plans/2026-11-14-email-invoice.md`.
3. Implement in the order above, then `pnpm db:generate && pnpm db:migrate`.
4. Review with you (`git diff main...HEAD`). Merge only after you explicitly approve. Then `treehouse return` and delete the branch.

## Verification
- `npx tsc --noEmit` and `pnpm build` pass.
- **Project form:** create and edit a project with an email and phone. An invalid email shows the inline error. Blank fields save as `''`. At 375×667 the form fits without scrolling.
- **Desktop (Chrome, Safari, Firefox):** Email invoice opens the mail app with To, subject and body filled in, and the PDF downloads. The confirm sheet appears. "Not yet" leaves the invoice Issued, and "Mark sent" sets `sent_at`/`due_at`.
- **No email:** the hint shows and links to edit. After adding an email and coming back, To: is filled in.
- **Phone (iOS Safari via LAN dev URL; Android Chrome):** the share sheet opens with `invoice-N.pdf` attached and Mail pre-fills the subject and body. Cancelling the share opens no sheet. Completing it opens the Mark sent sheet.
- **Resend on a Sent or Overdue invoice:** the body states the stored due date and no Mark sent sheet appears. Paid invoices show no Email button.

## Risks / open questions
- **What share targets do with the text.** iOS Mail uses `title` as the subject and `text` as the body. Some apps ignore `title`. That's acceptable, since the PDF is the important part.
- **Download and mailto in one click.** Starting a download and a `mailto:` navigation from one click should work in the major browsers, but I'll check all three. If one blocks it, I'll start the download first and open mailto on the next tick.
- **Body length.** The `mailto:` body is limited to about 2,000 characters in some clients. The drafted body is far shorter, but a very long payment note could get close.

## Revision (review, 2026-11-15)
Testing on desktop showed the `mailto:` draft arriving without the PDF, as expected but not what the user wanted. The user chose to put attaching first: any browser that can share files (desktop Chrome and Safari included) now uses the share sheet, and the client's email is copied to the clipboard with a toast reminding you to paste it into To:. Browsers without file sharing (Firefox desktop) keep the `mailto:` draft plus download.
