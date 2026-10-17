<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# shiftpatch — agent instructions

Next.js 16 App Router app, pnpm, TypeScript strict, Tailwind v4. Product, Architecture and Design hold real content; read the relevant one before changing behavior. Some of it is still marked proposal.

## Documentation map

| Need | Read |
| --- | --- |
| Purpose, users, scope | [docs/PRODUCT.md](docs/PRODUCT.md) |
| Boundaries, data, dependencies | [ARCHITECTURE.md](ARCHITECTURE.md) |
| UI hierarchy, tokens, states | [docs/DESIGN.md](docs/DESIGN.md) |
| Which checks to run | [docs/VERIFICATION.md](docs/VERIFICATION.md) |
| Plan lifecycle and template | [docs/PLANS.md](docs/PLANS.md) |
| Hook behavior, tool adapters | [docs/HOOKS.md](docs/HOOKS.md) |
| Known gaps | [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md) |
| Reusable procedures | [.agents/skills/README.md](.agents/skills/README.md) |

Index: [docs/README.md](docs/README.md).

## Working agreements

- Inspect affected code, callers, tests, docs, and in-flight changes before editing. Preserve unrelated work.
- Read Product before behavior work, Architecture before boundary/interface/persistence changes, Design before UI edits. Investigate disagreements between code, tests, and docs instead of silently picking one.
- Product, Architecture, and Design may be updated by agents as part of normal work — keep them current rather than letting them drift. Mark anything unconfirmed as a proposal, not a requirement.
- Do not invent product rules, users, entities, or integrations. Unknowns stay visibly unknown.
- Use **pnpm** (`packageManager` pins pnpm 10.27.0). Commit `pnpm-lock.yaml` with dependency changes. Never edit `.next/`, `node_modules/`, or `next-env.d.ts`.
- This Next.js release has `cacheComponents` and `partialPrefetching` enabled; confirm caching and data-fetching APIs against `node_modules/next/dist/docs/` before use.
- Validate external input at trust boundaries and verify both sides of a changed interface.

## Agent tooling

This harness is tool-neutral by design: the documents, `pnpm` commands, and Git hooks work for any agent, any model, and a human with no AI tooling. **Claude Code is the only agent tool with an adapter** (`.claude/settings.json` plus `scripts/claude_hooks.py`); nothing in the core depends on it, and it is not required to run any check.

- **Do not add a `CLAUDE.md`.** Claude Code reads this `AGENTS.md` only while no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` exists in the working directory or above it. Adding one silently replaces this file as the project's instructions, so `pnpm check:docs` fails while any of them exists here. Put project instructions here instead.
- Skills are canonical in [.agents/skills/](.agents/skills/) and surfaced to Claude Code through per-skill symlinks in `.claude/skills/`. Edit the canonical copy; never the link.
- Adding another tool means another small adapter alongside the Claude Code one — never a second copy of the policy in this file.

## Plans

Resume a relevant plan in [docs/exec-plans/active/](docs/exec-plans/active/) before creating another. Small, clear changes may proceed directly. Complex, risky, cross-boundary, or multi-session work needs a saved plan with acceptance criteria agreed before implementation. Update the plan after material steps and before handoff; move it to `completed/` only once every acceptance criterion passes. See [docs/PLANS.md](docs/PLANS.md).

## Verification

Run the checks [docs/VERIFICATION.md](docs/VERIFICATION.md) prescribes for the kind of change you made, and report actual command output. Unexecuted checks have not passed.

- Fast: `pnpm check:docs` + `pnpm lint` + `pnpm typecheck`
- Full: `pnpm verify` (adds `pnpm build`, `pnpm test` and `pnpm test:e2e`)

Hooks supplement these checks; they do not replace them. A passing Stop hook proves documentation structure only, never application behavior.

## Code clarity and comments

- Prefer self-explanatory code: clear names, focused functions, and straightforward control flow.
- Do not add comments or JSDoc by default. TypeScript types should describe inputs and outputs.
- Avoid comments that restate the code, label obvious sections, narrate implementation steps, or describe routine changes.
- Add a short comment only when it explains a non-obvious reason, constraint, security decision, or compatibility requirement.
- Before adding a comment, consider whether renaming or simplifying the code would make it unnecessary.
- When editing existing code, remove redundant or outdated comments in the affected area. Preserve useful rationale and required license or generated directives.