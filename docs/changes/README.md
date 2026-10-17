# Change specs

An optional companion to a plan, for work where the required behavior is genuinely unresolved. A plan answers "how will this be done"; a spec answers "what should happen, exactly".

## When to write one

Write a spec when a plan would otherwise encode guesses: competing interpretations of a requirement, a compatibility question, an unclear boundary between this system and another, or a decision the owner has to make. Skip it when the behavior is already agreed — most changes need only a plan.

## Naming

`docs/changes/YYYY-MM-DD-short-name.md`, matching its plan's filename where one exists.

## Template

```markdown
# Behavior title

Status: Draft | Ready | Complete
Plan: ../exec-plans/active/YYYY-MM-DD-short-name.md
Created: YYYY-MM-DD

## Problem
What is wrong or missing, and who it affects.

## Explicit requirements
Stated by the owner. Quote or cite them.

## Proposals and open decisions
Agent-proposed options with tradeoffs, each marked unreviewed until confirmed.

## Observable behavior
What a user or caller can see, including error and edge cases.

## Compatibility and non-goals
What must keep working; what this explicitly does not cover.

## Acceptance scenarios
Given / when / then, concrete enough to verify.
```

## Lifecycle

- **Draft** — open decisions remain. Implementation should not start.
- **Ready** — every consequential decision is resolved and the acceptance scenarios are agreed.
- **Complete** — the behavior shipped and was verified. Repair the plan link to its `completed/` path and run `pnpm check:docs`.

A spec records intended behavior at a point in time. Where it disagrees with [PRODUCT.md](../PRODUCT.md) or [../ARCHITECTURE.md](../../ARCHITECTURE.md) after shipping, those documents win — update them instead of leaving the contradiction.
