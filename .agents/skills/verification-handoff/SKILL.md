---
name: verification-handoff
description: Verify a requested repository change and prepare an evidence-based handoff using the project's verification policy. Use when asked to validate work, finish a change, or report verification gaps.
---

# Verification handoff

Read [AGENTS.md](../../../AGENTS.md), [docs/VERIFICATION.md](../../../docs/VERIFICATION.md), the relevant active plan, and the full diff of the requested change. Inspect the affected code to work out what observable acceptance actually looks like, and which commands or scenarios would cover it. Preserve unrelated work.

Run what the change matrix in `docs/VERIFICATION.md` prescribes — at minimum:

- Docs, plans, skills, or `scripts/harness.json` → `pnpm check:docs`
- `scripts/*.py` → add `python3 -m unittest discover -s scripts -p test_harness.py`
- Source under `src/` → `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Anything user-visible → add `pnpm test:e2e` and a manual look at the affected screen
- Before handoff of application code → `pnpm verify`

Broaden only for failures, new edits, or an unresolved concern. Hooks can supply evidence, but check their scope: `.githooks/` checks inspect the working tree, so they never establish that an exact staged or pushed revision is sound, and a passing Stop hook proves documentation structure only.

Exercise the real boundary when one is involved. `pnpm build` succeeding is not proof that a page is usable; a green e2e spec is not proof that behavior is correct — there is no component- or hook-level testing (see TD-1 in the debt tracker). Say so rather than implying coverage that does not exist.

Record exact commands and results, including skipped runs, zero-test runs, and prerequisite failures such as missing Playwright browsers. Fix failures that are in scope; report pre-existing or external blockers plainly instead of weakening a check to get green.

Update the active plan before handoff with progress and the next concrete action. Complete and archive it only once every acceptance criterion passes — then repair links, re-run `pnpm check:docs`, and record nonblocking follow-ups in `docs/exec-plans/tech-debt-tracker.md`. Unexecuted checks have not passed.
