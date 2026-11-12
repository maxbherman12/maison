# Seed .env.local into worktrees

**Status:** Approved

## Problem
Worktrees got `.env.local` by a manual copy. Pool slots are reused, so a slot kept whatever copy it got first. Slot 4 had a stale file (an old `INVOICE_DUE_DAYS`, no `IMPERSONATE_USER`). With no Google credentials and no impersonation, Better Auth never registered the Google provider, and sign-in failed with "Provider not found" (404).

## Approach
Commit a `.worktreeinclude` listing `.env.local`. On every `treehouse get`, treehouse copies the main checkout's file into the slot, both fresh and reused, so a worktree always starts with the current env. Update the Worktrees section of `AGENTS.md` to say this and to forbid hand copies: treehouse refuses to overwrite a file it did not seed, and quarantines the slot.

## Alternative considered
**Symlink `.env.local` to the main checkout.** Rejected: it's a manual step for every slot, and a worktree could never differ, for example a different `IMPERSONATE_USER`.

## Files
- `.worktreeinclude` (new)
- `AGENTS.md`

## Verification
Tested with `treehouse get --include-file` on a fresh slot and on a reused slot. Both receive a byte-identical `.env.local`. A reused slot that already holds a hand-copied file gets quarantined.
