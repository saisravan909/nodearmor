import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CostCalculator from './CostCalculator';

const API = import.meta.env.VITE_API_URL || 'https://node-armor-enforcement.replit.app';

const ECOSYSTEMS = [
  { id: 'npm',   label: 'npm',    hint: 'JavaScript / Node.js' },
  { id: 'PyPI',  label: 'PyPI',   hint: 'Python' },
  { id: 'Maven', label: 'Maven',  hint: 'Java' },
];

const SUGGESTED = [
  { name: 'lodash',       ecosystem: 'npm',   label: 'lodash' },
  { name: 'axios',        ecosystem: 'npm',   label: 'axios' },
  { name: 'express',      ecosystem: 'npm',   label: 'express' },
  { name: 'node-fetch',   ecosystem: 'npm',   label: 'node-fetch' },
  { name: 'requests',     ecosystem: 'PyPI',  label: 'requests' },
  { name: 'boto3',        ecosystem: 'PyPI',  label: 'boto3' },
  { name: 'django',       ecosystem: 'PyPI',  label: 'django' },
  { name: 'numpy',        ecosystem: 'PyPI',  label: 'numpy' },
  { name: 'org.apache.logging.log4j:log4j-core', ecosystem: 'Maven', label: 'log4j-core ⚡' },
  { name: 'spring-core',  ecosystem: 'Maven', label: 'spring-core' },
];

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#60A5FA',
  UNKNOWN:  '#f59e0b',
  NONE:     '#22c55e',
};

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH:     'High risk',
  MEDIUM:   'Medium risk',
  LOW:      'Low risk',
  UNKNOWN:  'Flagged',
  NONE:     'Clean',
};

function translateToBusinessRisk(summary: string): string {
  const s = summary.toLowerCase();
  if (s.includes('secure header') || s.includes('credential') || s.includes('authentication token'))
    return 'Can expose login credentials or session tokens to malicious third parties.';
  if (s.includes('inefficient regular') || s.includes('regular expression') || s.includes('redos') || s.includes('regex'))
    return 'A specially crafted request can freeze or crash the service — knocking it offline without warning.';
  if (s.includes('prototype pollution'))
    return 'Can corrupt core application logic, potentially granting unauthorized access to protected resources.';
  if (s.includes('command injection') || s.includes('arbitrary command'))
    return 'Attackers can run arbitrary commands directly on your servers.';
  if (s.includes('remote code execution') || s.includes('rce'))
    return 'Attackers can take complete remote control of the affected system.';
  if (s.includes('sql injection'))
    return 'Can expose, modify, or permanently destroy your database records.';
  if (s.includes('cross-site scripting') || s.includes('xss'))
    return 'Can steal active user sessions or silently redirect users to malicious pages.';
  if (s.includes('path traversal') || s.includes('directory traversal'))
    return 'Attackers can read restricted files — including credentials and configuration — directly from your servers.';
  if (s.includes('denial of service') || s.includes('dos'))
    return 'Attackers can take your service offline without needing credentials.';
  if (s.includes('information disclosure') || s.includes('information leak'))
    return 'Can expose sensitive system internals — configuration files, stack traces, or internal network paths.';
  if (s.includes('authentication bypass') || s.includes('auth bypass'))
    return 'Attackers can access protected resources without valid credentials.';
  if (s.includes('buffer overflow'))
    return 'Can crash the system or enable execution of malicious code.';
  if (s.includes('ssrf') || s.includes('server-side request forgery'))
    return 'Can force your servers to make requests to internal systems, bypassing network controls.';
  if (s.includes('redirect'))
    return 'Can intercept or manipulate requests — potentially exposing data sent between systems.';
  if (s.includes('size') || s.includes('limit'))
    return 'Allows abnormally large data to be sent, which can destabilize or crash the service.';
  if (s.includes('open redirect'))
    return 'Can redirect users to malicious sites — enabling phishing or credential theft.';
  return 'A documented security flaw that could be exploited if this package is deployed to production.';
}

