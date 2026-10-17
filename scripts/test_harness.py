"""Run after copying the automation assets into the target's scripts directory."""

import json
import tempfile
import unittest
from pathlib import Path

import check_harness
import pinned_node


class HarnessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="harness-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / "scripts").mkdir()
        (self.root / "plans/active").mkdir(parents=True)
        self.config = {
            "agents": "AGENTS.md", "maxAgentLines": 100,
            "activePlans": "plans/active", "required": ["AGENTS.md", "plans/active"],
            "markdownRoots": ["AGENTS.md"],
        }
        self.save_config()
        self.agent = self.root / "AGENTS.md"
        self.agent.write_text("# Fixture\n[Plans](plans/active/)\n", encoding="utf-8")

    def save_config(self):
        (self.root / "scripts/harness.json").write_text(json.dumps(self.config), encoding="utf-8")

    def test_valid_custom_paths_and_code_examples(self):
        self.agent.write_text("[Plans](plans/active/)\n```md\n[Ignored](missing)\n```\n`[Ignored](missing)`\n", encoding="utf-8")
        self.assertEqual(check_harness.check(self.root), [])

    def test_missing_path_broken_links_and_long_entrypoint(self):
        (self.root / "plans/active").rmdir()
        self.agent.write_text("[Broken](missing.md)\n" + "line\n" * 100, encoding="utf-8")
        errors = check_harness.check(self.root)
        self.assertTrue(any("Missing harness path" in e for e in errors))
        self.assertTrue(any("broken local link" in e for e in errors))
        self.assertTrue(any("exceeds" in e for e in errors))

    def test_reference_encoded_and_angle_links(self):
        (self.root / "a b.md").touch()
        self.agent.write_text("[a](<a b.md>)\n[b](a%20b.md#title)\n[ref]: missing.md\n[web](https://example.org)\n", encoding="utf-8")
        self.assertEqual(len(check_harness.check(self.root)), 1)

    def test_escape_and_invalid_config_fail(self):
        self.config["markdownRoots"] = ["../outside"]
        self.save_config()
        self.assertTrue(check_harness.check(self.root))
        self.config["markdownRoots"] = ["AGENTS.md"]
        self.config["maxAgentLines"] = "100"
        self.save_config()
        self.assertTrue(check_harness.check(self.root))

    def test_symlink_directory_not_traversed(self):
        (self.root / "linked").symlink_to(self.root, target_is_directory=True)
        self.config["markdownRoots"] = ["."]
        self.save_config()
        self.assertEqual(check_harness.check(self.root), [])

    def test_forbidden_paths_fail_including_symlinks(self):
        self.config["forbidden"] = ["CLAUDE.md", "CLAUDE.local.md"]
        self.save_config()
        self.assertEqual(check_harness.check(self.root), [])
        (self.root / "CLAUDE.md").write_text("# Pointer\n", encoding="utf-8")
        (self.root / "CLAUDE.local.md").symlink_to(self.root / "missing.md")  # dangling
        errors = check_harness.check(self.root)
        self.assertEqual(sum("Forbidden harness path present" in e for e in errors), 2)

    def test_forbidden_must_be_a_list_inside_the_repository(self):
        self.config["forbidden"] = "CLAUDE.md"
        self.save_config()
        self.assertTrue(check_harness.check(self.root))
        self.config["forbidden"] = ["../CLAUDE.md"]
        self.save_config()
        self.assertTrue(check_harness.check(self.root))


class PinnedNodeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="pinned-node-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.env = {"NVM_DIR": str(self.root / "nvm")}
        self.bins = {version: self.install(version) for version in ("18.17.1", "24.9.0", "24.16.0")}

    def install(self, version):
        node = self.root / "nvm/versions/node" / ("v" + version) / "bin/node"
        node.parent.mkdir(parents=True)
        node.touch()
        node.chmod(0o755)
        return node.parent

    def pin(self, text):
        (self.root / ".nvmrc").write_text(text, encoding="utf-8")
        return pinned_node.pinned_node_bin(self.root, self.env)

    def test_exact_and_prefix_pins_resolve_to_installed_bin(self):
        self.assertEqual(self.pin("24.16.0\n"), self.bins["24.16.0"])
        self.assertEqual(self.pin("v24.16.0"), self.bins["24.16.0"])
        self.assertEqual(self.pin("24"), self.bins["24.16.0"])  # numeric, not lexical, order
        self.assertEqual(self.pin("24.9"), self.bins["24.9.0"])

    def test_non_executable_node_falls_back_to_next_match(self):
        (self.bins["24.16.0"] / "node").chmod(0o644)
        self.assertEqual(self.pin("24"), self.bins["24.9.0"])

    def test_missing_unsupported_or_uninstalled_pins_return_none(self):
        self.assertIsNone(pinned_node.pinned_node_bin(self.root, self.env))  # no .nvmrc
        for text in ("lts/*", "node", "", "22.0.0", "2", "24.1"):
            self.assertIsNone(self.pin(text), text)
        self.pin("24.16.0")
        self.assertIsNone(pinned_node.pinned_node_bin(self.root, {"NVM_DIR": str(self.root / "absent")}))


if __name__ == "__main__":
    unittest.main()
