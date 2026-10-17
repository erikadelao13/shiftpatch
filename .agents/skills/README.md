# Skills

Reusable procedures for this repository. **This directory is canonical** — edit the files here. General policy lives in [AGENTS.md](../../AGENTS.md); a skill captures a *procedure*, and must never be the only place a requirement is written down.

The procedures are plain Markdown and readable by any agent or person. Tools that discover skills automatically get a pointer rather than a copy.

| Skill | Trigger | Path |
| --- | --- | --- |
| `harness-maintenance` | Instructions, doc maps, commands, or plan statuses have drifted from reality — or an audit of the harness is requested. Not for ordinary code edits. | [harness-maintenance/SKILL.md](harness-maintenance/SKILL.md) |
| `verification-handoff` | A change needs validating, finishing, or handing off with evidence; or verification gaps need reporting. | [verification-handoff/SKILL.md](verification-handoff/SKILL.md) |
| `contextual-commits` | Pending work needs organizing into coherent, verified Conventional Commits grouped by context — including splitting one file across commits. | [contextual-commits/SKILL.md](contextual-commits/SKILL.md) |

## Tool discovery

Claude Code looks for `.claude/skills/<name>/SKILL.md` and does not read anything under `.agents/`. Each skill is therefore surfaced by a per-skill symlink, which its documentation explicitly supports:

```text
.claude/skills/harness-maintenance   -> ../../.agents/skills/harness-maintenance
.claude/skills/verification-handoff  -> ../../.agents/skills/verification-handoff
.claude/skills/contextual-commits    -> ../../.agents/skills/contextual-commits
```

There is one copy of each procedure. Never edit through the link, and add a matching link when you add a skill. A tool without skill discovery can read these files directly — they are routed from [the docs index](../../docs/README.md).

## Adding a skill

Add one only when a **specific, repeated** procedure has demonstrated its value — isolated migration verification, a native smoke review, a release checklist. Do not add a skill for general coding advice, and do not pre-install procedures for tools this project does not use.

Each skill is a directory containing `SKILL.md` with YAML frontmatter:

```markdown
---
name: kebab-case-name
description: What it does and when to use it. The trigger must be precise — a vague description makes it fire on unrelated work.
---
```

Keep the body short and imperative, point at the canonical document rather than restating it, and add the new row to the table above. Create the `.claude/skills/<name>` symlink so Claude Code finds it. Run `pnpm check:docs` afterward so the links are verified.