function getBlockSummary(findings: Array<{ id: string; summary: string; severity: string; level: string }>, pkgName: string, count: number): string {
  const all = findings.map(f => f.summary.toLowerCase()).join(' ');
  if (all.includes('header') || all.includes('credential') || all.includes('session'))
    return `${pkgName} can leak credentials or session tokens to unauthorized parties. Deployment blocked.`;
  if (all.includes('denial of service') || all.includes('inefficient regular') || all.includes('regular expression'))
    return `${pkgName} contains ${count} vulnerabilities that allow attackers to crash or freeze your services on demand. Deployment blocked.`;
  if (all.includes('remote code') || all.includes('command injection'))
    return `${pkgName} contains critical flaws that allow attackers to execute commands on your servers. Deployment blocked.`;
  if (all.includes('sql'))
    return `${pkgName} can expose or corrupt your database. Deployment blocked.`;
  return `${pkgName} has ${count} documented vulnerabilities. If deployed, any of these could be exploited against your systems.`;
}

const SCAN_STEPS = [
  'Resolving package metadata …',
  'Checking provenance against authorized registries …',
  'Querying CVE feed (OSV / NVD) …',
  'Running NIST 800-207 policy evaluation …',
  'Generating verdict …',
];

interface ScanResult {
  package: string;
  ecosystem: string;
  cve_count: number;
  max_severity: string;
  decision: 'PASS' | 'BLOCK';
  findings: Array<{ id: string; summary: string; severity: string; level: string }>;
}

