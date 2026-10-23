# Phase 1 — Native app shell

**Status:** Implemented in `native-app-shell` (pending review)

**Date:** 2026-10-22

**Roadmap:** [Product roadmap](./2026-10-21-product-roadmap.md) — Phase 1

## 1. Problem

Every route currently owns its own `min-h-screen` wrapper and header:

- `app/projects/page.tsx`
- `app/projects/[id]/page.tsx`
- `app/projects/[id]/board/page.tsx`
- `app/projects/[id]/log/page.tsx`
- `components/features/projects/ProjectView.tsx`

The document itself scrolls. On mobile that means the URL bar collapses, the whole page bounces, headers scroll away, and sheets/grids compete with a nested scroll area. It does not feel like a native app.

The goal of this phase is one app shell, one scroll region, and one header system. No new product features; the app must look and behave as it does today, minus document-level scrolling.

## 2. Approach

### 2.1 Root layout owns the viewport

- `app/layout.tsx` renders `<html className="h-full">` and a body that is a full-height flex column with `overflow-hidden`.
- Add `viewportFit: 'cover'` to the Next.js `viewport` export so safe-area environment variables report real insets. Keep default zoom (do not set `maximumScale` or `userScalable`).
- `app/globals.css` sets `html, body { height: 100% }` and `overscroll-behavior: none` on both, so rubber-band scrolling cannot move the document.

### 2.2 Shared shell components

New `components/layout/AppShell.tsx`:

- Root `flex min-h-0 flex-1 flex-col` container with the app background/foreground colours.
- `header` slot rendered outside the scroll container (it therefore stays fixed without `position: fixed`).
- Exactly one scroll region: `<main data-app-scroll className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">`.
  - `relative` is intentional: absolutely positioned descendants (for example the grid’s `sr-only` search label) would otherwise use the initial containing block as their containing block and contribute to document scroll height even though they are visually clipped.
- Centred content wrapper (`max-w-[1380px]`, page padding, bottom safe-area padding).
- `data-app-scroll` is the hook for future scroll restoration / scroll-to-top work.

New `components/layout/AppHeader.tsx`:

- Optional brand link (`Maison`).
- Optional back link (href + label) with an arrow icon.
- Optional page title, and an optional right-side context string. When a title is present the context is omitted so the header does not repeat the project name.
- Optional `actions` slot (e.g. “New project”).
- Top safe-area padding so the header clears the notch.
- Context is hidden below `sm` to keep the back link and title readable at 375 px.

New `components/layout/ProjectShell.tsx`:

- Small wrapper around `AppShell` + `AppHeader` for project routes.
- Takes the project’s `id`, `client`, and `project`, a back link, and an optional title; renders the default context `client — project` when there is no title (board/log) and omits it when the title carries the project name (detail).
- Used by `/projects/[id]`, `/projects/[id]/board`, and `/projects/[id]/log`, and ready for the Phase 3 invoice routes.

`app/projects` uses `AppShell` + `AppHeader` directly (there is no project context on the list page).

### 2.3 Remove page-level wrappers

- Rewrite the four route pages to render their content inside the shell.
- Remove the `min-h-screen` wrapper from `ProjectView`; it becomes a plain view switcher.
- Remove the nested `<main>` and page padding from `ProjectsListClient`, since `AppShell` now owns the page content wrapper.
- Keep loading/error states inside the scroll region.

### 2.4 Sheets and dialogs

Replace `90vh`/`88dvh` maximum heights with a `max-h-sheet` class in `app/globals.css`:

```css
.max-h-sheet {
  max-height: calc(100vh - 2rem);
}

@supports (height: 100dvh) {
  .max-h-sheet {
    max-height: calc(100dvh - 2rem);
  }
}
```

The `vh` declaration is the fallback; browsers that support `dvh` use the dynamic viewport. Add bottom safe-area padding to the sheet contents:

- `components/features/furniture/FurnitureSheet.tsx`
- `components/features/projects/ProjectSummary.tsx` (furniture quick-view modal)
- `components/features/projects/ProjectStatus.tsx` (furniture view/edit modals)

