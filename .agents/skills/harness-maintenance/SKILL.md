---
name: harness-maintenance
description: Audit or repair stale repository instructions, documentation maps, plan workflows, verification commands, and skill references when the harness drifts. Use for harness maintenance requests or demonstrated instruction/check drift, not every code edit.
---

# Harness maintenance

Read [AGENTS.md](../../../AGENTS.md), the documents its map routes to, active plans under `docs/exec-plans/active/`, `package.json`, `scripts/harness.json`, `.githooks/`, `.claude/settings.json`, and this skill catalog. Compare every claim against the actual files and commands. Inspect in-flight changes before editing anything.

Identify concrete drift, and prioritize demonstrated failures over tidiness:

- Links in `scripts/harness.json` or Markdown pointing at paths that no longer exist.
- Commands named in [docs/VERIFICATION.md](../../../docs/VERIFICATION.md) that are missing from `package.json`, or scripts that exist but are undocumented.
- A second document competing with a canonical one, or instructions duplicated between `AGENTS.md` and a doc it links to.
- A plan marked complete with acceptance criteria still unmet, or an active plan whose next action is already done.
- Claims about hooks, CI, or test coverage that the repository does not support.

Repair within scope. Keep `AGENTS.md` under the 100-line limit in `scripts/harness.json` by moving detail into the canonical document, not by deleting it. Agents may update Product, Architecture, and Design directly here, but anything unconfirmed goes in as a labeled proposal — never as a requirement. Keep target architecture visibly separate from what is implemented.

Preserve the generated `nextjs-agent-rules` block at the top of `AGENTS.md`; `next dev` rewrites it, and removing it only produces a recurring dirty tree.

Keep the core tool-neutral. Documents, `pnpm` commands and Git hooks must work with no agent tool installed; per-tool glue stays in its own adapter (currently `.claude/settings.json` and `scripts/claude_hooks.py`). Treat policy duplicated into an adapter, or a core file importing one, as drift. Confirm an adapter's schema against that host's current official documentation before editing it.

Do not add a `CLAUDE.md`: Claude Code reads `AGENTS.md` only while no `CLAUDE.md` exists in the working directory or above it, so adding one silently replaces the entry point.

Preserve hook behavior and configuration. Hook files existing is not the same as a host trusting and running them — check activation separately and report it honestly. Add a deterministic check only where a repeated failure justifies one.

Verify: `pnpm check:docs`, plus `python3 -m unittest discover -s scripts -p "test_harness.py"` whenever core scripts changed, and `-p "test_claude_hooks.py"` whenever the adapter changed. Confirm the core still passes with the adapter absent. Update the relevant active plan with evidence and the next action. Report changed paths, actual check output, and any drift left unresolved.
