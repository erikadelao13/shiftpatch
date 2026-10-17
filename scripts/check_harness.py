#!/usr/bin/env python3
"""Dependency-free path/line/link feedback, configured by scripts/harness.json."""

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit


def local_path(root, value):
    if not isinstance(value, str) or not value or Path(value).is_absolute():
        raise ValueError("Harness paths must be nonempty repository-relative strings")
    path = (root / value).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Harness path escapes repository: " + value)
    return path


def load_config(root):
    config = json.loads((root / "scripts/harness.json").read_text(encoding="utf-8"))
    for key in ("required", "markdownRoots"):
        if not isinstance(config.get(key), list):
            raise ValueError(key + " must be a list")
        for value in config[key]:
            local_path(root, value)
    # Optional: paths that must not exist, e.g. files that would silently
    # replace the entry point for one agent tool.
    if not isinstance(config.setdefault("forbidden", []), list):
        raise ValueError("forbidden must be a list")
    for value in config["forbidden"]:
        local_path(root, value)
    for key in ("agents", "activePlans"):
        local_path(root, config[key])
    limit = config.get("maxAgentLines")
    if type(limit) is not int or limit < 1:
        raise ValueError("maxAgentLines must be a positive integer")
    return config


def markdown_files(path):
    if path.is_symlink():
        return
    if path.is_file() and path.suffix.lower() == ".md":
        yield path
    elif path.is_dir():
        for child in sorted(path.iterdir()):
            yield from markdown_files(child)


def prose(content):
    """Remove fenced blocks and inline code; this is not a full Markdown parser."""
    lines = []
    fence = None
    for line in content.splitlines():
        marker = re.match(r"^\s{0,3}(`{3,}|~{3,})(.*)$", line)
        if marker:
            run, tail = marker.groups()
            if fence is None:
                fence = run
                continue
            if run[0] == fence[0] and len(run) >= len(fence) and not tail.strip():
                fence = None
                continue
        if fence is None:
            lines.append(line)
    return re.sub(r"(`+).*?\1", "", "\n".join(lines))


def check(root):
    root = Path(root).resolve()
    try:
        config = load_config(root)
        errors = []
        for value in config["required"]:
            if not local_path(root, value).exists():
                errors.append("Missing harness path: " + value)
        for value in config["forbidden"]:
            path = root / value  # unresolved, so a symlink or dangling link counts
            if path.exists() or path.is_symlink():
                errors.append(f"Forbidden harness path present: {value} (remove it; see {config['agents']})")
        agent_file = local_path(root, config["agents"])
        if agent_file.is_file():
            count = len(agent_file.read_text(encoding="utf-8").rstrip().splitlines())
            if count > config["maxAgentLines"]:
                errors.append(f"{config['agents']} exceeds {config['maxAgentLines']} lines")
        files = set()
        for value in config["markdownRoots"]:
            path = local_path(root, value)
            if not path.exists():
                errors.append("Missing Markdown root: " + value)
            files.update(markdown_files(path))
        for file in sorted(files):
            content = prose(file.read_text(encoding="utf-8"))
            # Conventional inline links/images and reference definitions. Angle
            # targets support spaces; bare targets stop at whitespace or ')'.
            targets = re.findall(r"!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)", content)
            targets += re.findall(r"^\s{0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)", content, re.M)
            for target in targets:
                target = target.strip("<>")
                if target.startswith(("#", "//")) or re.match(r"^[a-zA-Z][\w+.-]*:", target):
                    continue
                relative = unquote(urlsplit(target).path)
                if not relative:
                    continue
                candidate = (file.parent / relative).resolve()
                label = str(file.relative_to(root))
                if not candidate.is_relative_to(root):
                    errors.append(f"{label}: link escapes repository: {target}")
                elif not candidate.exists():
                    errors.append(f"{label}: broken local link: {target}")
        return errors
    except (OSError, ValueError, KeyError, TypeError, RecursionError) as error:
        return ["Harness check could not finish: " + str(error)]


def main():
    errors = check(Path(__file__).resolve().parent.parent)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print("Harness documentation checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
