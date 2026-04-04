import { motion } from 'framer-motion';
import AttackCounter from './AttackCounter';
import VulnerabilityClock from './VulnerabilityClock';

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden hex-grid px-6"
      style={{ background: 'linear-gradient(180deg, #0C1C40 0%, #132448 100%)' }}
    >
      {/* Ambient glow top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #60A5FA, transparent)' }}
      />

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-8 inline-flex items-center gap-2 border border-blue-400/30 rounded-full px-4 py-1.5 text-xs font-mono text-blue-300"
        style={{ backgroundColor: 'rgba(96,165,250,0.08)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
        NIST 800-207 · Zero Trust · CI/CD Enforcement
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <img
          src="/logo.png"
          alt="NodeArmor"
          className="w-64 md:w-80 mx-auto"
          style={{ filter: 'drop-shadow(0 0 40px rgba(96,165,250,0.35))' }}
        />
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="font-display font-extrabold text-5xl md:text-7xl tracking-tight text-white mb-4 leading-none"
      >
        Zero Trust.{' '}
        <span style={{ color: '#60A5FA' }}>Every Commit.</span>
      </motion.h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="font-mono text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        NodeArmor blocks compromised packages before they merge, and deceives
        attackers with ghost pipelines — alerting your CISO in real time.
      </motion.p>

      {/* Stats row — includes live attack counter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="flex flex-wrap justify-center gap-10 mb-12"
      >
        {[
          { label: 'Framework', value: 'NIST 800-207' },
          { label: 'Setup time', value: '< 5 minutes' },
          { label: 'License', value: 'Open Source' },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-display font-bold text-xl md:text-2xl text-white">{stat.value}</div>
            <div className="font-mono text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
          </div>
        ))}

        {/* Live counter */}
        <AttackCounter />
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15, duration: 0.6 }}
        className="flex flex-wrap justify-center gap-4"
      >
        <a
          href="#gate-demo"
          className="inline-flex items-center gap-2 font-display font-semibold text-sm px-6 py-3 rounded-lg border transition-all duration-200 hover:scale-105"
          style={{ borderColor: 'rgba(96,165,250,0.35)', color: '#60A5FA', backgroundColor: 'rgba(96,165,250,0.08)' }}
        >
          See it in action
          <ArrowDown />
        </a>
      </motion.div>

      {/* Vulnerability clock */}
      <VulnerabilityClock />

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        style={{ color: 'rgba(255,255,255,0.2)' }}
      >
        <ArrowDown />
      </motion.div>
    </section>
  );
}

function ArrowDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}
