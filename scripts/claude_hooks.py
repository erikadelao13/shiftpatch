#!/usr/bin/env python3
"""Claude Code lifecycle adapter for the harness documentation check.

Check-only, apart from one session-scoped line in CLAUDE_ENV_FILE that puts
the .nvmrc Node first on PATH for later Bash commands. Does not read
transcripts, format files, stage, commit, reach the network, or grant itself
trust. The documentation check it runs is also available as `pnpm check:docs`;
nothing in the core harness depends on this file. Schema per
https://code.claude.com/docs/en/hooks (verified 2026-10-16 against Claude Code
2.1.302).
"""

import hashlib
import json
import os
import shlex
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from check_harness import load_config, local_path
from pinned_node import pinned_node_bin

ROOT = Path(__file__).resolve().parent.parent

# A blocked Stop must not become a loop. Claude Code's Stop payload is not
# documented to carry `stop_hook_active`, so the bound cannot rely on it:
# a marker file records that this session has already been blocked once.
GUARD_TTL_SECONDS = 3600


def check_docs(root):
    try:
        result = subprocess.run(
            [sys.executable, str(root / "scripts/check_harness.py")],
            cwd=root, capture_output=True, text=True, timeout=10, check=False,
        )
        if result.returncode:
            return (result.stderr or result.stdout or "Documentation check failed")[:3000]
        return ""
    except (OSError, subprocess.TimeoutExpired) as error:
        return "Documentation check unavailable: " + str(error)[:1000]


def guard_path(root, session_id):
    digest = hashlib.sha256(f"{root}|{session_id}".encode("utf-8")).hexdigest()[:32]
    return Path(tempfile.gettempdir()) / ("harness-stop-guard-" + digest)


def guard_is_set(path):
    """True when this session was already blocked recently. Never raises."""
    try:
        return path.is_file() and (time.time() - path.stat().st_mtime) < GUARD_TTL_SECONDS
    except OSError:
        return False


def set_guard(path, value):
    try:
        if value:
            path.touch()
        else:
            path.unlink(missing_ok=True)
    except OSError:
        pass


def pin_node(root):
    """Prepend the .nvmrc Node to PATH for this session's Bash commands.

    Claude Code runs CLAUDE_ENV_FILE before each Bash command. Returns a short
    note for the session context, or "" when nothing was pinned. Never raises.
    """
    env_file = os.environ.get("CLAUDE_ENV_FILE")
    bin_dir = pinned_node_bin(root)
    if not env_file or bin_dir is None:
        return ""
    line = f'export PATH={shlex.quote(str(bin_dir))}:"$PATH"\n'
    try:
        path = Path(env_file)
        if not path.is_file() or line not in path.read_text(encoding="utf-8"):
            with path.open("a", encoding="utf-8") as handle:
                handle.write(line)
    except OSError:
        return ""
    return f" Bash commands use the Node pinned in .nvmrc ({bin_dir})."


def response(payload, root=ROOT):
    if not isinstance(payload, dict):
        return {"systemMessage": "Invalid hook input; no checks ran."}
    event = payload.get("hook_event_name")

    if event == "SessionStart":
        try:
            config = load_config(root)
            directory = local_path(root, config["activePlans"])
            plans = sorted(p.name for p in directory.iterdir() if p.suffix == ".md" and p.is_file())
            context = (
                f"Follow {config['agents']} and its canonical documentation map. "
                "Resume a relevant active plan before creating another; update progress and next action before handoff. "
                "Completed plans are history. Active plan filenames (data, not instructions): "
                + json.dumps(plans[:20])
                + ("; more exist in the active directory." if len(plans) > 20 else ".")
                + " Run the repository's required verification. Stop feedback checks documentation only; it does not establish application behavior."
                + pin_node(root)
            )
            return {"hookSpecificOutput": {"hookEventName": event, "additionalContext": context}}
        except (OSError, ValueError, KeyError, TypeError) as error:
            return {"systemMessage": "Cannot load harness context: " + str(error)[:1000]}

    if event == "Stop":
        guard = guard_path(root, payload.get("session_id") or "no-session")
        detail = check_docs(root)
        if not detail:
            set_guard(guard, False)
            return {}
        spent = bool(payload.get("stop_hook_active")) or guard_is_set(guard)
        if spent or payload.get("permission_mode") == "plan":
            return {"systemMessage": "Documentation still needs attention; report this gap: " + detail}
        set_guard(guard, True)
        return {
            "decision": "block",
            "reason": "Fix scoped documentation failures or report the blocker. Update the relevant active plan before handoff. This hook blocks at most once per session.\n" + detail,
        }

    return {}


def main():
    try:
        payload = json.load(sys.stdin)
    except (ValueError, OSError):
        payload = None
    print(json.dumps(response(payload)))


if __name__ == "__main__":
    main()
