import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INDUSTRIES = [
  { label: 'Healthcare',          baseCost: 9.77, daysToDetect: 214 },
  { label: 'Financial Services',  baseCost: 6.08, daysToDetect: 168 },
  { label: 'Industrial',          baseCost: 5.56, daysToDetect: 190 },
  { label: 'Technology',          baseCost: 4.88, daysToDetect: 189 },
  { label: 'Energy',              baseCost: 4.72, daysToDetect: 206 },
  { label: 'Transportation',      baseCost: 4.18, daysToDetect: 195 },
  { label: 'Retail',              baseCost: 3.48, daysToDetect: 197 },
  { label: 'Government',          baseCost: 2.60, daysToDetect: 193 },
  { label: 'Education',           baseCost: 3.58, daysToDetect: 200 },
];

const SIZES = [
  { label: 'Under 500 employees',   multiplier: 0.38 },
  { label: '500 – 1,000',           multiplier: 0.65 },
  { label: '1,001 – 5,000',         multiplier: 1.00 },
  { label: '5,001 – 10,000',        multiplier: 1.52 },
  { label: 'Over 10,000 employees', multiplier: 2.08 },
];

function fmt(millions: number): string {
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  return `$${(millions * 1000).toFixed(0)}K`;
}

export default function CostCalculator({ pkgName }: { pkgName: string }) {
  const [industry, setIndustry] = useState(0);
  const [size, setSize] = useState(2);
  const [revealed, setRevealed] = useState(false);

  const ind = INDUSTRIES[industry];
  const sz = SIZES[size];
  const breachCost = ind.baseCost * sz.multiplier;
  const nodeArmorCost = 0.05;
  const ratio = Math.round(breachCost / nodeArmorCost);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: '#07101e' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(239,68,68,0.05)' }}
      >
        <div className="font-display font-bold text-xl text-white mb-1">
          What would this breach cost your organization?
        </div>
        <div className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Based on IBM Cost of Data Breach Report 2024 — select your profile
        </div>
      </div>

      <div className="p-6">
        {/* Selectors */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="font-mono text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Industry
            </div>
            <div className="flex flex-col gap-1.5">
              {INDUSTRIES.map((ind, i) => (
                <button
                  key={ind.label}
                  onClick={() => { setIndustry(i); setRevealed(false); }}
                  className="text-left px-4 py-2.5 rounded-lg border font-mono text-sm transition-all"
                  style={{
                    backgroundColor: industry === i ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)',
                    borderColor: industry === i ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)',
                    color: industry === i ? '#ef4444' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Organization size
            </div>
            <div className="flex flex-col gap-1.5">
              {SIZES.map((sz, i) => (
                <button
                  key={sz.label}
                  onClick={() => { setSize(i); setRevealed(false); }}
                  className="text-left px-4 py-2.5 rounded-lg border font-mono text-sm transition-all"
                  style={{
                    backgroundColor: size === i ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)',
                    borderColor: size === i ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)',
                    color: size === i ? '#ef4444' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {sz.label}
                </button>
              ))}
            </div>

            {/* Calculate button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setRevealed(true)}
              className="w-full mt-4 py-3 rounded-xl font-display font-bold text-base transition-all"
              style={{
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.4)',
              }}
            >
              Calculate exposure
            </motion.button>
          </div>
        </div>

        {/* Result reveal */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
              className="rounded-xl border p-6"
              style={{ borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)' }}
            >
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center">
                  <div
                    className="font-mono font-bold text-3xl tabular-nums mb-1"
                    style={{ color: '#ef4444' }}
                  >
                    {fmt(breachCost)}
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    estimated breach cost
                  </div>
                </div>
                <div className="text-center border-x" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="font-mono font-bold text-3xl tabular-nums mb-1"
                    style={{ color: '#f97316' }}
                  >
                    {ind.daysToDetect}
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    avg days to detect
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className="font-mono font-bold text-3xl tabular-nums mb-1"
                    style={{ color: '#22c55e' }}
                  >
                    {ratio}x
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    breach cost vs gate cost
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg px-5 py-3 text-center font-mono text-sm leading-relaxed"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)' }}
              >
                If <span style={{ color: '#60A5FA', fontWeight: 600 }}>{pkgName}</span> had shipped,
                a {INDUSTRIES[industry].label.toLowerCase()} breach at your scale costs
                an estimated <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmt(breachCost)}</span> and
                takes {ind.daysToDetect} days to discover.
                NodeArmor stopped it in under 2 seconds.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
