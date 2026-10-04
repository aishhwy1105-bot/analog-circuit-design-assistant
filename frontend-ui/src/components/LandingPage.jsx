import { useState } from 'react';

const PRESETS = [
  {
    id: 'buck',
    title: '⚡ 12V→5V Buck (2A)',
    prompt: 'Design a 12V to 5V synchronous buck converter at 2A load with 500kHz switching frequency and low output ripple',
    target: '5.0 V',
    ripple: '11.9 mV',
    efficiency: '94.2%',
    drc: 'PASS',
    topology: 'Buck Converter',
    sparkline: 'M 0 55 C 15 50, 25 15, 45 28 C 65 36, 80 20, 100 24 C 120 27, 140 23, 160 25 C 180 26, 200 24, 220 25 L 220 25'
  },
  {
    id: 'boost',
    title: '🚀 5V→12V Boost (1.5A)',
    prompt: 'Design a 5V to 12V boost converter with 1.5A output current, high efficiency, and Schottky freewheeling diode',
    target: '12.0 V',
    ripple: '24.5 mV',
    efficiency: '91.8%',
    drc: 'PASS',
    topology: 'Boost Converter',
    sparkline: 'M 0 58 C 20 54, 30 10, 50 32 C 70 40, 85 18, 110 26 C 130 30, 150 22, 175 25 C 195 27, 210 24, 220 25 L 220 25'
  },
  {
    id: 'opamp',
    title: '🎯 Precision Op-Amp (Gain 5x)',
    prompt: 'Design an inverting op-amp circuit with voltage gain of 5x, 10k input impedance, and dual 15V supply rails',
    target: 'Gain: -5.0x',
    ripple: '0.2 mV',
    efficiency: '98.5%',
    drc: 'PASS',
    topology: 'Inverting Amplifier',
    sparkline: 'M 0 50 C 20 45, 30 20, 45 25 C 60 28, 80 24, 100 25 C 130 25, 160 25, 190 25 C 205 25, 215 25, 220 25 L 220 25'
  }
];

