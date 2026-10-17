# Plans

Execution plans keep multi-step work resumable across sessions and agents. They live in [exec-plans/active/](exec-plans/active/) and move to [exec-plans/completed/](exec-plans/completed/) unchanged in filename once finished.

## When a plan is required

Required:

- Work spanning more than one session, or likely to be handed off.
- Changes crossing a boundary: data model, persistence, auth, routing, or an external integration.
- Anything that settles an open architecture question or product assumption. Record the outcome in [decisions.md](decisions.md).
- Risky or hard-to-reverse work: dependency upgrades, build configuration, deletions.
- Work where acceptance should be agreed before implementation starts.

Not required: small, clear, self-contained changes — a copy fix, a single component tweak, a dependency bump with a green `pnpm verify`. Do not create a plan to record work already finished.

## Naming

`docs/exec-plans/active/YYYY-MM-DD-short-name.md`, dated the day the plan is created, kebab-case. Keep the same filename when moving to `completed/`.

## Template

```markdown
# Change title

Status: Active
Owner: person or current agent
Created: YYYY-MM-DD

## Goal and acceptance criteria
Observable success, scope and non-goals; identify unreviewed proposals.

## Context
Baseline, affected paths, constraints, dependencies, optional spec link.

## Steps and progress
- [ ] Establish baseline and resolve material decisions.
- [ ] Implement the smallest coherent change.
- [ ] Verify acceptance and update affected docs.

## Decisions and discoveries
Dated decisions with evidence and reasons; deviations. Separate requirements from proposals.

## Verification
Actual commands, scenarios, and results; blockers and outstanding checks.

## Handoff or outcome
Next concrete action while active; final behavior and gaps when complete.
```

## Keeping a plan honest

- Update it after each material step or decision, and always before handoff — not only at the end.
- Record **actual** command output under Verification. Planned checks are not results.
- Keep three things visually distinct: what the owner required, what was decided and why, and what an agent is merely proposing.
- Leave the next concrete action written down, so the next session can start without re-deriving context.

## Completion

A plan moves to `completed/` only when **every** acceptance criterion has passed, with evidence in its Verification section. Before moving it:

1. Update the status line to `Complete` and fill in the outcome, including known gaps.
2. Update any document the change invalidated.
3. Repair links that pointed at the old `active/` path, and run `pnpm check:docs`.
4. Record anything deliberately left undone in [exec-plans/tech-debt-tracker.md](exec-plans/tech-debt-tracker.md).

Unmet acceptance means the plan stays active, however much was completed. Completed plans are historical records — they never override current documentation.

## Change specs

For work where the *behavior itself* is unresolved, write a spec alongside the plan. See [changes/README.md](changes/README.md).
