import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// Utility to scrub solid white backgrounds, fills, and rects from SchemDraw SVGs
function cleanSvgBackground(rawSvg) {
  if (!rawSvg) return null;
  return rawSvg
    .replace(/<rect[^>]*fill=["'](?:#ffffff|white|rgb\(255,\s*255,\s*255\))["'][^>]*\/>/gi, '')
    .replace(/background-color:\s*(?:#ffffff|white|rgb\(255,\s*255,\s*255\));?/gi, '')
    .replace(/style=["'][^"']*background:\s*(?:#ffffff|white)[^"']*["']/gi, '');
}

export default function App() {
  // Navigation & Mode
  const [activeMode, setActiveMode] = useState('build'); // 'ask' | 'plan' | 'build'
  const [selectedPlanTier, setSelectedPlanTier] = useState('Standard');
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'bom' | 'validation'

  // Chat & Text Panel Output
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'ai',
      type: 'text',
      content: 'Hello! I am Analog Circuit Copilot. Ask me a design question, generate a plan, or build a verified schematic.'
    }
  ]);

  // Schematic Data & History
  const [circuitSvg, setCircuitSvg] = useState(null);
  const [designSummary, setDesignSummary] = useState(null);
  const [bomList, setBomList] = useState([]);
  const [validation, setValidation] = useState({ status: 'IDLE', errors: [], warnings: [] });

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas Transform State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Canvas Interactions
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

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const state = history[targetIndex];
      setCircuitSvg(state.svg);
      setDesignSummary(state.summary);
      setBomList(state.bom);
      setValidation(state.validation);
      setHistoryIndex(targetIndex);
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
    }
  };

  // Dispatch API Request
  const handleSend = async () => {
    if (!promptInput.trim() || isLoading) return;
    const userText = promptInput.trim();

    setChatMessages((prev) => [...prev, { role: 'user', type: 'text', content: userText }]);
    setPromptInput('');
    setIsLoading(true);

    try {
      const endpoint =
        activeMode === 'build'
          ? 'http://127.0.0.1:5001/api/engineer-circuit'
          : '/api/sns';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          user_prompt: userText,
          ...(activeMode === 'plan' ? { tier: selectedPlanTier } : {})
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (activeMode === 'build') {
        if (data.status === 'success') {
          const sanitizedSvg = cleanSvgBackground(data.svg);
          const newMetrics = data.metrics || {};
          const newBom = data.bom || [];
          const newValidation = data.validation || { status: 'PASS', errors: [], warnings: [] };

          setCircuitSvg(sanitizedSvg);
          setDesignSummary(newMetrics);
          setBomList(newBom);
          setValidation(newValidation);

          // Append to history
          const newHistoryState = {
            svg: sanitizedSvg,
            summary: newMetrics,
            bom: newBom,
            validation: newValidation
          };
          const updatedHistory = history.slice(0, historyIndex + 1).concat(newHistoryState);
          setHistory(updatedHistory);
          setHistoryIndex(updatedHistory.length - 1);

          setChatMessages((prev) => [
            ...prev,
            {
              role: 'ai',
              type: 'text',
              content: `The circuit design has been generated successfully with ${newBom.length} bill-of-materials components.`
            }
          ]);
        } else {
          throw new Error(data.message || 'Build synthesis failed');
        }
      } else {
        // ASK or PLAN response handling
        let answerText = '';
        if (data?.items?.[0]?.json?.content?.parts?.[0]?.text) {
          const raw = data.items[0].json.content.parts[0].text;
          try {
            const parsed = JSON.parse(raw);
            answerText = parsed.message || parsed.plan || raw;
          } catch {
            answerText = raw;
          }
        } else {
          answerText = data.message || JSON.stringify(data, null, 2);
        }

        setChatMessages((prev) => [...prev, { role: 'ai', type: 'text', content: answerText }]);
      }
    } catch (err) {
      console.error('Request pipeline error:', err);
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', type: 'text', content: `Error: ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="copilot-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #1e293b', background: '#090d16' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>⚡</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Analog Circuit Copilot</h1>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>AI-powered circuit design assistant</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ color: '#94a3b8' }}>Engine Ready</span>
        </div>
      </header>

      {/* Main Grid View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', flex: 1, overflow: 'hidden' }}>
        {/* Left Section: Schematic & Canvas Controls */}
        <section style={{ display: 'flex', flexDirection: 'column', position: 'relative', borderRight: '1px solid #1e293b' }}>
          {/* Workspace Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', background: '#0e1526', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontWeight: 500, fontSize: '0.9rem', color: '#cbd5e1' }}>Circuit Workspace</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handleUndo} disabled={historyIndex <= 0} title="Undo" style={btnStyle}>↺</button>
              <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo" style={btnStyle}>↻</button>
              <button onClick={handleFit} title="Fit to Viewport" style={btnStyle}>Fit</button>
              <button onClick={handleZoomOut} title="Zoom Out" style={btnStyle}>-</button>
              <button onClick={handleZoomIn} title="Zoom In" style={btnStyle}>+</button>
            </div>
          </div>

          {/* Interactive Schematic Viewport */}
          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {circuitSvg ? (
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                  filter: 'invert(1) hue-rotate(180deg)',
                  mixBlendMode: 'screen',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                dangerouslySetInnerHTML={{ __html: circuitSvg }}
              />
            ) : (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
                <p style={{ margin: 0 }}>No circuit synthesized yet.</p>
                <span style={{ fontSize: '0.8rem' }}>Enter requirements in Build mode to generate a schematic.</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Section: Copilot Controls & Engineering Tabs */}
        <aside style={{ display: 'flex', flexDirection: 'column', background: '#0b1120' }}>
          {/* Mode Selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#090d16' }}>
            {['ask', 'plan', 'build'].map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: activeMode === mode ? '#1e293b' : 'transparent',
                  color: activeMode === mode ? '#38bdf8' : '#94a3b8',
                  border: 'none',
                  borderBottom: activeMode === mode ? '2px solid #38bdf8' : 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Plan Tier Selector (Only visible in Plan mode) */}
          {activeMode === 'plan' && (
            <div style={{ padding: '8px 16px', background: '#111827', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tier:</span>
              {['Standard', 'Automotive', 'High Reliability'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedPlanTier(tier)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    background: selectedPlanTier === tier ? '#38bdf8' : '#1e293b',
                    color: selectedPlanTier === tier ? '#0f172a' : '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  {tier}
                </button>
              ))}
            </div>
          )}

          {/* Tab Selection for Engineering Data */}
          {activeMode === 'build' && (
            <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', background: '#0d1527' }}>
              {['summary', 'bom', 'validation'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: activeTab === tab ? '#1e293b' : 'transparent',
                    color: activeTab === tab ? '#f8fafc' : '#64748b',
                    border: 'none',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Dynamic Information Panel */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeMode === 'build' && activeTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>Design Summary</span>
                {designSummary && Object.keys(designSummary).length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {Object.entries(designSummary).map(([key, value]) => (
                      <div key={key} style={{ background: '#1e293b', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>{String(value)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>No specifications available yet.</p>
                )}
              </div>
            )}

            {activeMode === 'build' && activeTab === 'bom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>Component Sourcing (BOM)</span>
                {bomList.length > 0 ? (
                  bomList.map((item, idx) => (
                    <div key={idx} style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#38bdf8' }}>
                        <span>{item.mpn || item.part_number || `Part ${idx + 1}`}</span>
                        <span>{item.price || item.unit_price || '$--'}</span>
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: '0.75rem', marginTop: '2px' }}>{item.description || item.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Footprint: {item.package || item.footprint || 'Standard'}</div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>No BOM components available.</p>
                )}
              </div>
            )}

            {activeMode === 'build' && activeTab === 'validation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>Electrical Validation</span>
                <div style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem' }}>Status:</span>
                  <span style={{ fontWeight: 600, color: validation.status === 'PASS' ? '#22c55e' : '#eab308' }}>
                    {validation.status}
                  </span>
                </div>
                {validation.warnings?.length > 0 && (
                  <div style={{ background: '#422006', border: '1px solid #ca8a04', padding: '8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <strong>Warnings:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {validation.warnings.map((w, i) => (
                        <li key={i}>{typeof w === 'object' ? w.message : w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Chat Transcript Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Session Log</span>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.role === 'user' ? '#0284c7' : '#1e293b',
                    color: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    maxWidth: '90%',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          </div>

          {/* User Input Bar */}
          <div style={{ padding: '12px', borderTop: '1px solid #1e293b', background: '#090d16', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={promptInput}
              disabled={isLoading}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                activeMode === 'build'
                  ? 'e.g., Inverting op-amp gain -5'
                  : activeMode === 'plan'
                  ? 'e.g., Plan high-speed ADC driver'
                  : 'Ask an analog circuit question...'
              }
              style={{
                flex: 1,
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '10px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !promptInput.trim()}
              style={{
                background: '#0284c7',
                border: 'none',
                borderRadius: '4px',
                padding: '0 16px',
                color: '#f8fafc',
                fontWeight: 600,
                cursor: isLoading || !promptInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !promptInput.trim() ? 0.6 : 1
              }}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

const btnStyle = {
  background: '#1e293b',
  color: '#cbd5e1',
  border: '1px solid #334155',
  borderRadius: '4px',
  padding: '4px 10px',
  fontSize: '0.75rem',
  cursor: 'pointer'
};