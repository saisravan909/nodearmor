<div align="center">
  <h1>NodeArmor</h1>
  <p><strong>NIST SP 800-207 Zero Trust Enforcement Gate for Federal Software Supply Chains</strong></p>
  <p>
    <img src="https://img.shields.io/badge/NIST_SP_800--207-compliant-blue" alt="NIST SP 800-207" />
    <img src="https://img.shields.io/badge/EO_14028-compliant-blue" alt="EO 14028" />
    <img src="https://img.shields.io/badge/license-BSL_1.1-orange" alt="License" />
    <img src="https://img.shields.io/badge/python-3.10%2B-blue" alt="Python 3.10+" />
  </p>
</div>

---

NodeArmor is a deterministic CI/CD security gate for federal software supply chains. It enforces Zero Trust at the artifact level — every package, binary, and dependency must prove provenance, integrity, and authorization before a build is allowed to proceed.

**Binary outcome. No exceptions. PASS or BLOCK.**

---

## How It Works

```
Your CI/CD Pipeline
       │
       ▼
  enforce.py                    NodeArmor Policy Engine (private)
  ──────────                    ────────────────────────────────
  • Reads config.yaml      ──►  • Provenance verification
  • Computes SHA-256             • Signature validation
  • Collects build context       • SBOM analysis
  • Sends payload to API         • CVE risk scoring
                            ◄──  • NIST 800-207 policy evaluation
       │
   PASS / BLOCK
       │
  Build proceeds            Hard stop — pipeline exits 1
  or is rejected
```

The enforcement logic runs server-side. This client is fully auditable — there is no hidden behavior. The policy engine that powers the decisions is maintained by NodeArmor and operated as a managed service.

---

## Quick Start

### 1. Set your API key

```bash
export NODEARMOR_API_KEY=na_your_key_here
```

### 2. Add to your GitHub Actions workflow

```yaml
- name: NodeArmor Gate
  env:
    NODEARMOR_API_KEY: ${{ secrets.NODEARMOR_API_KEY }}
  run: |
    python3 enforce.py \
      --package "myapp@${{ github.sha }}" \
      --registry "https://registry.npmjs.org"
```

### 3. Run locally

```bash
python3 enforce.py --package lodash@4.17.21 --registry https://registry.npmjs.org
```

---

## Installation

No external dependencies. Requires Python 3.10+.

```bash
git clone https://github.com/saisravan909/nodearmor.git
cp .nodearmor/config.yaml.example .nodearmor/config.yaml
# Add NODEARMOR_API_KEY to your environment or Secrets
```

---

## Configuration

```yaml
# .nodearmor/config.yaml

severity_threshold: "HIGH"          # Block on HIGH and CRITICAL findings

authorized_registries:
  - "registry.npmjs.org"
  - "pypi.org"
  - "registry.federal.gov"

sbom_format: "auto"                 # cyclonedx | spdx | auto
```

---

## What Gets Checked (Server-Side)

| Check | What It Catches |
|-------|----------------|
| **Provenance** | Packages sourced from unauthorized or compromised registries |
| **Signature** | Tampered artifacts, hash mismatches, missing signatures |
| **SBOM** | Unknown dependencies, license violations, missing bill of materials |
| **CVE Risk** | Known vulnerabilities above severity threshold |
| **NIST 800-207** | Zero Trust policy alignment across all six pillars |

---

## Sector Use Cases

- [Federal Agencies — Supply Chain Security](use-cases/01-federal-agency-supply-chain/)
- [Defense Contractors — CMMC Alignment](use-cases/02-defense-contractors/)
- [Critical Infrastructure — ICS/OT Protection](use-cases/03-critical-infrastructure/)
- [Red Team / Purple Team — Adversarial Testing](use-cases/04-red-team-purple-team/)
- [Government Software Vendors — FedRAMP](use-cases/05-government-software-vendors/)
- [Enterprise CI/CD — DevSecOps Integration](use-cases/06-enterprise-cicd/)
- [Healthcare — HIPAA Supply Chain](use-cases/07-healthcare/)
- [Financial Services — SOC 2 + PCI](use-cases/08-financial-services-banking/)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PUBLIC (this repo)                   │
│  enforce.py — thin client, fully auditable, no logic        │
│  auth.py    — API key management                            │
│  config.yaml — policy configuration schema                  │
│  .github/workflows/ — CI/CD integration                     │
└─────────────────────────────────────────────────────────────┘
                              │  HTTPS + API key
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PRIVATE (managed service)                 │
│  Policy Engine    — NIST 800-207 evaluation                 │
│  SBOM Analyzer    — dependency graph analysis               │
│  Signature Store  — federal baseline hash registry          │
│  Deception Layer  — ghost build / honeypot for red teams    │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Open Client + Private Engine?

This is the same model used by Semgrep, Snyk, and HashiCorp Sentinel:

- **Auditability** — federal buyers inspect the client; nothing is hidden
- **Security** — enforcement logic cannot be reverse-engineered by adversaries
- **Compliance** — GSA and DoD prefer vendor-controlled policy engines with SLAs
- **Trust** — you see exactly what data is sent to the API (just look at enforce.py)

---

## License

Business Source License 1.1 — see [LICENSE.md](LICENSE.md)

Free for evaluation and non-production use. Production deployments require a license.

---

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md)

---

<div align="center">
  <sub>Built for Cyberscape Summit 2026 · Tool Architect: Sai Sravan Cherukuri</sub>
</div>
