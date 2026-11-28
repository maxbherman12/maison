# Markup and client pricing on furniture (issue #7)

**Status:** Approved
**Related:** `2026-10-27-billing-foundation.md`, `2026-11-11-settings-page.md`

## Context

Furniture is billed at trade. `furnitureToBillable` (`lib/domain/billing.ts:53`) uses `item.tradeCents` as the line amount, and the `outstandingCents` SQL in `lib/services/projects.ts:11` sums `trade_cents`. Retail is stored but never used, and the app has no idea of markup. Designers make much of their income on product. Today they have to do the math outside the app and type the result into the trade field, which also overwrites what they actually paid.

What we want:
- Each project sets the markup that applies to its furniture by default.
- An individual piece can override that markup with its own percentage.
- A piece can also skip percentages entirely and take a hand-typed client price.
- Pending lists, the composer, outstanding totals and generated invoices all bill the resulting client price.
- Issued invoices never change.
- The PDF shows only the client price.
- Earnings reports product profit.

## Revision (2026-11-26, after review)

- **Markup is on trade ("cost plus").** Client price = trade × (1 + markup), capped at 1000%. A markup on the trade–retail gap was tried and dropped: discount-sharing is less common than cost plus, and the issue asks for trade plus markup. Billing at retail is still done by typing the price.
- **The piece form is pre-filled, not hinted.** Markup starts at the project's value, and Client price starts at the derived price and follows trade, retail and markup as they change. Hidden `customMarkup`/`customPrice` flags record whether the designer changed a value. Unchanged values save as null, so they keep inheriting. "Use project X%" and "Use markup price" reset them.

## Revision 2 (2026-11-28): client paid the vendor

- **Per-piece "Exclude trade price" checkbox**, off by default, stored as `furniture_items.exclude_trade boolean not null default false` (migration `0006`). Checked, the piece bills `max(client price − trade, 0)`, which is only the markup.
- **`client_price_cents` always means the client price.** Invoicing freezes the client price, not the billed amount, and the billed amount is derived from price, trade, and `exclude_trade`. Freezing the billed amount was rejected: the derivation would subtract trade twice on invoiced pieces.
- **Cost snapshot** is trade when the box is checked and 0 when the client paid, so Earnings counts the whole fee as product profit.
- **Decided with the user:** per piece only, with no project default, and the PDF line is unchanged.
- **Rejected:** a separate fee-only billable kind. It would have spread through kinds, labels, the PDF, and the enum.

Where this conflicts with the text below, the revision wins.

## Decisions