This keeps the focused input visible when the mobile keyboard is open. `ProjectSummary` and `ProjectStatus` are scheduled for simplification/removal in Phase 4, but they must not regress in this phase.

## 3. Alternatives considered

- **Give every page its own `h-screen overflow-auto` wrapper.** Rejected: it duplicates the same layout rules in every route, allows headers to drift, and invites nested scroll traps. The shell should be defined once.
- **Put `position: fixed` on the body and scroll each page internally.** Rejected: it breaks mobile keyboard resize behaviour and makes focus/scroll restoration harder. A single flex scroll region is simpler and lets the browser handle focused inputs.
- **Hide the scrollbar with CSS only.** Rejected: it does not stop document scrolling, URL-bar collapse, or overscroll bounce; it only hides the symptom.
- **Use a CSS grid shell (`grid-rows-[auto_1fr]`) instead of flex.** Workable, but the existing layout is vertical flex throughout, and `min-h-0` + `flex-1` is the smaller, more familiar change.

## 4. Files/modules affected

- `app/layout.tsx`
- `app/globals.css`
- New: `components/layout/AppShell.tsx`
- New: `components/layout/AppHeader.tsx`
- New: `components/layout/ProjectShell.tsx`
- `app/projects/page.tsx`
- `app/projects/[id]/page.tsx`
- `app/projects/[id]/board/page.tsx`
- `app/projects/[id]/log/page.tsx`
- `components/features/projects/ProjectsListClient.tsx`
- `components/features/projects/ProjectView.tsx`
- `components/features/furniture/FurnitureSheet.tsx`
- `components/features/projects/ProjectSummary.tsx`
- `components/features/projects/ProjectStatus.tsx`

No data-layer, API, or dependency changes.

## 5. Acceptance criteria

- The document/body does not scroll on `/projects` or any project route; only the shell’s `<main>` scrolls.
- Headers stay fixed while content scrolls and are not inside the scroll container.
- At 375 px the header shows the back link and project title without overflow; content clears the home indicator via safe-area padding.
- Focusing an input in the log form or opening a furniture sheet keeps the field/input above the mobile keyboard.
- Every existing route renders and navigates correctly: list, detail, log, board.
- The “New project” action and project onboarding flow still work.
- AG Grid remains bounded inside the scroll region and does not introduce a second page-level scrollbar.
- `npx tsc --noEmit` passes.
- `pnpm build` passes.
- Manual smoke test at 375 px and desktop widths.

## 6. Risks

- **AG Grid vs. shell scroll:** the grid keeps its own bounded height and internal scroll. The shell handles page scroll. Verify a long pending list does not create nested page scrollbars.
- **iOS `100dvh`:** behaviour varies with the keyboard open. The shell relies on `height: 100%`; sheets use `100dvh`. Test with the keyboard open at 375 px.
- **Safe areas:** `viewportFit: 'cover'` is required for `env(safe-area-inset-*)` to be non-zero. Without it the padding is harmless but the notch/home indicator may overlap content.
- **Scroll restoration:** now that `<main>` scrolls, route changes do not automatically reset it. This phase exposes `data-app-scroll`; restoration/scroll-to-top is deferred until the invoice routes exist.
- **Not-found routes:** Next’s default not-found page is rendered by the root layout without the shell. It is not part of the current routes and is left unchanged.

## 7. Verification

1. `npx tsc --noEmit`
2. `pnpm build`
3. Manual smoke test at 375 px and desktop:
   - `/projects` scrolls only inside `<main>`; header stays put.
   - Project detail, board, and log share the same header behaviour.
   - Open a furniture sheet, focus the search field and log-form inputs.
   - Confirm `document.documentElement.scrollHeight === clientHeight` and the `<main data-app-scroll>` is the scrolling element.
4. `git diff main...HEAD` review before merge.

## 8. Open questions

- Scroll-to-top on route change: should it be added now or with the invoice routes? This plan defers it; `data-app-scroll` makes it a small follow-up.
- Should the theme colour match `#f7f6f2` instead of white/black? Left unchanged to keep this phase layout-only.
