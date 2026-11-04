# Single base theme + component consistency pass

**Status:** Implemented — awaiting review

**Date:** 2026-11-04

**Branch:** `theme-consistency`

**Related:** [2026-10-22-native-app-shell.md](./2026-10-22-native-app-shell.md), [2026-11-03-viewport-first-routes.md](./2026-11-03-viewport-first-routes.md)

---

## 1. Problem

The app has two competing colour systems:

1. **Hard-coded warm Maison palette** (`#bd765b`, `#f7f6f2`, `#deddd5`, `#fffefa`, …) used directly in most feature components.
2. **Shadcn semantic tokens** (`bg-background`, `text-muted-foreground`, `border-border`, `text-destructive`, …) used in a smaller set of places, mostly shared UI and loading/error states.

`app/globals.css` currently overrides those semantic tokens with a `.dark` block **and** a `@media (prefers-color-scheme: dark)` block. As a result, on a machine set to dark mode the token-based parts of the UI turn dark while the hard-coded warm surfaces stay light. The result is mixed light/dark surfaces, unreadable text, and an inconsistent look. The same duplication shows up in `components/ui/button.tsx`, which carries unused `dark:` variants.

Beyond colour, several components have drifted apart:

- Four near-identical form-field implementations (`ProjectOnboard`, `LogHoursForm`, `AddFurnitureForm`, `CustomChargeForm`) plus two more in `EditBillableItemSheet` and `ProjectSummary`.
- Buttons are a mix of the shared `Button`, `buttonVariants` links, and raw `<button>`/`<Link>` elements. Brand buttons repeatedly re-specify `bg-[#bd765b] text-white`, so hover, radius, and height vary.
- Two dialogs (`FurnitureSheet`, `EditBillableItemSheet`) duplicate overlay, close-button, focus, and escape handling.
- Status colours are defined in three different maps (`ProjectItemsGridInner`, `InvoiceStatusBadge`, `furniture-status.ts`) with different tints for the same concepts.
- Notices/toasts and segmented tabs are duplicated between project detail and the invoice workspace.
- Several actions use the browser's native `window.confirm`, which does not match the app shell.

The desired outcome is one light base theme with a single source of truth, and one shared visual language across every screen.

## 2. Desired outcome

- The app is **light only**. No `.dark` overrides, no `prefers-color-scheme` switching, no `dark:` utilities, no dark `themeColor`, and `color-scheme: light` declared.
- The warm Maison palette is expressed as **semantic CSS variables** in `app/globals.css`; feature components use token utilities (`bg-background`, `bg-card`, `bg-secondary`, `bg-muted`, `bg-accent`, `text-primary`, `border-border`, …) instead of raw hex values.
- A small set of **tone tokens** covers status/badge colours so invoice, furniture, and billable-row badges share one palette.
- Shared primitives own the repeated patterns: form fields, badges, sheets/dialogs, alerts, toasts, segmented tabs, and confirmation dialogs.
- Every screen keeps its current layout, scrolling, and behaviour; only the visual language is unified.

## 3. Proposed approach

### 3.1 Theme foundation (`app/globals.css`, `app/layout.tsx`)

Replace the current token block with a single `:root` theme. Remove:

- `@custom-variant dark`.
- The `.dark { … }` block.
- The `@media (prefers-color-scheme: dark) { … }` block.
- Unused `--chart-*` and `--sidebar-*` tokens.

Map the existing warm palette onto the shadcn tokens:

| Token | Value | Replaces |
| --- | --- | --- |
| `--background` | `#f7f6f2` | `bg-[#f7f6f2]` |
| `--foreground` | `#292923` | `text-[#292923]` |
| `--card` / `--popover` | `#fffefa` | `bg-[#fffefa]` |
| `--secondary` | `#fbfaf7` | `bg-[#fbfaf7]` |
| `--muted` | `#ece9e0` | `bg-[#ece9e0]`, `#f1efe8`, `#e8e5dc` |
| `--muted-foreground` | `#85857a` | `text-[#85857a]`, `#99998e`, `#6b6b60` |
| `--accent` | `#f1e6df` | `bg-[#f1e6df]`, `#f5e7e0` |
| `--accent-foreground` | `#a9573d` | `text-[#a9573d]`, `#6b564a` |
| `--primary` | `#bd765b` | `bg/text/border-[#bd765b]` |
| `--primary-foreground` | `#ffffff` | `text-white` on brand |
| `--primary-hover` | `#a9573d` | `hover:bg-[#a9573d]` |
| `--destructive` | `#a9573d` | error text/borders |
| `--border` / `--input` | `#deddd5` | `border-[#deddd5]` |
| `--ring` | `#bd765b` | focus rings |
| `--success` | `#6f8062` | paid/success button |
| `--success-foreground` | `#ffffff` | text on success |