- **Precedence, one rule.** A piece's client price is resolved in this order:
  1. the piece's **fixed client price**, if set (no percentage involved);
  2. otherwise trade × (1 + the piece's **markup override**), if set;
  3. otherwise trade × (1 + the **project markup**).

  A fixed price always wins over any percentage.
- **The project markup is the default.** `projects.markup_bps integer not null default 0`. Existing projects keep billing at trade until the designer sets a markup, so nothing changes on deploy. There is no account-wide setting in this phase.
- **Markup is integer basis points** (`2500` = 25%). The forms take a percent string, and the action converts it with `Math.round(pct * 100)`, the same way dollars become cents.
- **There is one rounding rule, in one place:** `markupPriceCents(trade, bps) = floor((trade * (10000 + bps) + 5000) / 10000)`. That is integer math, rounded half up, applied once per piece. SQL uses the identical integer expression (cast to `bigint`), so the outstanding total and the JS total always match.
- **Freeze on invoice.** `InvoiceService.generate` writes the billed amount into `furniture_items.client_price_cents` when it sets `invoice_id`, so an invoiced piece always shows what it was billed, even if a markup changes later. For an invoiced row, `client_price_cents` is the billed price.
- **Cost snapshot for earnings.** `invoice_line_items` gets a nullable `cost_cents`, set to trade for furniture lines and null for others. Product profit = `amount_cents − cost_cents` over furniture lines on paid invoices. This keeps invoices self-contained, in line with the existing snapshot model.

## Approach

### 1. Pure domain: new `lib/domain/pricing.ts`
- `MAX_MARKUP_BPS = 100_000` (1000%).
- `markupPriceCents(tradeCents, markupBps)`: the rounding rule above.
- `furniturePricing(item, projectMarkupBps)` returns `{ priceCents, source }`, where `source` is `'fixed' | 'item' | 'project'`. It applies the precedence rule, and the UI uses `source` to label where a price came from.
- `furniturePriceCents(item, projectMarkupBps)`: shorthand for `furniturePricing(…).priceCents`.
- `marginCents(price, trade)` and `formatMarkup(bps)`, which renders `25%` or `27.5%`.

### 2. Schema and migration: `lib/db/schema.ts`
- `projects.markup_bps integer not null default 0`, check `between 0 and 100000`.
- `furniture_items.markup_bps integer` (nullable, same check): the per-piece percentage override.
- `furniture_items.client_price_cents integer` (nullable), check `>= 0`: the fixed price, or the frozen billed price once invoiced.
- `invoice_line_items.cost_cents integer` (nullable), check `>= 0`.
- `pnpm db:generate` creates `0005_…sql`. Append a hand-written backfill to it:
  - `update furniture_items set client_price_cents = trade_cents where invoice_id is not null;`
  - `update invoice_line_items set cost_cents = amount_cents where kind = 'furniture';`

  Both are accurate because every existing invoice billed furniture at trade.

### 3. Billing: `lib/domain/billing.ts`
- `buildBillableItems(rows: { charges; furniture; markupBps })`. `ProjectDetail` already carries `markupBps` through `$inferSelect`, so existing callers that pass `project` need no change: `ProjectLists`, `InvoiceComposer`, `ProjectLog` and `ProjectOverview`.
- `furnitureToBillable` uses `furniturePriceCents(item, markupBps)` and also carries `costCents: item.tradeCents`, which is used only for the line-item snapshot.

### 4. Services
- **`outstandingCents` SQL** (`lib/services/projects.ts`): the furniture sum becomes
  `coalesce(fi.client_price_cents, (fi.trade_cents::bigint * (10000 + coalesce(fi.markup_bps, projects.markup_bps)) + 5000) / 10000)`.
  No join is needed, because the subquery is already correlated to `projects`.
- **`ProjectService.create/update` and `FurnitureService.add/update`**: no change. They spread the parsed input, so the new fields flow through.
- **`InvoiceService.generate`** (`lib/services/invoices.ts:144-216`):
  - pass `project.markupBps` to `buildBillableItems`
  - insert `costCents` into line items
  - set each furniture row's `client_price_cents` to its billed amount: one update per row inside the transaction, which is fine because rows are few

  The PDF input stays limited to `title` and `amountCents`, so cost and margin cannot reach the document.
- **`InvoiceService.paidSince`**: add two aggregate subqueries per invoice:
  - `productProfitCents` = `sum(amount_cents - cost_cents)` where `kind = 'furniture'`
  - `feesCents` = `sum(amount_cents)` where `kind <> 'furniture'`

### 5. Validators
- **`lib/validators/fields.ts`**:
  - add `markupField(message)`: a required percent from 0 to 1000 that yields bps, used by the project
  - add `optionalMarkupField(message)`: a blank value gives `null`, otherwise bps, used by the piece
  - add `optionalNullableMoneyField(message)`: a blank value gives `null`, otherwise cents, with 0 allowed
- **`projects.ts`**: `markup` → `markupBps`.
- **`furniture.ts`**: `markup` → `markupBps` and `clientPrice` → `clientPriceCents`, renamed in `renamePrices`.

### 6. UI
- **Project form** (`ProjectForm.tsx`): add "Markup (%)", defaulting to `0`. Layout: put Address on its own full-width row and pair Hourly rate with Markup, then check that it still fits at 375×667.
- **Furniture price fields** (`FurnitureFields.tsx`): `FurniturePriceFields` takes a `projectMarkupBps` prop.
  - First row: Trade and Retail, as today.
  - Second row: **Markup (%)**, with the placeholder `Project 25%` (blank inherits), and **Client price**, with the live derived price as its placeholder (blank uses markup).
  - Once Client price has a value, the Markup input is disabled and shows `Fixed price`, so the precedence is visible rather than surprising.
  - One live label line, from `useWatch` plus `furniturePricing`: `Billed $1,250.00 · Margin $250.00 · 25% project markup`. The last part reads `30% item markup` or `fixed price` depending on the source.

  `LogForms.tsx` and `EditItemForm.tsx` pass `project.markupBps` through from their pages.
- **Invoiced piece** (`InvoicedFurnitureForm`): the summary line becomes `Vendor · Trade $X · Billed $Y · Margin $Z`.
- **Pending row** (`ProjectLists.tsx:137`): `${formatMoney(furniturePriceCents(item, project.markupBps))} to invoice`.
- **Earnings**:
  - `PaidInvoice` and `EarningsMonth` gain `productProfitCents` and `feesCents`, summed in `buildEarningsMonths`.
  - `EarningsView` adds one label line under the headline amount for the selected period: `Fees $X · Product profit $Y`.

### 7. Docs
Update the **Billing model** and **Data layer** sections of `AGENTS.md`:
- the precedence rule and the bps storage
- the rounding rule in `lib/domain/pricing.ts`
- that `client_price_cents` is the fixed price while a piece is pending and the frozen price once it is invoiced
- that `cost_cents` is the profit snapshot

## Alternatives considered (rejected)

- **Store a computed client price on every furniture row at write time.** A change to the project markup would not reach pending pieces unless we rewrote them, and there would be two sources of truth for the same number. Deriving it at read time, through one domain function and its SQL twin, follows how `outstanding` and `buildBillableItems` already work.
- **An account-wide default markup in Settings, inherited by projects.** This was the first draft. It was dropped in favour of the project as the default: markup varies by client agreement, so an account-wide value would mostly be overridden. A "prefill new projects with X%" setting, like the default hourly rate, can be added later without changing the model.
- **A pricing-mode enum on the piece (`project | item | fixed`).** Nullable columns already encode the mode, and the precedence rule is simpler to read than an enum plus values that may be stale.
- **Join line items to `furniture_items` for profit instead of snapshotting `cost_cents`.** It works today because invoiced pieces are locked, but `source_id` has no FK, and the invoice model is built on snapshots.

## Files affected

- **New:** `lib/domain/pricing.ts`, `lib/db/migrations/0005_*.sql`
- **Domain:** `lib/domain/{billing,earnings}.ts`
- **Schema:** `lib/db/schema.ts`
- **Services:** `lib/services/{projects,invoices}.ts`
- **Validators:** `lib/validators/{fields,projects,furniture}.ts`
- **Components:** `components/features/furniture/FurnitureFields.tsx`, `billing/EditItemForm.tsx`, `projects/{ProjectForm,ProjectLists}.tsx`, `projects/log/LogForms.tsx`, `earnings/EarningsView.tsx`
- **Pages:** `app/(app)/projects/[id]/{log,items/[itemId]}/page.tsx` (pass the markup through)
- **Docs:** `AGENTS.md`

## Workflow

1. `treehouse get --lease --json -b furniture-markup`, then `pnpm install` in the worktree.
2. Commit this plan to `.agents/plans/2026-11-24-furniture-markup.md`.
3. Implement, then walk you through `git diff main...HEAD`.
4. Merge only after your explicit approval, then `treehouse return` and delete the branch.

## Verification

- `npx tsc --noEmit` and `pnpm build` are clean. `pnpm db:generate` and `pnpm db:migrate` apply on a copy of the dev DB, and existing invoices' line amounts are untouched.
- Manual checks in `pnpm dev` (with `IMPERSONATE_USER`), driven through Chrome:
  1. Set the project markup to 25%. A piece with trade $1,000 shows $1,250 to invoice, and the overview, client list outstanding and composer all agree.
  2. Set the piece's markup to 30%. It shows $1,300, and the other pieces stay at 25%. Clear it and the piece goes back to $1,250.
  3. Enter a client price of $1,100 on a piece that also has a 30% override. It bills $1,100, the Markup input reads "Fixed price", and the margin is $100.
  4. Edge rounding: trade $0.02 at 25% gives $0.03. Check that the client list (SQL) and the overview (JS) match.
  5. Generate the invoice. The PDF shows only client prices, with no trade or margin. Change the project markup afterwards: the invoice, its PDF and the invoiced piece sheet are unchanged.
  6. Mark the invoice paid. Earnings shows fees and product profit for the month and for the full period.
  7. The project form, the item sheet and earnings fit at 375×667 without page scroll.

## Risks and open questions

- **Margin can be negative** if the designer types a client price below trade. It is shown as-is, not blocked.
- **The item sheet gains a row.** The edit sheet scrolls inside `FlowBody`, but the log flow should still fit a phone screen. If it doesn't, Markup and Client price collapse behind a "Pricing" disclosure that shows the billed price.
