#!/usr/bin/env python3
"""Print the bin directory of the Node.js version pinned in .nvmrc.

Used by .githooks/* and the Claude Code adapter so checks run on the pinned
Node even when the shell default is older (TD-7). Looks only under nvm's
install directory and changes nothing. Exits 1 with no output when the pin is
missing, not a plain version, or not installed; callers then keep their PATH.
"""

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def version_key(name):
    return tuple(int(part) for part in name.lstrip("v").split("."))


def pinned_node_bin(root, environ=os.environ):
    """Return the installed bin directory for .nvmrc, or None. Never raises."""
    try:
        pin = (Path(root) / ".nvmrc").read_text(encoding="utf-8").strip().lstrip("v")
        # nvm resolves "24" or "24.16" to the newest installed match.
        if not re.fullmatch(r"\d+(\.\d+){0,2}", pin):
            return None
        versions = Path(environ.get("NVM_DIR") or Path.home() / ".nvm") / "versions/node"
        matches = [
            child for child in versions.iterdir()
            if re.fullmatch(r"v\d+\.\d+\.\d+", child.name)
            and (child.name[1:] == pin or child.name[1:].startswith(pin + "."))
        ]
        for candidate in sorted(matches, key=lambda child: version_key(child.name), reverse=True):
            if os.access(candidate / "bin/node", os.X_OK):
                return candidate / "bin"
        return None
    except (OSError, ValueError):
        return None


def main():
    bin_dir = pinned_node_bin(ROOT)
    if bin_dir is None:
        return 1
    print(bin_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