Add tone pairs used by badges and status dots:

```css
--tone-neutral-bg: #ece9e0;   --tone-neutral-fg: #6b564a;
--tone-brand-bg:   #f1e6df;   --tone-brand-fg:   #a9573d;
--tone-success-bg: #e9eee4;   --tone-success-fg: #5f6f53;
--tone-info-bg:    #e7eef2;   --tone-info-fg:    #526b7b;
--tone-warning-bg: #f4eddd;   --tone-warning-fg: #8c6a34;
--tone-danger-bg:  #f1dcd4;   --tone-danger-fg:  #a9573d;
--tone-success-dot: #7f8f72;
--tone-warning-dot: #b58a4a;
--tone-info-dot:    #6f8a9c;
```

Expose them through `@theme inline` (`--color-tone-*`) so utilities such as `bg-tone-success-bg` and `text-tone-danger-fg` work.

`app/layout.tsx` becomes light-only:

```ts
export const viewport: Viewport = {
  colorScheme: 'light',
  viewportFit: 'cover',
  themeColor: '#f7f6f2',
};
```

### 3.2 Shared primitives

New files under `components/ui/`:

- **`badge.tsx`** — `Badge` with `tone` variants (`neutral`, `brand`, `success`, `info`, `warning`, `danger`) built with `cva`. Replaces the ad-hoc pill classes in billable rows, invoice status, furniture status, and type labels.
- **`form-field.tsx`** — `TextField`, `TextAreaField`, `SelectField`. One label/control/hint/error implementation with a prefix slot. Replaces the six duplicated field implementations.
- **`sheet.tsx`** — `Sheet` shell with overlay, card panel, eyebrow/title, close button, focus-on-open, Escape handling, backdrop click, safe-area padding, and `max-h-sheet`. Used by `FurnitureSheet` and `EditBillableItemSheet`.
- **`alert.tsx`** — inline alert with `error` / `success` / `info` tones. Replaces repeated error banners.
- **`toast.tsx`** — `useNotice` hook and `Toast` presentational component. Replaces the duplicated notice state/timeout/UI in `ProjectSummary` and `FurnitureBoard`.
- **`segmented-tabs.tsx`** — accessible segmented control with arrow/Home/End keyboard handling, optional icon and badge count. Used by the project Pending/Invoices tabs and the invoice Preview/Items mobile tabs.
- **`confirm-dialog.tsx`** — controlled confirmation dialog matching the sheet aesthetic. Replaces `window.confirm` in furniture delete, invoice mark-sent, and invoice mark-paid.

### 3.3 Button consolidation

`components/ui/button.tsx`:

- Remove every `dark:*` utility.
- Use token colours only.
- Make the default variant the Maison brand (`bg-primary text-primary-foreground hover:bg-primary-hover`) so callers stop passing `bg-[#bd765b] text-white`.
- Add `success` variant for the invoice “Mark paid” action.
- Standardise radius (`rounded-xl`) and default height (`h-10`) so callers stop overriding height/radius per use.
- Keep `outline`, `secondary`, `ghost`, `destructive`, `link`, and the existing sizes; update sizes so `lg` is `h-11`.

Then apply:

- Header “New project” becomes a `Button`.
- All brand links (`New invoice`, `Create invoice`, `Log work`, `Generate invoice`, etc.) use `buttonVariants()` without hard-coded colour overrides.
- Form submit buttons drop `bg-[#bd765b] text-white rounded-xl`.

### 3.4 Status colour consolidation

- `InvoiceStatusBadge` maps Issued → neutral, Sent → info, Paid → success, Overdue → danger, and renders `Badge`.
- `furniture-status.ts` keeps its icon/order metadata but gains a `tone` and `dot` token reference. Board columns, mobile selectors, and the furniture sheet all use `Badge` + tone tokens.
- `ProjectItemsGridInner` uses `Badge` for the Type and Status cells; the hard-coded `STATUS_STYLES` map is deleted.
- Project avatar, paid chip, progress bar, and type pills all use the same tone tokens.

