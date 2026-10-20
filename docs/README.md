# Documentation index

Entry point for agents and contributors: [AGENTS.md](../AGENTS.md).

| Document | Contains | Status |
| --- | --- | --- |
| [PRODUCT.md](PRODUCT.md) | Purpose, users, workflows, scope | Current |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Implemented baseline, frontend code placement (§4), remaining proposals labeled inline | Current |
| [DESIGN.md](DESIGN.md) | Visual direction, tokens, states, accessibility | Current — every role's screens implemented |
| [VERIFICATION.md](VERIFICATION.md) | Commands, what each proves, change matrix, limits | Current |
| [PLANS.md](PLANS.md) | When a plan is required, template, lifecycle | Current |
| [HOOKS.md](HOOKS.md) | Git hooks, the Claude Code adapter, bounds, activation | Current |
| [decisions.md](decisions.md) | Decisions and the reasons for them | Current |
| [changes/README.md](changes/README.md) | Optional change specs for ambiguous behavior | Current |
| [exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md) | Nonblocking gaps and follow-ups | Current |
| [../.agents/skills/README.md](../.agents/skills/README.md) | Reusable procedures and their triggers | Current |

## Workflow

1. Read [AGENTS.md](../AGENTS.md) and the documents its map routes you to for the change at hand.
2. Resume a plan in [exec-plans/active/](exec-plans/active/), or create one when [PLANS.md](PLANS.md) requires it.
3. Implement the smallest coherent change.
4. Run the checks [VERIFICATION.md](VERIFICATION.md) prescribes and report actual output.
5. Update the plan before handoff; archive it only after every acceptance criterion passes.

Plans in [exec-plans/completed/](exec-plans/completed/) are history. They record what was done at the time and do not override the documents above.

## Agent tooling

The core — these documents, the `pnpm` commands, and the Git hooks — requires no agent tool. **Claude Code** is the only tool with an adapter; see [HOOKS.md](HOOKS.md) for what it adds and [../.agents/skills/README.md](../.agents/skills/README.md) for how the procedures are surfaced to it. Do not add a `CLAUDE.md`: it would replace [../AGENTS.md](../AGENTS.md) as the entry point Claude Code reads.

## Document ownership

Agents may update Product, Architecture, and Design directly as part of normal work (chosen 2026-10-16). Anything unconfirmed must be labeled a proposal rather than written in as a requirement.
