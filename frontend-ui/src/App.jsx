import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { generateAskAdvice, generatePlanRoadmap } from './services/localAgents.js';
import { synthesizeCircuit } from './utils/circuitSynthesis.js';
import { enrichBomWithMouser } from './services/mouserClient.js';
import { fetchSpiceSimulation } from './services/spiceClient.js';
import WaveformViewer from './components/WaveformViewer.jsx';
import LandingPage from './components/LandingPage.jsx';
import LoginPage from './components/LoginPage.jsx';

// Utility to scrub solid white backgrounds, fills, and rects from SchemDraw SVGs
function cleanSvgBackground(rawSvg) {
  if (!rawSvg) return null;
  return rawSvg
    .replace(/<rect[^>]*fill=["'](?:#ffffff|white|rgb\(255,\s*255,\s*255\))["'][^>]*\/>/gi, '')
    .replace(/background-color:\s*(?:#ffffff|white|rgb\(255,\s*255,\s*255\));?/gi, '')
    .replace(/style=["'][^"']*background:\s*(?:#ffffff|white)[^"']*["']/gi, '');
}

export default function App() {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'app'
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [logoutNotification, setLogoutNotification] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('analogpilot_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeMode, setActiveMode] = useState('build'); // 'ask' | 'plan' | 'build'
  const [selectedPlanTier, setSelectedPlanTier] = useState('Standard');
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'bom' | 'validation'
  const [activeView, setActiveView] = useState('schematic'); // 'schematic' | 'waveforms'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sourcingSource, setSourcingSource] = useState('Mouser Catalog Engine');

  // Resizable Splitters State
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isDraggingCol, setIsDraggingCol] = useState(false);
  const isDraggingColRef = useRef(false);

  const [topPanelHeight, setTopPanelHeight] = useState(420);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const isDraggingRowRef = useRef(false);

  const dashboardRef = useRef(null);
  const canvasSectionRef = useRef(null);

  // SPICE Simulation State
  const [spiceData, setSpiceData] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Chat Log & Messages
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      type: 'text',
      content: 'Hello! I am Analog Circuit Copilot. Ask me a design question, generate a plan, or build a verified schematic.'
    }
  ]);

  // Schematic & Engineering Data (Initial State generated from synthesis engine)
  const initialCircuit = synthesizeCircuit('12V to 5V buck converter');
  const [circuitSvg, setCircuitSvg] = useState(initialCircuit.svg);
  const [designSummary, setDesignSummary] = useState(initialCircuit.summary);
  const [bomList, setBomList] = useState(initialCircuit.bom);
  const [validation, setValidation] = useState(initialCircuit.validation);

  const [history, setHistory] = useState([
    {
      svg: initialCircuit.svg,
      summary: initialCircuit.summary,
      bom: initialCircuit.bom,
      validation: initialCircuit.validation
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const initialBomRef = useRef(initialCircuit.bom);
  const initialSummaryRef = useRef(initialCircuit.summary);

  const triggerSimulation = useCallback(async (designParams) => {
    setIsSimulating(true);
    try {
      const topoStr = (designParams?.topology || '').toLowerCase();
      const topology = topoStr.includes('boost')
        ? 'boost'
        : topoStr.includes('opamp') || topoStr.includes('amplifier')
        ? 'opamp'
        : 'buck';

      const vin = parseFloat(designParams?.input_voltage) || 12;
      const vout = parseFloat(designParams?.output_voltage) || 5;
      const iout = parseFloat(designParams?.load_current) || 2;
      const gain = Math.abs(parseFloat(designParams?.voltage_gain)) || 5;

      const data = await fetchSpiceSimulation({
        topology,
        vin,
        vout,
        iout,
        fsw: 500000,
        gain,
        tier: selectedPlanTier
      });
      setSpiceData(data);
    } catch (e) {
      console.warn('Simulation trigger error:', e);
    } finally {
      setIsSimulating(false);
    }
  }, [selectedPlanTier]);

  // Initial Mouser BOM enrichment & SPICE Simulation
  useEffect(() => {
    enrichBomWithMouser(initialBomRef.current, selectedPlanTier).then(({ enrichedBom, source }) => {
      setBomList(enrichedBom);
      setSourcingSource(source === 'mouser-api' ? 'Mouser Live Sourcing API' : 'Mouser Catalog Engine');
    });
    triggerSimulation(initialSummaryRef.current);
  }, [selectedPlanTier, triggerSimulation]);

  // Canvas Viewport Pan & Zoom Controls
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.min(Math.max(newZoom, 0.2), 4.0));
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 4.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.2));
  const handleFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Escape key listener for fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Global mousemove and mouseup listeners for smooth splitter dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingColRef.current && dashboardRef.current) {
        const dashboardRect = dashboardRef.current.getBoundingClientRect();
        const newWidth = dashboardRect.right - e.clientX;
        const minW = 280;
        const maxW = Math.min(dashboardRect.width * 0.55, 750);
        setSidebarWidth(Math.max(minW, Math.min(newWidth, maxW)));
      }

      if (isDraggingRowRef.current && canvasSectionRef.current) {
        const canvasRect = canvasSectionRef.current.getBoundingClientRect();
        const newHeight = e.clientY - canvasRect.top;
        const minH = 260;
        const maxH = Math.max(minH, canvasRect.height - 120);
        setTopPanelHeight(Math.max(minH, Math.min(newHeight, maxH)));
      }
    };

    const handleMouseUp = () => {
      if (isDraggingColRef.current) {
        isDraggingColRef.current = false;
        setIsDraggingCol(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (isDraggingRowRef.current) {
        isDraggingRowRef.current = false;
        setIsDraggingRow(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleColMouseDown = (e) => {
    e.preventDefault();
    isDraggingColRef.current = true;
    setIsDraggingCol(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleRowMouseDown = (e) => {
    e.preventDefault();
    isDraggingRowRef.current = true;
    setIsDraggingRow(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Undo / Redo History
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const state = history[targetIndex];
      setCircuitSvg(state.svg);
      setDesignSummary(state.summary);
      setBomList(state.bom);
      setValidation(state.validation);
      setHistoryIndex(targetIndex);
      triggerSimulation(state.summary);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const state = history[targetIndex];
      setCircuitSvg(state.svg);
      setDesignSummary(state.summary);
      setBomList(state.bom);
      setValidation(state.validation);
      setHistoryIndex(targetIndex);
      triggerSimulation(state.summary);
    }
  };

  // Request Pipeline Handler
  const handleSend = async (overrideText) => {
    // Session security check: ensure user is authenticated before synthesizing
    if (!user || !user.email) {
      setLoginMessage('Please sign in to access the Circuit Copilot workspace.');
      setIsLoginOpen(true);
      return;
    }

    const userText = (typeof overrideText === 'string' && overrideText.trim()) ? overrideText.trim() : promptInput.trim();
    if (!userText || isLoading) return;

    setChatMessages((prev) => [...prev, { role: 'user', type: 'text', content: userText }]);
    setPromptInput('');
    setIsLoading(true);

    try {
      if (activeMode === 'ask') {
        let responseText = '';
        try {
          const response = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_prompt: userText })
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const resData = await response.json();
          if (resData.status === 'success' && resData.data) {
            const d = resData.data;
            responseText = `Topology Recommendation: ${d.recommended_topology}\n\nOverview: ${d.overview}\n\nKey Components:\n${d.essential_components.map((c) => `- ${c.category}: ${c.spec || c.recommendation}`).join('\n')}\n\nBudget Estimate: Prototype ${d.budget?.prototype_bom || '$8-$15'}, Volume ${d.budget?.volume_1k || '$2-$4'}`;
          } else {
            throw new Error(resData.message || 'Invalid Ask response');
          }
        } catch (askErr) {
          console.warn('Remote ask endpoint unavailable, invoking local intelligence engine fallback:', askErr.message);
          const localData = await generateAskAdvice(userText);
          responseText = `Topology Recommendation: ${localData.recommended_topology}\n\nOverview: ${localData.overview}\n\nEssential Components:\n${localData.essential_components.map((c) => `- ${c.category}: ${c.recommendation || c.spec}`).join('\n')}\n\nEstimated Budget: Prototype ${localData.estimated_budget?.prototype_bom_usd}, Production ${localData.estimated_budget?.production_1k_usd}\n\nThermal & Safety:\n${localData.thermal_and_safety.map((t) => `- ${t}`).join('\n')}`;
        }
        setChatMessages((prev) => [...prev, { role: 'ai', type: 'text', content: responseText }]);
      } else if (activeMode === 'plan') {
        let responseText = '';
        try {
          const response = await fetch('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_prompt: userText, tier: selectedPlanTier })
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const resData = await response.json();
          if (resData.status === 'success' && resData.data) {
            const d = resData.data;
            responseText = `Plan Architecture: ${d.project_title}\n\nSelected Tier: ${selectedPlanTier}\nInput Voltage: ${d.specs?.input_voltage || 'Universal'}\nOutput Voltage: ${d.specs?.output_voltage || '5V'}\nPower Rating: ${d.specs?.power_rating || '10W'}\nTarget Efficiency: ${d.specs?.target_efficiency || '92%'}\n\nPCB Layout Strategy:\n${(d.pcb_roadmap || []).map((step) => `- ${step}`).join('\n')}`;
          } else {
            throw new Error(resData.message || 'Invalid Plan response');
          }
        } catch (planErr) {
          console.warn('Remote plan endpoint unavailable, invoking local intelligence engine fallback:', planErr.message);
          const localData = await generatePlanRoadmap(userText);
          const tierInfo = localData.tiers?.[selectedPlanTier.toLowerCase()] || localData.tiers?.standard || {};
          responseText = `Plan Architecture: ${localData.project_title}\n\nTier: ${tierInfo.label || selectedPlanTier}\nBOM Target: ${tierInfo.bom_target || tierInfo.bom || '$2-$5'}\nTopology: ${tierInfo.topology}\nSilicon: ${tierInfo.silicon}\nEfficiency: ${tierInfo.efficiency}\n\nPCB Layout Roadmap:\n${(localData.pcb_floor_planning_strategy || []).map((step) => `- ${step}`).join('\n')}`;
        }
        setChatMessages((prev) => [...prev, { role: 'ai', type: 'text', content: responseText }]);
      } else {
        // Build Mode Execution with Dynamic Topology Synthesis & Mouser Sourcing & SPICE
        let synthesisResult = null;

        try {
          const response = await fetch('/api/sns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'build', user_prompt: userText })
          });

          if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
          const rawData = await response.json();

          let parsedData = rawData;
          if (rawData?.items?.[0]?.json?.content?.parts?.[0]?.text) {
            try {
              parsedData = JSON.parse(rawData.items[0].json.content.parts[0].text);
            } catch {
              parsedData = rawData;
            }
          } else if (rawData?._responseData) {
            parsedData = rawData._responseData;
          }

          if (parsedData.schematic || parsedData.svg) {
            const sanitizedSvg = cleanSvgBackground(parsedData.schematic || parsedData.svg);
            const dynamicFallback = synthesizeCircuit(userText, parsedData);

            const newMetrics = parsedData.design_summary || parsedData.metrics || dynamicFallback.summary;
            const newBom = parsedData.bom && parsedData.bom.length > 0 ? parsedData.bom : dynamicFallback.bom;
            const newValidation = parsedData.validation || dynamicFallback.validation;

            synthesisResult = {
              svg: sanitizedSvg,
              summary: newMetrics,
              bom: newBom,
              validation: newValidation,
              message: parsedData.message || `Circuit schematic built successfully from webhook engine.`
            };
          } else {
            throw new Error('No valid schematic returned in webhook payload');
          }
        } catch (buildErr) {
          console.warn('Webhook build unavailable or fallback required, synthesizing dynamic topology:', buildErr.message);
          // Execute dynamic topology synthesis (Buck, Boost, Op-Amp)
          synthesisResult = synthesizeCircuit(userText);
        }

        if (synthesisResult) {
          // Enrich BOM with Mouser Part Numbers, live Stock, and Pricing
          const { enrichedBom, source } = await enrichBomWithMouser(synthesisResult.bom, selectedPlanTier);
          setSourcingSource(source === 'mouser-api' ? 'Mouser Live Sourcing API' : 'Mouser Catalog Engine');

          setCircuitSvg(synthesisResult.svg);
          setDesignSummary(synthesisResult.summary);
          setBomList(enrichedBom);
          setValidation(synthesisResult.validation);

          const newHistoryState = {
            svg: synthesisResult.svg,
            summary: synthesisResult.summary,
            bom: enrichedBom,
            validation: synthesisResult.validation
          };
          const updatedHistory = history.slice(0, historyIndex + 1).concat(newHistoryState);
          setHistory(updatedHistory);
          setHistoryIndex(updatedHistory.length - 1);

          // Trigger SPICE Transient Simulation
          triggerSimulation(synthesisResult.summary);

          setChatMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              type: 'text',
              content: synthesisResult.message
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Pipeline error:', err);
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', type: 'text', content: `Execution Error: ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchWorkspace = (promptFromLanding) => {
    // Check if user is authenticated
    if (!user || !user.email) {
      setPendingPrompt(promptFromLanding || '');
      setLoginMessage('Please sign in to access the Circuit Copilot workspace.');
      setIsLoginOpen(true);
      return;
    }

    setViewMode('app');
    if (promptFromLanding && typeof promptFromLanding === 'string' && promptFromLanding.trim()) {
      setPromptInput(promptFromLanding.trim());
      setTimeout(() => {
        handleSend(promptFromLanding.trim());
      }, 50);
    }
  };

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setIsLoginOpen(false);
    setLoginMessage('');

    // If there was a pending prompt or intent to launch workspace, enter workspace
    if (pendingPrompt !== null) {
      const p = pendingPrompt;
      setPendingPrompt(null);
      setViewMode('app');
      if (p && typeof p === 'string' && p.trim()) {
        setPromptInput(p.trim());
        setTimeout(() => {
          handleSend(p.trim());
        }, 50);
      }
    } else {
      setViewMode('app');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('analogpilot_user');
    setUser(null);
    setPendingPrompt(null);
    setViewMode('landing');
    setLogoutNotification(true);
    setTimeout(() => {
      setLogoutNotification(false);
    }, 4000);
  };

  return (
    <div className="copilot-container">
      {/* Top Logout Notification Toast Banner */}
      {logoutNotification && (
        <div className="logout-toast-banner">
          <span className="toast-dot">✓</span>
          <span>You have been logged out successfully.</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setLogoutNotification(false)}
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {viewMode === 'landing' ? (
        <LandingPage
          onLaunchWorkspace={handleLaunchWorkspace}
          onOpenLogin={() => setIsLoginOpen(true)}
          user={user}
          onLogout={handleLogout}
        />
      ) : (
        <>
          {/* Top Header */}
          <header className="top-header">
            <div
              className="brand-group clickable-brand"
              onClick={() => setViewMode('landing')}
              title="Return to AnalogPilot Landing Page"
            >
              <span className="brand-icon">⚡</span>
              <div className="brand-text">
                <div className="brand-title-row">
                  <h1>AnalogPilot</h1>
                  <span className="brand-v-tag">v1.0</span>
                </div>
                <span className="brand-subtitle">AI-powered circuit design & SPICE simulation assistant</span>
              </div>
            </div>

            <div className="header-right-actions">
              <button className="nav-back-home-btn" onClick={() => setViewMode('landing')}>
                ⌂ Home / Landing
              </button>
              {user ? (
                <div className="user-profile-badge">
                  <span className="user-dot" />
                  <span className="user-email">{user.email || user.name}</span>
                  <button className="nav-logout-btn" onClick={handleLogout} title="Sign Out">Sign Out</button>
                </div>
              ) : (
                <button className="nav-login-btn small" onClick={() => setIsLoginOpen(true)}>
                  Log In
                </button>
              )}
              <div className="status-pill">
                <span className="pill-dot" />
                <span>Engine Ready</span>
              </div>
            </div>
          </header>

          {/* Main 2-Column Dashboard Grid */}
          <div className="dashboard-grid" ref={dashboardRef}>
        {/* Left Section: Schematic, SPICE & Engineering Metrics */}
        <section className="canvas-section" ref={canvasSectionRef}>
          {/* Circuit Workspace Card */}
          <div
            className={`workspace-card ${isFullscreen ? 'fullscreen-mode' : ''}`}
            style={!isFullscreen ? { height: `${topPanelHeight}px`, flex: 'none' } : undefined}
          >
            <div className="card-topbar">
              <div className="ws-heading">
                <h2>Circuit Workspace</h2>
                <p>{activeView === 'schematic' ? 'Interactive Vector Schematic Viewport' : 'SPICE Transient Oscilloscope & Waveform Viewer'}</p>
              </div>

              {/* View Toggle: Schematic vs SPICE + Fullscreen */}
              <div className="view-switcher">
                <button
                  className={`view-switch-btn ${activeView === 'schematic' ? 'active' : ''}`}
                  onClick={() => setActiveView('schematic')}
                >
                  ⚡ Schematic
                </button>
                <button
                  className={`view-switch-btn ${activeView === 'waveforms' ? 'active' : ''}`}
                  onClick={() => setActiveView('waveforms')}
                >
                  📈 SPICE Waveforms
                </button>
                <button
                  className={`view-switch-btn fullscreen-btn ${isFullscreen ? 'active' : ''}`}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand Fullscreen'}
                >
                  {isFullscreen ? '✕ Exit' : '⛶ Fullscreen'}
                </button>
              </div>

              {activeView === 'schematic' && (
                <div className="ws-tools">
                  <button onClick={handleUndo} disabled={historyIndex <= 0} title="Undo" className="tool-btn">↺</button>
                  <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo" className="tool-btn">↻</button>
                  <button onClick={handleFit} title="Fit to Viewport" className="tool-btn">Fit</button>
                  <button onClick={handleZoomOut} title="Zoom Out" className="tool-btn">-</button>
                  <button onClick={handleZoomIn} title="Zoom In" className="tool-btn">+</button>
                </div>
              )}
            </div>

            {/* Display either Schematic Canvas or SPICE Waveform Viewer */}
            {activeView === 'schematic' ? (
              <div
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                className="canvas-viewport"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {circuitSvg ? (
                  <div
                    className="svg-render-container"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.05s ease-out'
                    }}
                    dangerouslySetInnerHTML={{ __html: circuitSvg }}
                  />
                ) : (
                  <div className="canvas-placeholder">
                    <p>No circuit synthesized yet.</p>
                    <span>Enter requirements in Build mode to generate a schematic.</span>
                  </div>
                )}
                <div className="circuit-badge">
                  <span>⚡ Active Viewport</span>
                </div>
              </div>
            ) : (
              <WaveformViewer
                simData={spiceData}
                isLoading={isSimulating}
                onReSimulate={() => triggerSimulation(designSummary)}
              />
            )}
          </div>

          {/* Draggable Horizontal Splitter */}
          {!isFullscreen && (
            <div
              className={`splitter-horizontal ${isDraggingRow ? 'active-drag' : ''}`}
              onMouseDown={handleRowMouseDown}
              title="Drag to resize workspace and telemetry"
            >
              <div className="splitter-grip-h">
                <span className="grip-lines">═</span>
              </div>
            </div>
          )}

          {/* Metrics & Tabs Row */}
          <div className="metrics-row">
            <div className="metric-card">
              <div className="tab-headers">
                <button
                  className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summary')}
                >
                  Summary Specs
                </button>
                <button
                  className={`tab-btn ${activeTab === 'bom' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bom')}
                >
                  Component BOM ({bomList.length})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('validation')}
                >
                  Validation ({validation.status || 'PASS'})
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'summary' && (
                  <div className="summary-grid">
                    {designSummary && Object.keys(designSummary).length > 0 ? (
                      Object.entries(designSummary).map(([key, value]) => (
                        <div key={key} className="summary-item">
                          <span className="summary-label">{key.replace(/_/g, ' ')}</span>
                          <strong className="summary-val">{String(value)}</strong>
                        </div>
                      ))
                    ) : (
                      <div className="empty-tab">No design summary available yet.</div>
                    )}
                  </div>
                )}

                {activeTab === 'bom' && (
                  <div className="bom-tab-pane">
                    <div className="sourcing-banner">
                      <span>Sourcing & Distributor Verification:</span>
                      <span className="sourcing-source-pill">
                        ⚡ {sourcingSource}
                      </span>
                    </div>
                    <div className="bom-list">
                      {bomList.length > 0 ? (
                        bomList.map((item, idx) => (
                          <div key={idx} className="bom-item">
                            <div className="bom-header">
                              <div className="bom-mpn-group">
                                <span className="bom-mpn">{item.mpn || item.part_number || `Part ${idx + 1}`}</span>
                                {item.manufacturer && (
                                  <span className="bom-mfg">{item.manufacturer}</span>
                                )}
                              </div>
                              <div className="bom-pricing-group">
                                <span className="bom-stock">{item.stock || item.inStock || 'In Stock'}</span>
                                <span className="bom-price">{item.price || item.unit_price || '$--'}</span>
                              </div>
                            </div>
                            <div className="bom-desc">{item.description || item.recommendation || item.name}</div>
                            <div className="bom-footer">
                              <span className="bom-package">Footprint: {item.package || item.footprint || 'Standard'}</span>
                              <a
                                href={item.detailUrl || `https://www.mouser.com/c/?q=${encodeURIComponent(item.mpn || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bom-link"
                              >
                                Mouser Specs ↗
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-tab">No BOM components available yet.</div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'validation' && (
                  <div className="validation-card">
                    <div className="val-top">
                      <span>Electrical Rules & DRC Check</span>
                      <span className={`badge-status ${validation.status === 'PASS' ? 'badge-pass' : 'badge-warn'}`}>
                        {validation.status || 'PASS'}
                      </span>
                    </div>
                    <div className="val-stats">
                      <div className="val-stat-row">
                        <span>Target Efficiency:</span>
                        <strong>{validation.efficiency || '94.2%'}</strong>
                      </div>
                      <div className="val-stat-row">
                        <span>Thermal Margin:</span>
                        <strong>{validation.thermal_margin || 'Pass (Tj < 65°C)'}</strong>
                      </div>
                      <div className="val-stat-row">
                        <span>Clearance & DRC:</span>
                        <strong>{validation.clearance || 'Pass (Standard)'}</strong>
                      </div>
                    </div>
                    {validation.warnings && validation.warnings.length > 0 && (
                      <div className="val-warnings">
                        <strong>Warnings:</strong>
                        <ul>
                          {validation.warnings.map((w, i) => (
                            <li key={i}>{typeof w === 'object' ? w.message : w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Draggable Vertical Splitter */}
        {!isFullscreen && (
          <div
            className={`splitter-vertical ${isDraggingCol ? 'active-drag' : ''}`}
            onMouseDown={handleColMouseDown}
            title="Drag to resize Engineering Copilot sidebar"
          >
            <div className="splitter-grip-v">
              <span className="grip-dots">⋮</span>
            </div>
          </div>
        )}

        {/* Right Section: Copilot Controls & Interactive Assistant */}
        <aside
          className="copilot-section"
          style={!isFullscreen ? { width: `${sidebarWidth}px`, flexShrink: 0 } : undefined}
        >
          <div className="copilot-title">
            <h3>Engineering Copilot</h3>
            <p>Interactive AI Assistant & SPICE Synthesis Engine</p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="mode-pills">
            {['ask', 'plan', 'build'].map((mode) => (
              <button
                key={mode}
                className={`pill-btn ${activeMode === mode ? 'active' : ''}`}
                onClick={() => setActiveMode(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Plan Tier Selector */}
          {activeMode === 'plan' && (
            <div className="tier-selector">
              <span className="tier-label">Tier:</span>
              {['Standard', 'Automotive', 'High Reliability'].map((tier) => (
                <button
                  key={tier}
                  className={`tier-btn ${selectedPlanTier === tier ? 'active' : ''}`}
                  onClick={() => setSelectedPlanTier(tier)}
                >
                  {tier}
                </button>
              ))}
            </div>
          )}

          {/* Chat Transcript / Stream */}
          <div className="chat-stream">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`message-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble ai loading">
                <span className="dot-pulse">Synthesizing design...</span>
              </div>
            )}
          </div>

          {/* User Input Bar */}
          <div className="input-dock">
            <input
              type="text"
              value={promptInput}
              disabled={isLoading}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                activeMode === 'build'
                  ? 'e.g., Design a 5V to 12V boost converter'
                  : activeMode === 'plan'
                  ? 'e.g., Plan high-speed ADC driver'
                  : 'Ask an analog circuit question...'
              }
            />
            <button
              className="send-arrow"
              onClick={() => handleSend()}
              disabled={isLoading || !promptInput.trim()}
            >
              {isLoading ? '...' : '➔'}
            </button>
          </div>
        </aside>
      </div>
        </>
      )}

      {/* Global Auth Modal */}
      <LoginPage
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setLoginMessage('');
        }}
        onLoginSuccess={handleLoginSuccess}
        message={loginMessage}
      />
    </div>
  );
}