### 3.5 AG Grid theme

`ProjectItemsGridInner` currently hard-codes the palette in `themeQuartz.withParams`. Replace those literals with values read from the CSS theme at runtime (the grid is already client-only via `next/dynamic` with `ssr: false`):

```ts
function themeColor(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}
```

The grid then uses `--card`, `--background`, `--foreground`, `--border`, `--muted`, `--accent`, `--primary`, and `--muted-foreground`, so it cannot drift from the rest of the app. Fallbacks remain for safety.

### 3.6 Feature component sweep

Every component that currently contains raw hex values is updated to tokens or shared primitives:

- `components/layout/AppShell.tsx`, `AppHeader.tsx`
- `components/features/projects/ProjectsListClient.tsx`, `ProjectList.tsx`, `ProjectOnboard.tsx`, `ProjectSummary.tsx`, `ProjectLog.tsx`, `ProjectItemsGrid.tsx`, `ProjectItemsGridInner.tsx`
- `components/features/projects/forms/*.tsx`
- `components/features/furniture/FurnitureBoard.tsx`, `FurnitureSheet.tsx`, `furniture-status.ts`
- `components/features/invoices/InvoiceIndex.tsx`, `InvoiceWorkspace.tsx`, `InvoicePreview.tsx`, `InvoiceDetail.tsx`, `InvoiceItemSidebar.tsx`, `InvoicesGrid.tsx`, `InvoiceStatusBadge.tsx`, `EditBillableItemSheet.tsx`
- `app/projects/[id]/invoices/new/page.tsx` (History link)

The only raw colour literals left in the app should be in `app/globals.css` (the theme definition) and the AG Grid fallbacks in `ProjectItemsGridInner.tsx`.

## 4. Alternatives considered

1. **Remove only the dark media query, keep the hard-coded hex palette.**
   Rejected. It would stop the immediate dark-mode breakage, but token-based components would still use the shadcn neutral palette (`#737373`, `#e5e5e5`, etc.) while feature components use the warm palette. The duplication and drift would remain.

2. **Keep dark mode and add dark variants to every component.**
   Rejected. The request is explicitly to purge additional theming for now. Maintaining two palettes doubles the styling surface for no current requirement.

3. **Adopt `next-themes` with an explicit light/dark toggle.**
   Rejected. Adds infrastructure and a user-facing theme control that is not wanted. `color-scheme: light` is simpler and matches the brief.

4. **Replace the warm Maison palette with the stock neutral shadcn base.**
   Rejected. The warm palette is the app's identity; the problem is inconsistency, not the palette itself. The base theme should be the Maison single light theme.

5. **Keep raw hex values but centralise them in a TS constant.**
   Rejected as the primary approach. Tailwind utilities need static class names, so a TS map cannot drive arbitrary classes cleanly. CSS variables plus `@theme inline` are the idiomatic Tailwind v4 solution and keep a single source of truth.

## 5. Files/modules affected

**Theme and layout**

- `app/globals.css`
- `app/layout.tsx`

**UI primitives**

- `components/ui/button.tsx` (edit)
- `components/ui/badge.tsx` (new)
- `components/ui/form-field.tsx` (new)
- `components/ui/sheet.tsx` (new)
- `components/ui/alert.tsx` (new)
- `components/ui/toast.tsx` (new)
- `components/ui/segmented-tabs.tsx` (new)
- `components/ui/confirm-dialog.tsx` (new)

**Layout**

- `components/layout/AppShell.tsx`
- `components/layout/AppHeader.tsx`

**Projects**

- `components/features/projects/ProjectsListClient.tsx`
- `components/features/projects/ProjectList.tsx`
- `components/features/projects/ProjectOnboard.tsx`
- `components/features/projects/ProjectSummary.tsx`
- `components/features/projects/ProjectLog.tsx`
- `components/features/projects/ProjectItemsGrid.tsx`
- `components/features/projects/ProjectItemsGridInner.tsx`
- `components/features/projects/forms/AddFurnitureForm.tsx`
- `components/features/projects/forms/CustomChargeForm.tsx`
- `components/features/projects/forms/LogHoursForm.tsx`

**Furniture**

