#!/usr/bin/env python3
"""
NodeArmor Enforcement Gate — Client
=====================================
Zero Trust software supply chain enforcement for federal CI/CD pipelines.
NIST SP 800-207 | EO 14028 | SSDF compliant.

This client collects build context and delegates policy evaluation to the
NodeArmor Policy Engine. No enforcement logic runs client-side — the policy
engine, SBOM analysis, and signature verification run server-side.

Usage:
    python3 enforce.py --package my-service@1.2.3 --registry https://registry.npmjs.org

Exit codes:
    0 = PASS (build authorized to proceed)
    1 = BLOCK (hard stop — build rejected)
"""

import sys
import os
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime, timezone
import urllib.request
import urllib.error

CLIENT_VERSION  = "1.0.0"
DEFAULT_API_URL = "https://node-armor-enforcement.replit.app/api/evaluate"


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

def load_config() -> dict:
    """Load .nodearmor/config.yaml without external dependencies."""
    config_path = Path(".nodearmor/config.yaml")
    if not config_path.exists():
        return {}
    config = {}
    for line in config_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            k, _, v = line.partition(":")
            config[k.strip()] = v.strip().strip('"').strip("'")
    return config


# ---------------------------------------------------------------------------
# Artifact integrity (client-side only — hash sent to policy engine)
# ---------------------------------------------------------------------------

def compute_sha256(path: str) -> str | None:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except FileNotFoundError:
        return None


# ---------------------------------------------------------------------------
# Policy evaluation (delegates to NodeArmor Policy Engine)
# ---------------------------------------------------------------------------

def evaluate(payload: dict, api_url: str, api_key: str) -> dict:
    """
    Submit build context to the NodeArmor Policy Engine.
    Returns a structured decision: PASS | BLOCK
    """
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        api_url,
        data=data,
        headers={
            "Content-Type":      "application/json",
            "X-NodeArmor-Key":   api_key,
            "X-Client-Version":  CLIENT_VERSION,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        return {
            "decision": "BLOCK",
            "reason":   f"API error {e.code}: {body[:120]}",
            "findings": [],
        }
    except Exception as e:
        return {
            "decision": "BLOCK",
            "reason":   f"Connection failed: {e}",
            "findings": [],
        }


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def print_banner():
    print()
    print("  ╔══════════════════════════════════════════════════════╗")
    print("  ║        N O D E A R M O R  ·  GATE  v1.0            ║")
    print("  ║   NIST SP 800-207  ·  EO 14028  ·  Zero Trust      ║")
    print("  ╚══════════════════════════════════════════════════════╝")
    print()


def print_finding(finding: dict):
    level  = finding.get("level", "INFO")
    symbol = {"PASS": "✓", "FAIL": "✗", "WARN": "!", "INFO": "·"}.get(level, "·")
    print(f"    [{symbol}] {finding.get('message', '')}")
    if finding.get("detail"):
        print(f"         {finding['detail']}")


def print_pass():
    print()
    print("  ╔══════════════════════════════════════════════════════╗")
    print("  ║  ✓  GATE PASSED — Build authorized to proceed       ║")
    print("  ╚══════════════════════════════════════════════════════╝")
    print()


def print_block(reason: str):
    print()
    print("  ╔══════════════════════════════════════════════════════╗")
    print("  ║  ✗  GATE BLOCKED — Hard stop. Build rejected.       ║")
    if reason:
        r = reason[:50]
        print(f"  ║     {r:<52}║")
    print("  ╚══════════════════════════════════════════════════════╝")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="NodeArmor — Zero Trust Software Supply Chain Gate",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 enforce.py --package lodash@4.17.21 --registry https://registry.npmjs.org
  python3 enforce.py --package myapp@2.0.0 --registry https://pypi.org --artifact dist/myapp-2.0.0.tar.gz
        """,
    )
    parser.add_argument("--package",  required=True, help="Package name and version (e.g. myapp@1.2.3)")
    parser.add_argument("--registry", required=True, help="Registry URL the artifact was sourced from")
    parser.add_argument("--artifact", required=False, help="Local path to artifact file for integrity check")
    parser.add_argument("--api-url",  default=os.getenv("NODEARMOR_API_URL", DEFAULT_API_URL))
    parser.add_argument("--demo",     action="store_true", help="Run in demo mode (forces BLOCK for live presentations)")
    args = parser.parse_args()

    config  = load_config()
    api_key = os.getenv("NODEARMOR_API_KEY") or config.get("api_key", "")

    if not api_key:
        print()
        print("  [ERROR] NODEARMOR_API_KEY is not set.")
        print("          Set the environment variable or add api_key to .nodearmor/config.yaml")
        print("          Get your key: https://github.com/saisravan909/nodearmor")
        print()
        sys.exit(1)

    print_banner()
    print(f"  Package  : {args.package}")
    print(f"  Registry : {args.registry}")
    print(f"  Time     : {datetime.now(timezone.utc).isoformat()}")

    sha256 = None
    if args.artifact:
        sha256 = compute_sha256(args.artifact)
        if sha256:
            print(f"  SHA-256  : {sha256}")
        else:
            print(f"  SHA-256  : [artifact not found — skipping integrity check]")

    payload = {
        "package":        args.package,
        "registry":       args.registry,
        "sha256":         sha256,
        "demo_mode":      args.demo,
        "client_version": CLIENT_VERSION,
        "timestamp":      datetime.now(timezone.utc).isoformat(),
    }

    print("\n  Submitting to NodeArmor Policy Engine ...\n")

    result   = evaluate(payload, args.api_url, api_key)
    decision = result.get("decision", "BLOCK")
    reason   = result.get("reason", "")
    findings = result.get("findings", [])

    for finding in findings:
        print_finding(finding)

    if decision == "PASS":
        print_pass()
        sys.exit(0)
    else:
        print_block(reason)
        sys.exit(1)


if __name__ == "__main__":
    main()
