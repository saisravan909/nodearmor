#!/usr/bin/env python3
"""
NodeArmor — API Key Management
================================
Utilities for managing your NodeArmor API key.
"""

import os
import sys
from pathlib import Path


CONFIG_PATH = Path(".nodearmor/config.yaml")


def get_api_key() -> str | None:
    """Return API key from env var or config file."""
    key = os.getenv("NODEARMOR_API_KEY")
    if key:
        return key
    if CONFIG_PATH.exists():
        for line in CONFIG_PATH.read_text().splitlines():
            if line.strip().startswith("api_key:"):
                return line.split(":", 1)[1].strip().strip('"').strip("'")
    return None


def set_api_key(key: str):
    """Write API key to .nodearmor/config.yaml."""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = CONFIG_PATH.read_text() if CONFIG_PATH.exists() else ""
    lines = existing.splitlines()
    updated = False
    new_lines = []
    for line in lines:
        if line.strip().startswith("api_key:"):
            new_lines.append(f'api_key: "{key}"')
            updated = True
        else:
            new_lines.append(line)
    if not updated:
        new_lines.append(f'api_key: "{key}"')
    CONFIG_PATH.write_text("\n".join(new_lines) + "\n")
    print(f"  [OK] API key saved to {CONFIG_PATH}")


def validate_key_format(key: str) -> bool:
    """Basic format check — real validation happens server-side."""
    return key.startswith("na_") and len(key) >= 32


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "set":
        k = sys.argv[2]
        if not validate_key_format(k):
            print("  [ERROR] Key must start with na_ and be at least 32 characters.")
            sys.exit(1)
        set_api_key(k)
    elif len(sys.argv) == 2 and sys.argv[1] == "check":
        k = get_api_key()
        if k:
            print(f"  [OK] API key found: {k[:8]}{'*' * (len(k) - 8)}")
        else:
            print("  [MISSING] No API key configured. Run: python3 auth.py set na_YOUR_KEY")
    else:
        print("Usage:")
        print("  python3 auth.py set na_YOUR_KEY   — save your API key")
        print("  python3 auth.py check             — verify key is configured")