- `components/features/furniture/FurnitureBoard.tsx`
- `components/features/furniture/FurnitureSheet.tsx`
- `components/features/furniture/furniture-status.ts`

**Invoices**

- `components/features/invoices/EditBillableItemSheet.tsx`
- `components/features/invoices/InvoiceDetail.tsx`
- `components/features/invoices/InvoiceIndex.tsx`
- `components/features/invoices/InvoiceItemSidebar.tsx`
- `components/features/invoices/InvoiceMobileTabs.tsx` (removed; both project and invoice tabs now use `segmented-tabs.tsx`)
- `components/features/invoices/InvoicePreview.tsx`
- `components/features/invoices/InvoicesGrid.tsx`
- `components/features/invoices/InvoiceStatusBadge.tsx`
- `components/features/invoices/InvoiceWorkspace.tsx`
- `app/projects/[id]/invoices/new/page.tsx`

## 6. Acceptance criteria

- `grep` finds no `.dark`, `prefers-color-scheme`, `ThemeProvider`, `useTheme`, or `dark:` in `app/` or `components/`.
- `app/layout.tsx` declares `colorScheme: 'light'` and a single light `themeColor`.
- Switching the OS to dark mode produces the same light UI (verified by grep and a forced-dark screenshot).
- All forms use `TextField` / `TextAreaField` / `SelectField`; no duplicated field markup remains.
- All badges/status pills use `Badge` + tone tokens.
- Both dialogs use `Sheet`; delete/mark-sent/mark-paid use `ConfirmDialog`.
- All buttons use `Button` or `buttonVariants()`, with no per-call `bg-[#bd765b] text-white` overrides.
- Raw hex values exist only in `app/globals.css` and the AG Grid fallbacks.
- `npx tsc --noEmit` passes.
- `pnpm build` passes.
- Manual screenshot review at 1440×900 and 390×844 for `/projects`, project detail, board, log, invoice index, composer, and invoice detail shows no mixed surfaces, unreadable text, or broken layout.
- Viewport-first scroll behaviour documented in `AGENTS.md` remains intact (only the designated panel scrolls).

### Verification performed

- `npx tsc --noEmit` — passed.
- `pnpm build` — passed.
- `grep` for `#hex`, `dark:`, `prefers-color-scheme`, and `.dark` — only the single `themeColor` in `app/layout.tsx` and the AG Grid fallbacks remain.
- Headless Chrome at 1440×900 and 390×844 for `/projects`, project detail, log, board, invoice index, composer, and invoice detail:
  - `getComputedStyle(body)` = `rgb(247, 246, 242)` on every route.
  - `getComputedStyle(documentElement).colorScheme` = `light` on every route.
  - `scrollWidth === innerWidth` on every route (no horizontal overflow).
  - No client exceptions or console errors other than the pre-existing missing `favicon.ico` 404.
- Interaction checks with temporary QA records (created and then deleted):
  - Project Pending/Invoices segmented tabs switch and preserve counts.
  - AG Grid row “Open” launches the shared edit sheet.
  - Invoice composer checkbox toggle updates the preview and total.
  - Invoice “Mark sent”/“Mark paid” open `ConfirmDialog`; cancel leaves the invoice unchanged.
  - Furniture board opens the shared sheet; delete opens `ConfirmDialog`; cancel returns to the sheet.
  - Project edit form uses the shared `TextField` controls.

## 7. Risks and open questions

- **Exact shades shift slightly.** `#99998e` folds into `--muted-foreground` and `#f1efe8` folds into `--muted`. This is intentional consolidation; the overall look should be the same, and more consistent.
- **Button default size changes from `h-8` to `h-10`.** Most call sites already override to `h-10`/`h-11`; this makes the default match. All affected screens need a screenshot check.
- **AG Grid reading CSS variables at runtime.** If `getComputedStyle` returns an empty value, the fallback palette is used. The grid is dynamically imported with `ssr: false`, so `document` is available when the theme is built.
- **Confirmation dialogs add state and focus management.** Keep the same destructive actions and pending states; verify keyboard Escape/Enter and that mutations still fire exactly once.
- **Removing unused chart/sidebar tokens.** No current component references them. If a future shadcn block is added, it will need those tokens reintroduced.
- **No automated visual regression suite exists.** Verification is typecheck, production build, grep for forbidden theme tokens, and manual screenshots with headless Chrome.
