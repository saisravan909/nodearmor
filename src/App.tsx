import { useEffect, useRef, useState } from 'react';
import Hero from './components/Hero';
import GateDemo, { GateDemoHandle } from './components/GateDemo';
import GhostDemo, { GhostDemoHandle } from './components/GhostDemo';
import StatShock from './components/StatShock';
import ThreatMap from './components/ThreatMap';
import AudienceVote from './components/AudienceVote';
import Footer from './components/Footer';
import CodeSnapshots from './components/CodeSnapshots';
import KeyboardHint from './components/KeyboardHint';
import VotePage from './components/VotePage';
import PackageScan from './components/PackageScan';
import RepoScanner from './components/RepoScanner';
import LiveCI from './components/LiveCI';
import VolunteerPage from './components/VolunteerPage';

export default function App() {
  const path = window.location.pathname;
  if (path === '/vote') return <VotePage />;
  if (path === '/volunteer') return <VolunteerPage />;

  const gateRef = useRef<GateDemoHandle>(null);
  const ghostRef = useRef<GhostDemoHandle>(null);
  const [isPresenting, setIsPresenting] = useState(false);

  const enterPresentation = () => {
    setIsPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const exitPresentation = () => {
    setIsPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case 'f':
          gateRef.current?.trigger('fail');
          break;
        case 'p':
          gateRef.current?.trigger('pass');
          break;
        case 'g':
          ghostRef.current?.trigger();
          document.getElementById('ghost-demo')?.scrollIntoView({ behavior: 'smooth' });
          break;
        case ' ':
          e.preventDefault();
          ghostRef.current?.reveal();
          break;
        case 'r':
          gateRef.current?.trigger('fail');
          ghostRef.current?.reset();
          break;
        case 'escape':
          exitPresentation();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setIsPresenting(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  return (
    <div
      className={isPresenting ? 'presentation-mode' : ''}
      style={{ minHeight: '100vh', backgroundColor: '#0C1C40' }}
    >
      <Hero />
      <StatShock />
      <GateDemo ref={gateRef} />
      <PackageScan />
      <RepoScanner />
      <LiveCI />
      <ThreatMap />
      <GhostDemo ref={ghostRef} />
      <CodeSnapshots />
      <AudienceVote />
      <Footer />

      {/* Presentation mode toggle */}
      <button
        onClick={isPresenting ? exitPresentation : enterPresentation}
        className="fixed top-4 right-4 z-50 font-mono text-xs px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: isPresenting ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
          borderColor: isPresenting ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.12)',
          color: isPresenting ? '#8B5CF6' : 'rgba(255,255,255,0.35)',
        }}
        title={isPresenting ? 'Exit presentation mode (Esc)' : 'Enter presentation / fullscreen mode'}
      >
        {isPresenting ? 'Exit Present' : 'Present'}
      </button>

      <KeyboardHint />
    </div>
  );
}
