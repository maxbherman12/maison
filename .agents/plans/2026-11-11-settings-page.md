# Settings page: profile, business details, invoice style

**Status:** Approved

## Context

`/settings` is currently a placeholder. Several things the designer should control are hardcoded today:
- The invoice letterhead always says **"Maison"** (`lib/invoices/pdf.ts` `drawHeader`, `components/features/invoices/InvoiceDocument.tsx`).
- Invoices have **no sender block**: no business address, email, or phone.
- Payment terms come from the **`INVOICE_DUE_DAYS` env var** (`lib/services/invoices.ts` `dueDays()`), so they are the same for every account.
- There is **one invoice look**.

**Goal:** one compact settings page where each account sets its profile, business details, and invoice preferences. New invoices use those settings. Nothing beyond what's listed below.

## Scope (agreed with the user)

| Tab | Fields |
|---|---|
| **Profile** | Display name (editable), Google avatar, email (read-only, "Signed in with Google") |
| **Business** | Company name, business address (2-line textarea), business email, business phone, default hourly rate (pre-fills New project) |
| **Invoices** | Style picker (3 visual cards, **saves instantly**), payment terms (due in N days, 0–365, default 14), payment note (free text printed at the foot of the invoice) |

**Out of scope for v1** (noted for later): logo upload, tax/VAT, a custom starting invoice number, email sending, light/dark preference.

## UX / design

- `AppShell` (scrolling `<main>`) and the same `max-w-3xl` column as `/admin`. Header: `text-label` "Account" above a serif `text-heading` "Settings".
- `SegmentedTabs` (`components/ui/segmented-tabs.tsx`) for **Profile / Business / Invoices**, so each tab fits a phone screen without scrolling. The initial tab can come from `?tab=`, so the invoice composer can link to `/settings?tab=invoices`.
- **One form across the tabs.** Hidden panels stay mounted (`hidden` attribute), so a single **Save changes** button sends everything. The button is disabled until the form is dirty. It sits at the bottom of the column (sticky on phones). If validation fails in a hidden tab, the page switches to the first tab with an error.
- **Style picker:** three square-cornered radio cards in a row, styled like the paint picker in `ProjectForm` (`has-checked:-translate-y-1.5` lift with the ink shadow, `has-focus-visible` outline). Each card shows a **live miniature invoice** (sample lines, the company name from the form as you type, a default paint) above its name and a one-line description. A click saves right away through its own action and `useOptimistic`, then shows a short "Saved" tick. The text fields still use Save changes.
- Palette stays within the rules: ink plus a paint. Red appears only for errors.

### The three styles
Defined once as tokens in `lib/domain/invoice-styles.ts`. The HTML preview, the on-screen invoice, and the PDF all read the same tokens.

