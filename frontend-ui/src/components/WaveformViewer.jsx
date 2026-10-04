import { useState, useMemo, useRef, useEffect } from 'react';

// Viewport Dimensions and Padding Constants
const W = 760;
const H = 320;
const PADDING = { top: 25, right: 30, bottom: 35, left: 55 };
const PLOT_W = W - PADDING.left - PADDING.right;
const PLOT_H = H - PADDING.top - PADDING.bottom;

export default function WaveformViewer({ simData, isLoading, onReSimulate }) {
  const [showVout, setShowVout] = useState(true);
  const [showIL, setShowIL] = useState(true);
  const [showVsw, setShowVsw] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showNetlist, setShowNetlist] = useState(false);

  // Resizable Splitters State
  const [waveformHeight, setWaveformHeight] = useState(240);
  const [netlistHeight, setNetlistHeight] = useState(140);
  const [isDraggingWaveform, setIsDraggingWaveform] = useState(false);
  const [isDraggingNetlist, setIsDraggingNetlist] = useState(false);
  const isDraggingWaveformRef = useRef(false);
  const isDraggingNetlistRef = useRef(false);

  const viewerRef = useRef(null);
  const scopeRef = useRef(null);
  const netlistRef = useRef(null);

  // Global mousemove and mouseup listeners for internal splitters
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingWaveformRef.current && scopeRef.current) {
        const scopeRect = scopeRef.current.getBoundingClientRect();
        const newHeight = e.clientY - scopeRect.top;
        const minH = 160;
        const maxH = viewerRef.current ? viewerRef.current.clientHeight - (showNetlist ? 200 : 90) : 600;
        setWaveformHeight(Math.max(minH, Math.min(newHeight, maxH)));
      }

      if (isDraggingNetlistRef.current && netlistRef.current) {
        const netlistRect = netlistRef.current.getBoundingClientRect();
        const newHeight = netlistRect.bottom - e.clientY;
        const minH = 60;
        const maxH = viewerRef.current ? viewerRef.current.clientHeight - 200 : 400;
        setNetlistHeight(Math.max(minH, Math.min(newHeight, maxH)));
      }
    };

    const handleMouseUp = () => {
      if (isDraggingWaveformRef.current) {
        isDraggingWaveformRef.current = false;
        setIsDraggingWaveform(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (isDraggingNetlistRef.current) {
        isDraggingNetlistRef.current = false;
        setIsDraggingNetlist(false);
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
  }, [showNetlist]);

  const handleWaveformSplitterMouseDown = (e) => {
    e.preventDefault();
    isDraggingWaveformRef.current = true;
    setIsDraggingWaveform(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleNetlistSplitterMouseDown = (e) => {
    e.preventDefault();
    isDraggingNetlistRef.current = true;
    setIsDraggingNetlist(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const time = useMemo(() => simData?.time || [], [simData?.time]);
  const vout = useMemo(() => simData?.vout || [], [simData?.vout]);
  const il = useMemo(() => simData?.il || [], [simData?.il]);
  const vsw = useMemo(() => simData?.vsw || [], [simData?.vsw]);
  const metrics = simData?.metrics || {};

  // Compute Scales
  const bounds = useMemo(() => {
    if (time.length === 0) return { minT: 0, maxT: 1500, minV: 0, maxV: 15, minI: 0, maxI: 5 };

    const minT = time[0];
    const maxT = time[time.length - 1] || 1500;

    let minV = Math.min(...(vout.length ? vout : [0]));
    let maxV = Math.max(...(vout.length ? vout : [10]));
    if (showVsw && vsw.length) {
      minV = Math.min(minV, ...vsw);
      maxV = Math.max(maxV, ...vsw);
    }
    minV = Math.floor(Math.min(minV, 0));
    maxV = Math.ceil(maxV * 1.15) || 12;

    const minI = 0;
    const maxI = Math.ceil(Math.max(...(il.length ? il : [2])) * 1.25) || 3;

    return { minT, maxT, minV, maxV, minI, maxI };
  }, [time, vout, il, vsw, showVsw]);

  // Transform Data to SVG Path coordinates
  const voutPath = useMemo(() => {
    if (!vout.length || !time.length) return '';
    return vout.map((v, i) => {
      const x = PADDING.left + ((time[i] - bounds.minT) / (bounds.maxT - bounds.minT || 1)) * PLOT_W;
      const y = PADDING.top + PLOT_H - ((v - bounds.minV) / (bounds.maxV - bounds.minV || 1)) * PLOT_H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [vout, time, bounds]);

  const ilPath = useMemo(() => {
    if (!il.length || !time.length) return '';
    return il.map((val, i) => {
      const x = PADDING.left + ((time[i] - bounds.minT) / (bounds.maxT - bounds.minT || 1)) * PLOT_W;
      const y = PADDING.top + PLOT_H - ((val - bounds.minI) / (bounds.maxI - bounds.minI || 1)) * PLOT_H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [il, time, bounds]);

  const vswPath = useMemo(() => {
    if (!vsw.length || !time.length) return '';
    return vsw.map((val, i) => {
      const x = PADDING.left + ((time[i] - bounds.minT) / (bounds.maxT - bounds.minT || 1)) * PLOT_W;
      const y = PADDING.top + PLOT_H - ((val - bounds.minV) / (bounds.maxV - bounds.minV || 1)) * PLOT_H;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [vsw, time, bounds]);

  // Handle Interactive Cursor Movement
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = mouseX - (PADDING.left / W) * rect.width;
    const widthRatio = relX / ((PLOT_W / W) * rect.width);

    if (widthRatio >= 0 && widthRatio <= 1 && time.length > 0) {
      const targetIdx = Math.round(widthRatio * (time.length - 1));
      setHoverIndex(Math.min(Math.max(targetIdx, 0), time.length - 1));
    }
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const hoverX = hoverIndex !== null && time[hoverIndex] !== undefined
    ? PADDING.left + ((time[hoverIndex] - bounds.minT) / (bounds.maxT - bounds.minT || 1)) * PLOT_W
    : null;

  return (
    <div className="waveform-viewer-container" ref={viewerRef}>
      {/* 1. Top Controls & Trace Toggles */}
      <div className="scope-topbar">
        <div className="scope-title-group">
          <span className="scope-badge">SPICE TRANSIENT</span>
          <span className="scope-engine-tag">Engine: {simData?.engine || 'deterministic-spice'}</span>
        </div>

        <div className="scope-traces-toggle">
          <button
            className={`trace-pill vout ${showVout ? 'active' : ''}`}
            onClick={() => setShowVout(!showVout)}
          >
            <span className="trace-dot vout" /> Vout(t)
          </button>
          <button
            className={`trace-pill il ${showIL ? 'active' : ''}`}
            onClick={() => setShowIL(!showIL)}
          >
            <span className="trace-dot il" /> IL(t) / Iin
          </button>
          <button
            className={`trace-pill vsw ${showVsw ? 'active' : ''}`}
            onClick={() => setShowVsw(!showVsw)}
          >
            <span className="trace-dot vsw" /> Vsw(t)
          </button>
          <button
            className={`scope-action-btn ${showNetlist ? 'active' : ''}`}
            onClick={() => setShowNetlist(!showNetlist)}
            title="Toggle SPICE Netlist"
          >
            {showNetlist ? 'Hide Netlist' : 'View Netlist'}
          </button>
          <button
            className="scope-action-btn run"
            onClick={onReSimulate}
            disabled={isLoading}
            title="Re-run simulation"
          >
            {isLoading ? 'Simulating...' : '⚡ Re-Run'}
          </button>
        </div>
      </div>

      {/* 2. Main Oscilloscope Screen (Always Visible & Resizable) */}
      <div
        className="oscilloscope-screen"
        ref={scopeRef}
        style={{ height: `${waveformHeight}px`, minHeight: '160px', flex: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="scope-svg">
          <defs>
            {/* Grid Pattern */}
            <pattern id="scope-grid" width={PLOT_W / 10} height={PLOT_H / 8} patternUnits="userSpaceOnUse" x={PADDING.left} y={PADDING.top}>
              <path d={`M ${PLOT_W / 10} 0 L 0 0 0 ${PLOT_H / 8}`} fill="none" stroke="#1c2d4a" strokeWidth="1" strokeDasharray="2,2" />
            </pattern>
            {/* Glow Filters */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          <rect x={PADDING.left} y={PADDING.top} width={PLOT_W} height={PLOT_H} fill="#050811" stroke="#1e3a5f" strokeWidth="1.5" />
          <rect x={PADDING.left} y={PADDING.top} width={PLOT_W} height={PLOT_H} fill="url(#scope-grid)" />

          {/* Central Crosshairs */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + PLOT_H / 2}
            x2={PADDING.left + PLOT_W}
            y2={PADDING.top + PLOT_H / 2}
            stroke="#223e66"
            strokeWidth="1.5"
          />
          <line
            x1={PADDING.left + PLOT_W / 2}
            y1={PADDING.top}
            x2={PADDING.left + PLOT_W / 2}
            y2={PADDING.top + PLOT_H}
            stroke="#223e66"
            strokeWidth="1.5"
          />

          {/* Axis Labels (Voltage & Current Scale) */}
          <text x={PADDING.left - 8} y={PADDING.top + 5} fill="#38bdf8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {bounds.maxV}V
          </text>
          <text x={PADDING.left - 8} y={PADDING.top + PLOT_H / 2 + 3} fill="#38bdf8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {((bounds.maxV + bounds.minV) / 2).toFixed(1)}V
          </text>
          <text x={PADDING.left - 8} y={PADDING.top + PLOT_H} fill="#38bdf8" fontSize="10" textAnchor="end" fontFamily="monospace">
            {bounds.minV}V
          </text>

          {/* Right Y-Axis for Inductor Current */}
          <text x={PADDING.left + PLOT_W + 8} y={PADDING.top + 5} fill="#f59e0b" fontSize="10" textAnchor="start" fontFamily="monospace">
            {bounds.maxI}A
          </text>
          <text x={PADDING.left + PLOT_W + 8} y={PADDING.top + PLOT_H} fill="#f59e0b" fontSize="10" textAnchor="start" fontFamily="monospace">
            {bounds.minI}A
          </text>

          {/* X-Axis Time Labels */}
          <text x={PADDING.left} y={H - 12} fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
            0µs
          </text>
          <text x={PADDING.left + PLOT_W / 2} y={H - 12} fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
            {((bounds.maxT + bounds.minT) / 2).toFixed(0)}µs
          </text>
          <text x={PADDING.left + PLOT_W} y={H - 12} fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">
            {bounds.maxT.toFixed(0)}µs
          </text>

          {/* Trace 3: Switching Node Voltage Vsw */}
          {showVsw && vswPath && (
            <path d={vswPath} fill="none" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.8" />
          )}

          {/* Trace 2: Inductor Current IL(t) */}
          {showIL && ilPath && (
            <path d={ilPath} fill="none" stroke="#f59e0b" strokeWidth="2" filter="url(#glow-amber)" />
          )}

          {/* Trace 1: Output Voltage Vout(t) */}
          {showVout && voutPath && (
            <path d={voutPath} fill="none" stroke="#38bdf8" strokeWidth="2.2" filter="url(#glow-cyan)" />
          )}

          {/* Interactive Hover Crosshair */}
          {hoverX !== null && hoverIndex !== null && (
            <g>
              <line
                x1={hoverX}
                y1={PADDING.left}
                x2={hoverX}
                y2={PADDING.top + PLOT_H}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.75"
              />
              {showVout && vout[hoverIndex] !== undefined && (
                <circle
                  cx={hoverX}
                  cy={PADDING.top + PLOT_H - ((vout[hoverIndex] - bounds.minV) / (bounds.maxV - bounds.minV || 1)) * PLOT_H}
                  r="4.5"
                  fill="#38bdf8"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
              {showIL && il[hoverIndex] !== undefined && (
                <circle
                  cx={hoverX}
                  cy={PADDING.top + PLOT_H - ((il[hoverIndex] - bounds.minI) / (bounds.maxI - bounds.minI || 1)) * PLOT_H}
                  r="4"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover Readout Tooltip */}
        {hoverIndex !== null && (
          <div className="scope-hover-hud">
            <span className="hud-item time">t: {time[hoverIndex]}µs</span>
            {showVout && vout[hoverIndex] !== undefined && (
              <span className="hud-item vout">Vout: {vout[hoverIndex]}V</span>
            )}
            {showIL && il[hoverIndex] !== undefined && (
              <span className="hud-item il">IL: {il[hoverIndex]}A</span>
            )}
            {showVsw && vsw[hoverIndex] !== undefined && (
              <span className="hud-item vsw">Vsw: {vsw[hoverIndex]}V</span>
            )}
          </div>
        )}
      </div>

      {/* Draggable Splitter 1: Between Waveform Viewport & Metrics Grid */}
      <div
        className={`scope-splitter ${isDraggingWaveform ? 'active-drag' : ''}`}
        onMouseDown={handleWaveformSplitterMouseDown}
        title="Drag to resize oscilloscope waveform viewport"
      >
        <div className="scope-splitter-grip">
          <span className="grip-line">═</span>
        </div>
      </div>

      {/* 3. Bottom 5-Metric Readout Cards */}
      <div className="scope-metrics-grid">
        <div className="scope-metric-box">
          <span className="box-label">Output Ripple (ΔVout)</span>
          <strong className="box-val cyan">{metrics.rippleMv || 38.0} mV</strong>
        </div>
        <div className="scope-metric-box">
          <span className="box-label">Inductor Ripple (ΔIL)</span>
          <strong className="box-val amber">{metrics.ilRippleA || 0.48} A</strong>
        </div>
        <div className="scope-metric-box">
          <span className="box-label">Settling Time (ts)</span>
          <strong className="box-val green">{metrics.settlingTimeUs || 420.0} µs</strong>
        </div>
        <div className="scope-metric-box">
          <span className="box-label">Phase Margin (φm)</span>
          <strong className="box-val purple">{metrics.phaseMarginDeg || 62.4}°</strong>
        </div>
        <div className="scope-metric-box">
          <span className="box-label">Est. Efficiency (η)</span>
          <strong className="box-val emerald">{metrics.efficiencyPct || 94.2}%</strong>
        </div>
      </div>

      {/* Draggable Splitter 2: Between Metrics Bar & SPICE Netlist Drawer */}
      {showNetlist && simData?.netlist && (
        <div
          className={`scope-splitter ${isDraggingNetlist ? 'active-drag' : ''}`}
          onMouseDown={handleNetlistSplitterMouseDown}
          title="Drag to resize SPICE netlist drawer"
        >
          <div className="scope-splitter-grip">
            <span className="grip-line">═</span>
          </div>
        </div>
      )}

      {/* 4. Optional Collapsible Netlist Drawer (Bottom Placement & Resizable) */}
      {showNetlist && simData?.netlist && (
        <div
          className="netlist-drawer"
          ref={netlistRef}
          style={{ height: `${netlistHeight}px`, maxHeight: `${netlistHeight}px` }}
        >
          <div className="netlist-header">
            <span>SPICE Netlist (.cir)</span>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText(simData.netlist)}>
              Copy Netlist
            </button>
          </div>
          <pre className="netlist-code">{simData.netlist}</pre>
        </div>
      )}
    </div>
  );
}
