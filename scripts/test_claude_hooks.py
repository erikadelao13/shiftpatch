"""Tests for the Claude Code adapter. Core checks do not depend on this file.

These establish helper behavior only. They do not establish that a live
Claude Code session loaded, trusted, or executed the hook.
"""

import contextlib
import io
import json
import shlex
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import claude_hooks


class ClaudeHookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="claude-hook-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / "scripts").mkdir()
        (self.root / "plans/active").mkdir(parents=True)
        config = {
            "agents": "AGENTS.md", "maxAgentLines": 100,
            "activePlans": "plans/active", "required": ["AGENTS.md", "plans/active"],
            "markdownRoots": ["AGENTS.md"],
        }
        (self.root / "scripts/harness.json").write_text(json.dumps(config), encoding="utf-8")
        (self.root / "AGENTS.md").write_text("# Fixture\n", encoding="utf-8")
        self.addCleanup(self._clear_guards)

    def _clear_guards(self):
        for session in ("s1", "s2", "no-session"):
            claude_hooks.guard_path(self.root, session).unlink(missing_ok=True)

    def test_startup_context_uses_config_and_treats_names_as_data(self):
        (self.root / 'plans/active/odd"name.md').touch()
        result = claude_hooks.response({"hook_event_name": "SessionStart"}, self.root)
        context = result["hookSpecificOutput"]["additionalContext"]
        self.assertEqual(result["hookSpecificOutput"]["hookEventName"], "SessionStart")
        self.assertIn('odd\\"name.md', context)
        self.assertIn("AGENTS.md", context)
        self.assertLessEqual(len(context), 10000)  # Claude Code additionalContext cap
        (self.root / "plans/active").rename(self.root / "plans/moved")
        self.assertIn("systemMessage", claude_hooks.response({"hook_event_name": "SessionStart"}, self.root))

    def install_pinned_node(self):
        node = self.root / "nvm dir/versions/node/v24.16.0/bin/node"  # space exercises quoting
        node.parent.mkdir(parents=True)
        node.touch()
        node.chmod(0o755)
        (self.root / ".nvmrc").write_text("24.16.0\n", encoding="utf-8")
        return node.parent

    def test_startup_pins_node_once_through_claude_env_file(self):
        bin_dir = self.install_pinned_node()
        env_file = self.root / "claude-env.sh"
        payload = {"hook_event_name": "SessionStart"}
        with patch.dict(claude_hooks.os.environ, {"CLAUDE_ENV_FILE": str(env_file), "NVM_DIR": str(self.root / "nvm dir")}):
            first = claude_hooks.response(payload, self.root)
            claude_hooks.response(payload, self.root)  # resume/compact may rerun SessionStart
        self.assertIn("pinned in .nvmrc", first["hookSpecificOutput"]["additionalContext"])
        self.assertEqual(len(env_file.read_text(encoding="utf-8").splitlines()), 1)
        # The line must be valid shell that puts the pinned bin first.
        shell = subprocess.run(
            ["/bin/sh", "-c", f'. {shlex.quote(str(env_file))}; printf %s "$PATH"'],
            capture_output=True, text=True, env={"PATH": "/usr/bin:/bin"}, check=True,
        )
        self.assertEqual(shell.stdout, f"{bin_dir}:/usr/bin:/bin")

    def test_startup_skips_pinning_without_env_file_or_on_write_error(self):
        self.install_pinned_node()
        payload = {"hook_event_name": "SessionStart"}
        with patch.dict(claude_hooks.os.environ, {"NVM_DIR": str(self.root / "nvm dir")}):
            claude_hooks.os.environ.pop("CLAUDE_ENV_FILE", None)
            quiet = claude_hooks.response(payload, self.root)
            claude_hooks.os.environ["CLAUDE_ENV_FILE"] = str(self.root / "plans")  # a directory
            failed = claude_hooks.response(payload, self.root)
        for result in (quiet, failed):
            self.assertNotIn("pinned in .nvmrc", result["hookSpecificOutput"]["additionalContext"])

    def test_stop_passes_silently_and_clears_the_guard(self):
        guard = claude_hooks.guard_path(self.root, "s1")
        guard.touch()
        with patch.object(claude_hooks, "check_docs", return_value=""):
            self.assertEqual(claude_hooks.response({"hook_event_name": "Stop", "session_id": "s1"}, self.root), {})
        self.assertFalse(guard.exists())

    def test_stop_blocks_once_per_session_without_stop_hook_active(self):
        """Claude Code does not document stop_hook_active, so the marker is the real bound."""
        with patch.object(claude_hooks, "check_docs", return_value="broken"):
            payload = {"hook_event_name": "Stop", "session_id": "s1"}
            first = claude_hooks.response(payload, self.root)
            self.assertEqual(first["decision"], "block")
            self.assertIn("broken", first["reason"])
            second = claude_hooks.response(payload, self.root)
            self.assertNotIn("decision", second)
            self.assertIn("systemMessage", second)
            # A different session still gets its own single block.
            other = claude_hooks.response({"hook_event_name": "Stop", "session_id": "s2"}, self.root)
            self.assertEqual(other["decision"], "block")

    def test_stop_honors_stop_hook_active_and_plan_mode(self):
        with patch.object(claude_hooks, "check_docs", return_value="broken"):
            spent = {"hook_event_name": "Stop", "session_id": "s1", "stop_hook_active": True}
            self.assertNotIn("decision", claude_hooks.response(spent, self.root))
            plan = {"hook_event_name": "Stop", "session_id": "s2", "permission_mode": "plan"}
            self.assertNotIn("decision", claude_hooks.response(plan, self.root))

    def test_expired_guard_allows_one_further_block(self):
        guard = claude_hooks.guard_path(self.root, "s1")
        guard.touch()
        stale = time.time() - claude_hooks.GUARD_TTL_SECONDS - 60
        import os
        os.utime(guard, (stale, stale))
        self.assertFalse(claude_hooks.guard_is_set(guard))
        with patch.object(claude_hooks, "check_docs", return_value="broken"):
            payload = {"hook_event_name": "Stop", "session_id": "s1"}
            self.assertEqual(claude_hooks.response(payload, self.root)["decision"], "block")

    def test_guard_errors_never_propagate(self):
        with patch.object(claude_hooks.Path, "stat", side_effect=OSError("nope")):
            self.assertFalse(claude_hooks.guard_is_set(claude_hooks.guard_path(self.root, "s1")))
        with patch.object(claude_hooks.Path, "touch", side_effect=OSError("nope")):
            with patch.object(claude_hooks, "check_docs", return_value="broken"):
                payload = {"hook_event_name": "Stop", "session_id": "s1"}
                self.assertEqual(claude_hooks.response(payload, self.root)["decision"], "block")

    def test_check_runner_failure_and_timeout(self):
        result = subprocess.CompletedProcess([], 1, "", "broken")
        with patch.object(claude_hooks.subprocess, "run", return_value=result):
            self.assertEqual(claude_hooks.check_docs(self.root), "broken")
        with patch.object(claude_hooks.subprocess, "run", side_effect=subprocess.TimeoutExpired("check", 10)):
            self.assertIn("unavailable", claude_hooks.check_docs(self.root))

    def test_malformed_input_and_unknown_event(self):
        self.assertIn("systemMessage", claude_hooks.response([]))
        self.assertEqual(claude_hooks.response({"hook_event_name": "PreToolUse"}, self.root), {})
        output = io.StringIO()
        with patch("sys.stdin", io.StringIO("not JSON")), contextlib.redirect_stdout(output):
            claude_hooks.main()
        self.assertIn("systemMessage", json.loads(output.getvalue()))


if __name__ == "__main__":
    unittest.main()