| Style | Look | PDF fonts |
|---|---|---|
| **Gallery** (default, today's look) | Paint stripe on top, serif letterhead on the left, hairline rules | Times (serif) + Helvetica |
| **Ledger** | Classic: sans letterhead, solid ink band behind the column headings with light text, every row ruled, total in a boxed cell | Helvetica |
| **Atelier** | Large centered serif letterhead, lots of whitespace, small-caps labels, a single rule above the total | Times |

Tokens, not per-style code paths: `{ letterheadFont, letterheadAlign, accent: 'paint-bar' | 'none', headings: 'plain' | 'band', rows: 'open' | 'ruled', total: 'line' | 'box' }`. Adding a fourth style later means adding one token entry.

## Data model

New table `account_settings` in `lib/db/schema.ts`, one row per account:
- `owner_id uuid PK → users.id on delete cascade`
- `company_name`, `business_address`, `business_email`, `business_phone`, `payment_note`: `text not null default ''`
- `invoice_style` (new pgEnum from `INVOICE_STYLES`): `not null default 'gallery'`
- `payment_terms_days integer not null default 14`, check `between 0 and 365`
- `default_hourly_rate_cents integer null`, check `> 0`
- `updated_at`

The row is optional. `SettingsService.get()` returns defaults when it's missing, and writes upsert (`onConflictDoUpdate`).

**Invoice snapshot** (same idea as today's bill-to snapshot, so the screen matches the PDF that was sent). New columns on `invoices`:
- `style invoice_style not null default 'gallery'`
- `from_name text not null default ''`
- `from_details text not null default ''` (address, email, and phone as preformatted lines)
- `payment_note text not null default ''`

The migration backfills `from_name = 'Maison'` on existing rows so old invoices render exactly as their PDFs do.

**Display name** stays in `users.name`. `SettingsService.update` writes it in the same transaction as the settings upsert. There's no session cookie cache, so the header picks it up on the next request.

### Alternatives considered
- **Settings columns on `users`.** Rejected. That table belongs to Better Auth (generated). Adding fields there would mix business config into auth, and Better Auth `additionalFields` would push the values into every session payload.
- **One JSONB `settings` column.** Rejected. It gives no database constraints (terms range, positive rate) and no Drizzle typing. Every new key becomes an unchecked migration in disguise.
- **Re-styling existing invoices from current settings.** Rejected by the user. Stored PDFs can't change, so the screen and the sent document would disagree.

## Implementation

**Domain & validation**
- `lib/domain/invoice-styles.ts`: `INVOICE_STYLES`, labels, descriptions, and tokens. Client-safe.
- `lib/domain/types.ts`: `AccountSettings` (`$inferSelect`) plus `DEFAULT_SETTINGS`. Update `Invoice` for the new snapshot columns (still omitting `pathname` and `ownerId`).
- `lib/validators/settings.ts`: `SettingsSchema`, built from `requiredText`, `optionalText`, and `moneyField` in `lib/validators/fields.ts`. Add a small `optionalPositiveMoneyField` (blank becomes `null`) and a days field (string → integer 0–365). Business email is optional and must be a valid email when filled. Also `InvoiceStyleSchema = z.enum(INVOICE_STYLES)`.

**Service & actions**
- `lib/services/settings.ts`: `SettingsService(ownerId)` with `get()`, `update(input)` (transaction: `users.name` plus the settings upsert), and `setInvoiceStyle(style)`.
- `lib/services/index.ts`: register `settings` and inject it into `InvoiceService(ownerId, blobStore, settings)`.
- `lib/services/invoices.ts`:
  - `generate` reads settings and snapshots `style`, `from_name` (company name, falling back to the user's name), `from_details`, and `payment_note`. It passes them, plus the project's paint color, to the PDF.
  - `markSent` uses `settings.paymentTermsDays` instead of `dueDays()`. Delete `INVOICE_DUE_DAYS`.
- `lib/actions/settings.ts`: `updateSettings(input)` and `setInvoiceStyle(style)`, both through `runAction`.

**PDF**
- `lib/invoices/pdf.ts`:
  - `InvoicePdfInput` gains `style`, `from { name, details }`, `paymentNote`, and `accentColor`.
  - The header, column headings, rows, and total branch on the style tokens.
  - Add a "From" block opposite "Bill to", and the payment note under the total. The existing `encodable`, `fit`, and `drawLeft`/`drawRight` helpers stay.
  - Embed `TimesRoman`/`TimesRomanBold` for serif styles.
  - If the file passes ~300 lines, split it into `lib/invoices/pdf/{index,draw,layout}.ts`.

**UI**
- `components/features/invoices/InvoiceDocument.tsx`: takes `style`, `from`, and `paymentNote`, replaces "Maison" with `from.name`, and applies the tokens.
  - `InvoiceDetailView` passes the invoice's snapshot.
  - `InvoiceComposer` (the draft) passes current settings, loaded in `app/(app)/projects/[id]/invoices/new/page.tsx`, and gets a quiet "Change style" link to `/settings?tab=invoices`.
- `components/features/invoices/InvoiceStylePreview.tsx`: a scaled-down `InvoiceDocument` with sample data (no duplicated markup).
- `components/features/settings/SettingsForm.tsx`: tabs and one RHF form (`zodResolver(SettingsSchema, undefined, { raw: true })`) using the existing `TextField`, `Alert`, `Button`, and `useAction`.
- `components/features/settings/InvoiceStylePicker.tsx`: radio cards, `useOptimistic`, and the instant-save action.
- `app/(app)/settings/page.tsx`: server component that calls `getServices()` → `settings.get()` and `requireUser()` → profile, then renders `SettingsForm`.
- `app/(app)/projects/new/page.tsx` + `ProjectForm`: new `initialHourlyRate` prop from `defaultHourlyRateCents` (via `centsToInput`).

**Docs**
- Update `AGENTS.md`: settings page in Pages, `account_settings` in the data layer, invoice snapshot fields in the billing model, and removal of `INVOICE_DUE_DAYS`.

**Migration:** run `pnpm db:generate`, then hand-add the `from_name = 'Maison'` backfill to the generated SQL, then run `pnpm db:migrate`.

## Review changes (2026-11-11)

- Profile and Business merged into one **Profile** tab: name plus business details. Tabs are now **Profile / Invoices**.
- Removed the email / "Signed in with Google" line from the profile header.
- Textareas (shared `TextAreaField`) get a faint full border so they read as multi-line. This also applies to furniture notes.
- The business name is never truncated: it wraps on the PDF letterhead and on the on-screen invoice and previews.
- Phone layout: `/settings` is now a viewport-first route (`AppShell fill`). It has a compact heading, fixed tabs, and only the active panel scrolls (`overflow-y-auto overscroll-contain`). The save bar appears in the flex column only while there are unsaved changes, a just-saved confirmation, or an error, so it never covers fields. The avatar header is desktop only.

## Workflow
1. Copy this plan to `.agents/plans/`.
2. `treehouse get --lease --json -b settings-page`, then `pnpm install` and copy `.env.local`.
3. Build in the worktree.
4. Review the diff with the user.
5. Merge only after explicit approval, then `treehouse return`, delete the branch, and run `treehouse status`.

## Verification
- `npx tsc --noEmit` and `pnpm build` pass.
- Run `pnpm db:migrate` against local `maison_dev`, then check the existing invoices: `style = 'gallery'` and `from_name = 'Maison'`.
- `pnpm dev` with `IMPERSONATE_USER` set:
  - Fill all three tabs and save. A reload shows the values persisted, and the header name has changed.
  - At phone width (375px), each tab fits without page scroll.
  - Submitting with an invalid email on a hidden tab jumps to that tab.
  - Clicking a style card saves it with no Save press, and the choice survives a reload.
  - New project shows the default hourly rate pre-filled.
  - Generate one invoice per style. Open each PDF and check the letterhead, From block, payment note, and layout. A multi-page invoice still paginates.
  - An invoice generated before the change looks unchanged on screen.
  - Mark an invoice sent: `due_at = sent_at + payment_terms_days`.
  - A second account (switch `IMPERSONATE_USER`) sees default settings, not the first account's.