export default function LandingPage({ onLaunchWorkspace, onOpenLogin, user, onLogout }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [promptText, setPromptText] = useState(PRESETS[0].prompt);
  const [activeSection, setActiveSection] = useState('home');

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setPromptText(preset.prompt);
  };

  const handleSynthesizeClick = (e) => {
    e.preventDefault();
    if (onLaunchWorkspace) {
      onLaunchWorkspace(promptText.trim() || selectedPreset.prompt);
    }
  };

  return (
    <div className="landing-container">
      {/* 1. Header & Navigation */}
      <header className="landing-navbar">
        <div className="landing-brand-wrap">
          <div className="landing-brand-logo">
            <span className="brand-bolt-icon">⚡</span>
            <span className="brand-name">AnalogPilot</span>
          </div>
          <span className="brand-tag-badge">v1.0</span>
        </div>

        <nav className="landing-nav-links">
          <a href="#features" onClick={() => setActiveSection('features')} className={activeSection === 'features' ? 'active' : ''}>Features</a>
          <a href="#topologies" onClick={() => setActiveSection('topologies')} className={activeSection === 'topologies' ? 'active' : ''}>Topologies</a>
          <a href="#architecture" onClick={() => setActiveSection('architecture')} className={activeSection === 'architecture' ? 'active' : ''}>Architecture</a>
          <a href="#docs" onClick={() => setActiveSection('docs')} className={activeSection === 'docs' ? 'active' : ''}>Documentation</a>
        </nav>

        <div className="landing-auth-actions">
          {user ? (
            <div className="user-profile-badge">
              <span className="user-dot" />
              <span className="user-email">{user.email || user.name}</span>
              <button className="nav-logout-btn" onClick={onLogout} title="Sign Out">Sign Out</button>
            </div>
          ) : (
            <button className="nav-login-btn" onClick={onOpenLogin}>
              Log In
            </button>
          )}
          <button className="nav-launch-btn" onClick={() => onLaunchWorkspace(promptText)}>
            Launch Workspace ➔
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero">
        <div className="hero-announcement-chip">
          <span className="chip-spark">✦</span>
          <span>Trusted by Hardware Designers & EDA Researchers</span>
        </div>

        <h1 className="hero-headline">
          Next-Gen Analog Circuit Design <br />
          <span className="hero-headline-sub">with Real-Time SPICE</span>
        </h1>

        <p className="hero-subtitle">
          Translate natural language hardware specifications into verified vector schematics,
          transient waveforms, and live Mouser BOMs in seconds.
        </p>

        {/* 3. Interactive Solvely-Style Playground Card */}
        <div className="playground-card">
          {/* Left Panel: Prompt Input & Presets */}
          <div className="playground-left">
            <div className="playground-header">
              <div className="tab-indicator">
                <span className="dot active" />
                <span className="playground-title">Hardware Specification Input</span>
              </div>
              <span className="ai-engine-tag">Tri-Modal AI (Ask • Plan • Build)</span>
            </div>

            <form onSubmit={handleSynthesizeClick} className="playground-form">
              <textarea
                className="playground-textarea"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g., Design a 12V to 5V synchronous buck converter at 2A with 500kHz switching frequency..."
                rows={3}
              />

              <div className="preset-chips-row">
                <span className="preset-label">Quick Presets:</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`preset-chip ${selectedPreset.id === p.id ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(p)}
                  >
                    {p.title}
                  </button>
                ))}
              </div>

              <div className="playground-actions">
                <button type="submit" className="playground-submit-btn">
                  <span>⚡ Synthesize & Launch Workspace ➔</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Panel: Live Architectural Telemetry Preview */}
          <div className="playground-right">
            <div className="telemetry-preview-header">
              <div className="telemetry-badge">
                <span className="pulse-dot" />
                <span>Active SPICE Simulation Engine</span>
              </div>
              <span className="topology-badge">{selectedPreset.topology}</span>
            </div>

            {/* Sparkline Waveform Display */}
            <div className="sparkline-wrapper">
              <div className="sparkline-label-group">
                <span className="spark-trace-tag">Vout(t) Transient Response</span>
                <span className="spark-steady-tag">Target: {selectedPreset.target}</span>
              </div>
              <svg viewBox="0 0 220 60" className="sparkline-svg" preserveAspectRatio="none">
                <line x1="0" y1="25" x2="220" y2="25" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="50" x2="220" y2="50" stroke="#18181b" strokeWidth="1" />
                <path
                  d={selectedPreset.sparkline}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Metric Readout Cards */}
            <div className="telemetry-metrics-grid">
              <div className="telemetry-box">
                <span className="t-label">Target Output</span>
                <strong className="t-val cyan">{selectedPreset.target}</strong>
              </div>
              <div className="telemetry-box">
                <span className="t-label">Output Ripple</span>
                <strong className="t-val amber">{selectedPreset.ripple}</strong>
              </div>
              <div className="telemetry-box">
                <span className="t-label">Efficiency</span>
                <strong className="t-val green">{selectedPreset.efficiency}</strong>
              </div>
              <div className="telemetry-box">
                <span className="t-label">DRC Rules</span>
                <strong className="t-val pass">{selectedPreset.drc}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Feature Pillars Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-tag">ENGINEERING CORE</span>
          <h2>Built for Precision Analog & Power Electronics</h2>
          <p>Every design is synthesized with closed-loop engineering constraints, physics-based simulations, and live component sourcing.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-box">🧠</div>
            <h3>Tri-Modal AI Engine</h3>
            <p>Switch seamlessly between <strong>Ask</strong> (design advisory), <strong>Plan</strong> (3-tier tradeoff matrix), and <strong>Build</strong> (instant vector schematic synthesis).</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">⚡</div>
            <h3>Dynamic Vector Schematics</h3>
            <p>Manhattan auto-routing for Buck, Boost, and Op-Amp topologies with live component values, terminal tags, and ground buses.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">📈</div>
            <h3>Headless SPICE Simulation</h3>
            <p>Integrated transient circuit solver generating real oscilloscope traces (Vout, IL, Vsw) with settling time and phase margin analysis.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">📦</div>
            <h3>Live Mouser Sourcing</h3>
            <p>Real-time distributor BOM enrichment with verified manufacturer part numbers, stock availability, and 3-tier pricing.</p>
          </div>
        </div>
      </section>

      {/* 5. Supported Topologies Showcase */}
      <section id="topologies" className="topologies-section">
        <div className="section-header">
          <span className="section-tag">TOPOLOGY SUPPORT</span>
          <h2>Supported Power & Signal Topologies</h2>
        </div>

        <div className="topologies-grid">
          <div className="topology-card">
            <div className="topo-badge">DC-DC STEP-DOWN</div>
            <h3>Synchronous Buck Converter</h3>
            <p>High-efficiency step-down conversion with active synchronous rectification, LC output filtering, and sub-15mV ripple.</p>
            <ul className="topo-specs">
              <li>• Typical Efficiency: 92% – 96%</li>
              <li>• Switching Range: 200 kHz – 2 MHz</li>
              <li>• Automotive & High-Rel qualified tiers</li>
            </ul>
            <button className="topo-test-btn" onClick={() => onLaunchWorkspace(PRESETS[0].prompt)}>
              Test Buck Converter ➔
            </button>
          </div>

          <div className="topology-card">
            <div className="topo-badge">DC-DC STEP-UP</div>
            <h3>Boost Converter</h3>
            <p>Energy-storage inductor topology with low-side power MOSFET switching and fast Schottky freewheeling diode.</p>
            <ul className="topo-specs">
              <li>• Typical Efficiency: 89% – 94%</li>
              <li>• Peak Current Handling: up to 5A</li>
              <li>• Duty Cycle Range: 0.1 – 0.85</li>
            </ul>
            <button className="topo-test-btn" onClick={() => onLaunchWorkspace(PRESETS[1].prompt)}>
              Test Boost Converter ➔
            </button>
          </div>

          <div className="topology-card">
            <div className="topo-badge">PRECISION SIGNAL</div>
            <h3>Inverting Operational Amplifier</h3>
            <p>Low-noise closed-loop feedback amplifier with matched metal film resistors and dual balanced voltage rails.</p>
            <ul className="topo-specs">
              <li>• Gain Configuration: -1x to -100x</li>
              <li>• Input Impedance: 1kΩ – 100kΩ</li>
              <li>• Low Distortion & High PSRR</li>
            </ul>
            <button className="topo-test-btn" onClick={() => onLaunchWorkspace(PRESETS[2].prompt)}>
              Test Inverting Op-Amp ➔
            </button>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer id="docs" className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="brand-bolt-icon">⚡</span>
            <span className="brand-name">AnalogPilot</span>
            <p>Autonomous Analog & Power Electronics Design Assistant</p>
          </div>
          <div className="footer-tech-stack">
            <span className="tech-chip">React 18</span>
            <span className="tech-chip">Vite</span>
            <span className="tech-chip">Node.js Express</span>
            <span className="tech-chip">SPICE Solver</span>
            <span className="tech-chip">Mouser Sourcing API</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} AnalogPilot EDA. All rights reserved.</span>
          <div className="footer-links">
            <button className="footer-link-btn" onClick={() => onLaunchWorkspace(promptText)}>Launch Workspace</button>
            <a href="#features" className="footer-link-btn">Architecture</a>
            <a href="https://www.mouser.com" target="_blank" rel="noopener noreferrer" className="footer-link-btn">Mouser API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