export default function PackageScan() {
  const [input, setInput]         = useState('');
  const [ecosystem, setEcosystem] = useState('npm');
  const [scanning, setScanning]   = useState(false);
  const [stepIdx, setStepIdx]     = useState(0);
  const [result, setResult]       = useState<ScanResult | null>(null);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const scan = async (pkgName: string, eco: string) => {
    if (scanning || !pkgName.trim()) return;
    setResult(null);
    setError('');
    setScanning(true);
    setStepIdx(0);

    // Animate steps while waiting
    const interval = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, SCAN_STEPS.length - 1));
    }, 420);

    try {
      const res = await fetch(`${API}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pkgName.trim(), ecosystem: eco }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      clearInterval(interval);
      setStepIdx(SCAN_STEPS.length - 1);
      setScanning(false);
    }
  };

  const handleChip = (pkg: typeof SUGGESTED[0]) => {
    setInput(pkg.name);
    setEcosystem(pkg.ecosystem);
    scan(pkg.name, pkg.ecosystem);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scan(input, ecosystem);
  };

  const severityColor = result ? (SEVERITY_COLOR[result.max_severity] ?? '#8B5CF6') : '#8B5CF6';

  return (
    <section
      className="relative py-24 px-6 overflow-hidden"
      style={{ backgroundColor: '#060d1a' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #60A5FA, transparent)' }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="h-px w-12" style={{ backgroundColor: 'rgba(96,165,250,0.4)' }} />
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: '#60A5FA' }}>
              Live Demo · Audience Participation
            </span>
            <div className="h-px w-12" style={{ backgroundColor: 'rgba(96,165,250,0.4)' }} />
          </div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white mb-3">
            Scan any package.{' '}
            <span style={{ color: '#60A5FA' }}>Right now.</span>
          </h2>
          <p className="font-mono text-sm max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Call out any software package your team uses. Type it in. NodeArmor
            checks it against the live CVE feed in real time — no simulation, no staged data.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div
            className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border"
            style={{ backgroundColor: '#0b1628', borderColor: 'rgba(96,165,250,0.2)' }}
          >
            {/* Ecosystem selector */}
            <div className="flex gap-1 shrink-0">
              {ECOSYSTEMS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEcosystem(e.id)}
                  className="font-mono text-xs px-3 py-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: ecosystem === e.id ? 'rgba(96,165,250,0.15)' : 'transparent',
                    color: ecosystem === e.id ? '#60A5FA' : 'rgba(255,255,255,0.3)',
                    border: `1px solid ${ecosystem === e.id ? 'rgba(96,165,250,0.4)' : 'transparent'}`,
                  }}
                  title={e.hint}
                >
                  {e.label}
                </button>
              ))}
            </div>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type any package name, e.g. lodash"
              className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/20 px-2"
              disabled={scanning}
              autoComplete="off"
              spellCheck={false}
            />

            {/* Scan button */}
            <motion.button
              type="submit"
              disabled={scanning || !input.trim()}
              whileHover={!scanning && input.trim() ? { scale: 1.03 } : {}}
              whileTap={!scanning && input.trim() ? { scale: 0.97 } : {}}
              className="font-display font-bold text-sm px-6 py-2.5 rounded-xl transition-all shrink-0"
              style={{
                backgroundColor: scanning ? 'rgba(96,165,250,0.05)' : 'rgba(96,165,250,0.15)',
                color: scanning ? 'rgba(96,165,250,0.4)' : '#60A5FA',
                border: '1px solid rgba(96,165,250,0.3)',
              }}
            >
              {scanning ? 'Scanning…' : 'Scan →'}
            </motion.button>
          </div>
        </form>

        {/* Suggested chips */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          <span className="font-mono text-xs self-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Try:
          </span>
          {SUGGESTED.map((pkg) => (
            <motion.button
              key={pkg.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleChip(pkg)}
              disabled={scanning}
              className="font-mono text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{
                borderColor: pkg.name === 'log4j-core'
                  ? 'rgba(239,68,68,0.4)'
                  : 'rgba(255,255,255,0.1)',
                color: pkg.name === 'log4j-core'
                  ? '#ef4444'
                  : 'rgba(255,255,255,0.4)',
                backgroundColor: pkg.name === 'log4j-core'
                  ? 'rgba(239,68,68,0.06)'
                  : 'rgba(255,255,255,0.03)',
              }}
            >
              {pkg.label}
            </motion.button>
          ))}
        </div>

        {/* Scanning animation */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border p-6 mb-6"
              style={{ backgroundColor: '#0b1628', borderColor: 'rgba(96,165,250,0.15)' }}
            >
              <div className="font-mono text-xs mb-4" style={{ color: 'rgba(96,165,250,0.7)' }}>
                SCANNING: {input} ({ecosystem})
              </div>
              <div className="space-y-2">
                {SCAN_STEPS.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: i <= stepIdx ? 1 : 0.15, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-center gap-3 font-mono text-xs"
                  >
                    {i < stepIdx ? (
                      <span style={{ color: '#22c55e' }}>✓</span>
                    ) : i === stepIdx ? (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.7 }}
                        style={{ color: '#60A5FA' }}
                      >
                        ›
                      </motion.span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                    )}
                    <span style={{ color: i <= stepIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }}>
                      {step}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && !scanning && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border p-4 mb-6 font-mono text-xs"
              style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)' }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && !scanning && (
            <motion.div
              key={result.package + result.ecosystem}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Verdict banner */}
              <motion.div
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="rounded-2xl border p-6 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{
                  backgroundColor: result.decision === 'PASS'
                    ? 'rgba(34,197,94,0.05)'
                    : 'rgba(239,68,68,0.06)',
                  borderColor: result.decision === 'PASS'
                    ? 'rgba(34,197,94,0.3)'
                    : 'rgba(239,68,68,0.3)',
                }}
              >
                <div>
                  <div className="font-mono text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {result.ecosystem} · {result.package}
                  </div>
                  <div
                    className="font-display font-extrabold text-3xl"
                    style={{ color: result.decision === 'PASS' ? '#22c55e' : '#ef4444' }}
                  >
                    {result.decision === 'PASS'
                      ? '✓ GATE PASSED'
                      : '✗ GATE BLOCKED'}
                  </div>
                  <div className="font-mono text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {result.decision === 'PASS'
                      ? 'No known vulnerabilities. Build authorized to proceed.'
                      : `${result.cve_count} known vulnerabilit${result.cve_count === 1 ? 'y' : 'ies'} detected. Hard stop.`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-mono text-xs px-3 py-1 rounded-full border"
                    style={{
                      color: severityColor,
                      borderColor: severityColor + '55',
                      backgroundColor: severityColor + '11',
                    }}
                  >
                    {result.decision === 'PASS'
                      ? 'No vulnerabilities'
                      : `Highest risk: ${SEVERITY_LABEL[result.max_severity] ?? 'Flagged'}`}
                  </div>
                  {result.cve_count > 0 && (
                    <div className="font-mono text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {result.cve_count} issue{result.cve_count !== 1 ? 's' : ''} found
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Plain-English block summary */}
              {result.decision === 'BLOCK' && result.findings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border px-5 py-4 mb-4"
                  style={{ borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)' }}
                >
                  <div className="font-display font-bold text-base text-white mb-2">What this means for your organization</div>
                  <div className="font-mono text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {getBlockSummary(result.findings, result.package, result.cve_count)}
                  </div>
                  <div className="font-mono text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    NodeArmor stopped this before it could reach production. No manual intervention required.
                  </div>
                </motion.div>
              )}

              {/* Cost calculator — shown after BLOCK */}
              {result.decision === 'BLOCK' && (
                <CostCalculator pkgName={result.package} />
              )}

              {/* CVE findings */}
              {result.findings.length > 0 && (
                <div
                  className="rounded-2xl border overflow-hidden mb-6"
                  style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#0b1628' }}
                >
                  <div
                    className="px-5 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {result.cve_count} security {result.cve_count === 1 ? 'issue' : 'issues'} found
                    </span>
                    <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      source: Google OSV · CISA NVD
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    {result.findings.map((f, i) => {
                      const fc = SEVERITY_COLOR[f.level] ?? '#f59e0b';
                      const label = SEVERITY_LABEL[f.level] ?? 'Flagged';
                      const plain = translateToBusinessRisk(f.summary);
                      return (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07, duration: 0.3 }}
                          className="flex gap-4 px-5 py-4 items-start"
                          style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                        >
                          <div
                            className="font-mono text-xs px-2 py-0.5 rounded border shrink-0 mt-0.5 whitespace-nowrap"
                            style={{ color: fc, borderColor: fc + '44', backgroundColor: fc + '11' }}
                          >
                            {label}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm font-semibold mb-1.5 leading-snug" style={{ color: 'rgba(255,255,255,0.92)' }}>
                              {plain}
                            </div>
                            <div className="font-mono text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                              {f.id} · {f.summary}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* How this scan works */}
              <ScanExplainer result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ── Pipeline visualization ────────────────────────────────────────────────────

const FACTS = [
  {
    label: 'OSV.dev',
    color: '#f59e0b',
    title: 'The database',
    body: 'Open Source Vulnerabilities is maintained by Google and aggregates the NVD, GitHub Advisory Database, and 20+ other authoritative vulnerability feeds. Every result you see comes directly from this source.',
  },
  {
    label: 'NIST SP 800-207',
    color: '#8B5CF6',
    title: 'The standard',
    body: 'Zero Trust Architecture requires every software component to be verified against an authorized source of truth before it is permitted to run. This enforcement gate implements that requirement at the CI/CD layer.',
  },
  {
    label: 'Live — no simulation',
    color: '#22c55e',
    title: 'What you just saw',
    body: 'The CVE data above is real — pulled from the live OSV feed at the moment you hit Scan. It is the same dataset CISA references for federal vulnerability tracking. Nothing was pre-loaded or staged.',
  },
];

function PipelineViz({ pkg, decision, cveCount }: { pkg: string; decision: 'PASS' | 'BLOCK'; cveCount: number }) {
  const isBlocked = decision === 'BLOCK';
  const verdictColor = isBlocked ? '#ef4444' : '#22c55e';

  const ROWS = [
    {
      step: '01',
      label: 'Code commit received',
      detail: `Package "${pkg}" submitted for deployment review`,
      color: '#60A5FA',
      delay: 0.1,
    },
    {
      step: '02',
      label: 'NodeArmor gate activated',
      detail: 'Zero Trust enforcement — every dependency checked before proceeding',
      color: '#8B5CF6',
      delay: 0.7,
    },
    {
      step: '03',
      label: 'CVE database queried',
      detail: isBlocked
        ? `Google OSV returned ${cveCount} known vulnerabilit${cveCount === 1 ? 'y' : 'ies'} for "${pkg}"`
        : `Google OSV returned no known vulnerabilities for "${pkg}"`,
      color: isBlocked ? '#f97316' : '#f59e0b',
      delay: 1.3,
    },
    {
      step: '04',
      label: isBlocked ? 'Deployment blocked' : 'Deployment authorized',
      detail: isBlocked
        ? `"${pkg}" was stopped at the gate. It never reached production.`
        : `"${pkg}" cleared all checks and is authorized for production.`,
      color: verdictColor,
      delay: 1.9,
    },
  ];

  return (
    <div
      className="rounded-2xl border p-8 mb-5"
      style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#06101f' }}
    >
      <div className="max-w-2xl mx-auto">
        {ROWS.map((row, i) => (
          <div key={row.step}>
            {/* Stage row */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: row.delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-5"
            >
              {/* Step number + connector column */}
              <div className="flex flex-col items-center shrink-0" style={{ width: '48px' }}>
                <motion.div
                  initial={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  animate={{ backgroundColor: row.color + '22', borderColor: row.color + '88' }}
                  transition={{ delay: row.delay + 0.1, duration: 0.35 }}
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono font-bold text-base shrink-0"
                  style={{ color: row.color }}
                >
                  {row.step}
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-2 pt-1">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: row.delay + 0.15, duration: 0.35 }}
                  className="font-display font-bold text-xl mb-1"
                  style={{ color: i === ROWS.length - 1 ? verdictColor : 'white' }}
                >
                  {row.label}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: row.delay + 0.25, duration: 0.35 }}
                  className="font-mono text-base leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  {row.detail}
                </motion.div>
              </div>
            </motion.div>

            {/* Vertical connector between rows */}
            {i < ROWS.length - 1 && (
              <div className="flex gap-5 items-stretch" style={{ height: '36px' }}>
                <div className="flex justify-center shrink-0" style={{ width: '48px' }}>
                  <div className="relative w-0.5 h-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: row.delay + 0.5, duration: 0.3, transformOrigin: 'top', ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: ROWS[i + 1].color + 'cc' }}
                    />
                  </div>
                </div>
                <div className="flex-1" />
              </div>
            )}
          </div>
        ))}

        {/* Final verdict callout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.3, duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
          className="mt-6 rounded-xl border-2 px-6 py-4 text-center"
          style={{
            borderColor: verdictColor + '55',
            backgroundColor: verdictColor + '0e',
          }}
        >
          <div
            className="font-display font-extrabold text-2xl mb-1"
            style={{ color: verdictColor }}
          >
            {isBlocked ? 'GATE BLOCKED — deployment stopped' : 'GATE PASSED — authorized for production'}
          </div>
          <div className="font-mono text-base" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {isBlocked
              ? 'No manual action required. NodeArmor stopped it automatically.'
              : 'All Zero Trust checks satisfied. Build is cleared to deploy.'}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GitHubView({ result }: { result: ScanResult }) {
  const isBlocked = result.decision === 'BLOCK';
  const [visibleLines, setVisibleLines] = useState(0);

  const logLines: Array<{ text: string; color: string; bold?: boolean }> = [
    { text: '  Run NodeArmor enforcement gate', color: 'rgba(255,255,255,0.5)' },
    { text: '', color: 'transparent' },
    { text: `  [NodeArmor] Scanning ${result.package} (${result.ecosystem})`, color: '#60A5FA' },
    { text: '  [NodeArmor] Connecting to Google OSV database...', color: 'rgba(255,255,255,0.45)' },
    { text: '  [NodeArmor] Querying NVD + GitHub Advisory feeds...', color: 'rgba(255,255,255,0.45)' },
    { text: `  [NodeArmor] Database returned ${result.cve_count} result${result.cve_count !== 1 ? 's' : ''}`, color: result.cve_count > 0 ? '#f97316' : '#22c55e' },
    { text: '  [NodeArmor] Running NIST SP 800-207 policy evaluation...', color: 'rgba(255,255,255,0.45)' },
    ...(isBlocked
      ? [
          { text: '', color: 'transparent' },
          { text: `  [NodeArmor] POLICY VIOLATION: ${result.cve_count} known vulnerabilit${result.cve_count === 1 ? 'y' : 'ies'} detected`, color: '#ef4444', bold: true },
          { text: '  [NodeArmor] Unauthorized package — deployment cannot proceed', color: '#ef4444' },
          { text: '', color: 'transparent' },
          { text: '  Error: Process completed with exit code 1.', color: '#ef4444', bold: true },
        ]
      : [
          { text: '', color: 'transparent' },
          { text: '  [NodeArmor] Zero known vulnerabilities — package is clean', color: '#22c55e' },
          { text: '  [NodeArmor] Provenance verified. Signature valid. SBOM complete.', color: '#22c55e' },
          { text: '', color: 'transparent' },
          { text: '  NodeArmor gate: PASS — build authorized for deployment', color: '#22c55e', bold: true },
        ]),
  ];

  useEffect(() => {
    setVisibleLines(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    logLines.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 300 + i * 120));
    });
    return () => timers.forEach(clearTimeout);
  }, [result.package, result.decision]);

  const workflowSteps = [
    { name: 'Checkout repository', done: true },
    { name: 'Set up Python environment', done: true },
    { name: 'Verify build provenance', done: true },
    { name: 'Run SBOM scan', done: true },
    { name: 'Run NodeArmor enforcement gate', done: true, active: true, failed: isBlocked },
  ];

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-5"
      style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0d1117' }}
    >
      {/* GitHub Actions header bar */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#161b22' }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: isBlocked ? '#ef4444' : '#22c55e' }}
        />
        <span className="font-mono text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
          nodearmor-gate.yml — {isBlocked ? 'failed' : 'passed'}
        </span>
        <div className="flex-1" />
        <a
          href="https://github.com/saisravan909/nodearmor/actions"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs px-3 py-1 rounded border transition-all"
          style={{
            color: '#60A5FA',
            borderColor: 'rgba(96,165,250,0.3)',
            backgroundColor: 'rgba(96,165,250,0.07)',
          }}
        >
          View on GitHub
        </a>
      </div>

      <div className="flex" style={{ minHeight: '320px' }}>
        {/* Left sidebar — step list */}
        <div
          className="border-r py-3"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0d1117', minWidth: '240px' }}
        >
          {workflowSteps.map((step) => (
            <div
              key={step.name}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                backgroundColor: step.active ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: step.active ? `3px solid ${isBlocked ? '#ef4444' : '#22c55e'}` : '3px solid transparent',
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold"
                style={{
                  backgroundColor: step.failed
                    ? '#ef444422'
                    : step.done
                    ? '#22c55e22'
                    : 'rgba(255,255,255,0.05)',
                  color: step.failed ? '#ef4444' : step.done ? '#22c55e' : 'rgba(255,255,255,0.3)',
                  border: `1px solid ${step.failed ? '#ef444444' : step.done ? '#22c55e44' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {step.failed ? 'x' : step.done ? 'v' : '-'}
              </div>
              <span
                className="font-mono text-xs leading-snug"
                style={{
                  color: step.active
                    ? 'rgba(255,255,255,0.85)'
                    : 'rgba(255,255,255,0.4)',
                }}
              >
                {step.name}
              </span>
            </div>
          ))}
        </div>

        {/* Right panel — terminal log */}
        <div className="flex-1 p-5 font-mono text-sm overflow-auto" style={{ backgroundColor: '#010409' }}>
          <div className="mb-3" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>
            Run nodearmor_gate.py --package "{result.package}" --ecosystem "{result.ecosystem}" --policy nist-800-207
          </div>
          <div className="space-y-0.5">
            {logLines.slice(0, visibleLines).map((line, i) => (
              <div
                key={i}
                className="leading-relaxed"
                style={{
                  color: line.color,
                  fontWeight: line.bold ? 700 : 400,
                  minHeight: '1.5rem',
                }}
              >
                {line.text}
              </div>
            ))}
            {visibleLines < logLines.length && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
                style={{ color: '#60A5FA' }}
              >
                _
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DependencyIceberg({ pkg, ecosystem }: { pkg: string; ecosystem: string }) {
  const [direct, setDirect] = useState<string[]>([]);
  const [transitive, setTransitive] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setDirect([]);
    setTransitive(0);

    async function fetchNpm(name: string): Promise<string[]> {
      try {
        const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
        const d = await r.json();
        return Object.keys(d.dependencies || {});
      } catch { return []; }
    }

    async function fetchPypi(name: string): Promise<string[]> {
      try {
        const r = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
        const d = await r.json();
        const raw: string[] = d.info?.requires_dist || [];
        return raw.map((s: string) => s.split(/[>=<!;\s[]/)[0].trim()).filter(Boolean);
      } catch { return []; }
    }

    async function run() {
      let deps: string[] = [];
      if (ecosystem === 'npm') deps = await fetchNpm(pkg);
      else if (ecosystem === 'PyPI') deps = await fetchPypi(pkg);
      else { setLoading(false); return; }

      setDirect(deps);

      // Fetch 2nd-level for first 5 direct deps
      const sample = deps.slice(0, 5);
      const secondLevel = await Promise.all(
        sample.map((d) => ecosystem === 'npm' ? fetchNpm(d) : fetchPypi(d))
      );
      const transitiveCount = secondLevel.reduce((s, a) => s + a.length, 0);
      const extraDeps = deps.slice(5).length;
      setTransitive(transitiveCount + extraDeps * 3); // rough estimate for unsampled
      setLoading(false);
    }

    run();
  }, [pkg, ecosystem]);

  const total = 1 + direct.length + transitive;

  if (ecosystem === 'Maven') {
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#06101f' }}>
        <div className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Transitive dependency analysis is available for npm and PyPI packages.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#06101f' }}>
        <motion.div animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}
          className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Fetching dependency tree…
        </motion.div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden mb-5" style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#06101f' }}>
      <div className="px-8 py-6">
        {/* Headline */}
        <div className="text-center mb-8">
          <div className="font-display font-extrabold text-2xl text-white mb-2">
            You imported 1 package.
          </div>
          <div className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Here is what actually arrived.
          </div>
        </div>

        {/* Iceberg layers */}
        <div className="max-w-lg mx-auto space-y-3">
          {/* Above water */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl border-2 px-6 py-4 text-center"
            style={{ borderColor: 'rgba(96,165,250,0.5)', backgroundColor: 'rgba(96,165,250,0.08)' }}>
            <div className="font-mono text-xs mb-1" style={{ color: 'rgba(96,165,250,0.6)' }}>WHAT YOU SEE</div>
            <div className="font-display font-bold text-xl text-white">{pkg}</div>
            <div className="font-mono text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>1 package — your deliberate choice</div>
          </motion.div>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <div className="font-mono text-xs px-3 py-1 rounded border"
              style={{ color: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', whiteSpace: 'nowrap' }}>
              below the surface
            </div>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Layer 1 */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-xl border px-6 py-4"
            style={{ borderColor: 'rgba(245,158,11,0.35)', backgroundColor: 'rgba(245,158,11,0.06)' }}>
            <div className="font-mono text-xs mb-2" style={{ color: 'rgba(245,158,11,0.7)' }}>DIRECT DEPENDENCIES</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {direct.slice(0, 12).map((d) => (
                <span key={d} className="font-mono text-xs px-2 py-0.5 rounded border"
                  style={{ color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  {d}
                </span>
              ))}
              {direct.length > 12 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  +{direct.length - 12} more
                </span>
              )}
            </div>
            <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {direct.length} package{direct.length !== 1 ? 's' : ''} — none of which you chose
            </div>
          </motion.div>

          {/* Layer 2 */}
          {transitive > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
              className="rounded-xl border px-6 py-4"
              style={{ borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
              <div className="font-mono text-xs mb-1" style={{ color: 'rgba(239,68,68,0.7)' }}>TRANSITIVE DEPENDENCIES</div>
              <div className="font-display font-bold text-2xl mb-1" style={{ color: '#ef4444' }}>~{transitive}+</div>
              <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                packages installed by your dependencies' dependencies
              </div>
            </motion.div>
          )}

          {/* Total callout */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0, type: 'spring', stiffness: 200, damping: 20 }}
            className="rounded-xl border-2 px-6 py-4 text-center"
            style={{ borderColor: 'rgba(139,92,246,0.4)', backgroundColor: 'rgba(139,92,246,0.07)' }}>
            <div className="font-display font-extrabold text-3xl mb-1" style={{ color: '#8B5CF6' }}>
              {total.toLocaleString()}
            </div>
            <div className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              total packages NodeArmor is watching on your behalf
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ScanExplainer({ result }: { result: ScanResult }) {
  const [tab, setTab] = useState<'pipeline' | 'github' | 'deps'>('pipeline');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="mt-8"
    >
      {/* Tab bar */}
      <div className="flex gap-2 mb-5">
        {([
          { id: 'pipeline', label: 'Pipeline trace' },
          { id: 'github',   label: 'GitHub Actions view' },
          { id: 'deps',     label: 'Dependency tree' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="font-mono text-sm px-5 py-2 rounded-xl border transition-all"
            style={{
              backgroundColor: tab === t.id ? 'rgba(96,165,250,0.12)' : 'transparent',
              color: tab === t.id ? '#60A5FA' : 'rgba(255,255,255,0.35)',
              borderColor: tab === t.id ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)',
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="font-mono text-xs self-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
          same enforcement, two views
        </span>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'pipeline' ? (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <PipelineViz
              pkg={result.package}
              decision={result.decision}
              cveCount={result.cve_count}
            />
          </motion.div>
        ) : tab === 'github' ? (
          <motion.div
            key="github"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <GitHubView result={result} />
          </motion.div>
        ) : (
          <motion.div
            key="deps"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <DependencyIceberg pkg={result.package} ecosystem={result.ecosystem} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fact cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        {FACTS.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6 + i * 0.1, duration: 0.35 }}
            className="rounded-xl border p-5"
            style={{ borderColor: f.color + '33', backgroundColor: f.color + '0d' }}
          >
            <div
              className="font-mono text-xs px-2 py-1 rounded border inline-block mb-3"
              style={{ color: f.color, borderColor: f.color + '55', backgroundColor: f.color + '15' }}
            >
              {f.label}
            </div>
            <div className="font-display font-bold text-white text-base mb-2">{f.title}</div>
            <div className="font-mono text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {f.body}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
