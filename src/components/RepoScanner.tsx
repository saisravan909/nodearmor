import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'https://node-armor-enforcement.replit.app';

interface RepoFinding {
  name: string;
  ecosystem: string;
  cveCount: number;
  blocked: boolean;
  topVuln: string | null;
}

interface RepoResult {
  repo: string;
  repoUrl: string;
  file: string;
  totalPackages: number;
  blockedCount: number;
  cleanCount: number;
  findings: RepoFinding[];
}

const SUGGESTED_REPOS = [
  { label: 'facebook/react', url: 'https://github.com/facebook/react' },
  { label: 'expressjs/express', url: 'https://github.com/expressjs/express' },
  { label: 'vercel/next.js', url: 'https://github.com/vercel/next.js' },
  { label: 'django/django', url: 'https://github.com/django/django' },
  { label: 'pallets/flask', url: 'https://github.com/pallets/flask' },
];

export default function RepoScanner() {
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<RepoResult | null>(null);
  const [error, setError] = useState('');

  const scan = async (repoUrl: string) => {
    if (scanning || !repoUrl.trim()) return;
    setResult(null);
    setError('');
    setScanning(true);

    try {
      const res = await fetch(`${API}/api/repo-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); scan(url); };

  const riskPercent = result
    ? Math.round((result.blockedCount / result.totalPackages) * 100)
    : 0;

  return (
    <section
      className="relative py-24 px-6 overflow-hidden"
      style={{ backgroundColor: '#07101e' }}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #8B5CF6, transparent)' }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="h-px w-12" style={{ backgroundColor: 'rgba(139,92,246,0.4)' }} />
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: '#8B5CF6' }}>
              Live Demo · Call Out Any Repo
            </span>
            <div className="h-px w-12" style={{ backgroundColor: 'rgba(139,92,246,0.4)' }} />
          </div>
          <h2 className="font-display font-extrabold text-4xl md:text-5xl text-white mb-3">
            Scan any{' '}
            <span style={{ color: '#8B5CF6' }}>GitHub repository.</span>
          </h2>
          <p className="font-mono text-sm max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Paste any public GitHub repo URL. NodeArmor fetches its dependency
            file and runs a live CVE scan across every package — no simulation.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-5">
          <div
            className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl border"
            style={{ backgroundColor: '#0b1628', borderColor: 'rgba(139,92,246,0.2)' }}
          >
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/20 px-3"
              disabled={scanning}
              autoComplete="off"
              spellCheck={false}
            />
            <motion.button
              type="submit"
              disabled={scanning || !url.trim()}
              whileHover={!scanning && url.trim() ? { scale: 1.03 } : {}}
              whileTap={!scanning && url.trim() ? { scale: 0.97 } : {}}
              className="font-display font-bold text-sm px-6 py-2.5 rounded-xl transition-all shrink-0"
              style={{
                backgroundColor: scanning ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.15)',
                color: scanning ? 'rgba(139,92,246,0.4)' : '#8B5CF6',
                border: '1px solid rgba(139,92,246,0.3)',
              }}
            >
              {scanning ? 'Scanning…' : 'Scan repo →'}
            </motion.button>
          </div>
        </form>

        {/* Suggested repos */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          <span className="font-mono text-xs self-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Try:
          </span>
          {SUGGESTED_REPOS.map((r) => (
            <motion.button
              key={r.url}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              disabled={scanning}
              onClick={() => { setUrl(r.url); scan(r.url); }}
              className="font-mono text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{ borderColor: 'rgba(139,92,246,0.25)', color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(139,92,246,0.04)' }}
            >
              {r.label}
            </motion.button>
          ))}
        </div>

        {/* Scanning state */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border p-6 mb-6 text-center"
              style={{ backgroundColor: '#0b1628', borderColor: 'rgba(139,92,246,0.15)' }}
            >
              <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="font-mono text-sm"
                style={{ color: '#8B5CF6' }}
              >
                Fetching dependency file from GitHub → Querying OSV database for each package…
              </motion.div>
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
              className="rounded-xl border p-4 mb-6 font-mono text-sm"
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
              key={result.repo}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Summary banner */}
              <div
                className="rounded-2xl border p-6 mb-5"
                style={{
                  backgroundColor: result.blockedCount > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)',
                  borderColor: result.blockedCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                  <div>
                    <div className="font-mono text-xs mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {result.file} · {result.repo}
                    </div>
                    <div
                      className="font-display font-extrabold text-3xl"
                      style={{ color: result.blockedCount > 0 ? '#ef4444' : '#22c55e' }}
                    >
                      {result.blockedCount > 0
                        ? `${result.blockedCount} package${result.blockedCount !== 1 ? 's' : ''} would be blocked`
                        : 'All packages cleared'}
                    </div>
                    <div className="font-mono text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {result.totalPackages} packages scanned from {result.file}
                    </div>
                  </div>

                  {/* Risk gauge */}
                  <div className="text-center shrink-0">
                    <div
                      className="font-mono font-bold text-4xl tabular-nums"
                      style={{ color: riskPercent >= 20 ? '#ef4444' : riskPercent >= 5 ? '#f97316' : '#22c55e' }}
                    >
                      {riskPercent}%
                    </div>
                    <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      risk exposure
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="rounded-xl overflow-hidden h-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${riskPercent}%` }}
                    transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-xl"
                    style={{ backgroundColor: riskPercent >= 20 ? '#ef4444' : riskPercent >= 5 ? '#f97316' : '#22c55e' }}
                  />
                </div>
              </div>

              {/* Package list */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: '#0b1628' }}
              >
                <div
                  className="px-5 py-3 border-b flex items-center justify-between"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {result.blockedCount} blocked · {result.cleanCount} clean
                  </span>
                  <a
                    href={result.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs px-3 py-1 rounded border transition-all"
                    style={{ color: '#8B5CF6', borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.06)' }}
                  >
                    View on GitHub
                  </a>
                </div>

                {/* Blocked packages first */}
                {result.findings
                  .sort((a, b) => (b.blocked ? 1 : 0) - (a.blocked ? 1 : 0))
                  .slice(0, 20)
                  .map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                      className="flex items-center gap-4 px-5 py-3 border-b"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: f.blocked ? '#ef4444' : '#22c55e' }}
                      />
                      <div className="font-mono text-sm font-semibold flex-1 min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {f.name}
                      </div>
                      <div className="font-mono text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {f.ecosystem}
                      </div>
                      {f.blocked ? (
                        <div
                          className="font-mono text-xs px-2 py-0.5 rounded border shrink-0"
                          style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.08)' }}
                        >
                          {f.cveCount} CVE{f.cveCount !== 1 ? 's' : ''}
                        </div>
                      ) : (
                        <div
                          className="font-mono text-xs px-2 py-0.5 rounded border shrink-0"
                          style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.06)' }}
                        >
                          Clean
                        </div>
                      )}
                    </motion.div>
                  ))}

                {result.findings.length > 20 && (
                  <div className="px-5 py-3 font-mono text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Showing top 20 of {result.findings.length} packages
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
