# ⚡ AnalogPilot | AI-Powered Analog Circuit Design & SPICE Simulation Suite

[![Status](https://img.shields.io/badge/Status-Production--Ready-black?style=for-the-badge&logo=vercel)](https://github.com/)
[![Framework](https://img.shields.io/badge/Framework-SNS%20DT%202.0-black?style=for-the-badge)](https://github.com/)
[![Benchmark](https://img.shields.io/badge/YC%20Benchmark-Atrisa%20(W26)-black?style=for-the-badge)](https://www.ycombinator.com/)
[![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)](LICENSE)

> **Translate natural language hardware requirements into verified schematics, real-time transient SPICE waveforms, and live distributor BOMs in seconds.**

---

## 🌐 Live Product Launch Overview

**AnalogPilot** is an intelligent Electronic Design Automation (EDA) copilot engineered to automate hardware domain parameter extraction, deterministic component sizing, transient simulation, and distributor sourcing. 

Inspired by enterprise developer tools (Linear, Vercel) and validated against modern AI-hardware benchmarks like **Atrisa (YC W26)**, AnalogPilot eliminates manual calculation loops and replaces hallucination-prone generic LLMs with a deterministic physics and circuit synthesis engine.

### 🚀 Key Capabilities
* **Natural Language to Silicon:** Direct synthesis of DC-DC converters (Buck, Boost) and precision Op-Amps from natural language constraints.
* **Deterministic Math Engine:** Closed-form hardware sizing calculations for $L_{\text{crit}}$, $C_{\text{out}}$, ESR ripple voltage, and thermal margins.
* **Algorithmic Manhattan Routing:** Zero-hallucination vector SVG schematic rendering with orthogonal node routing.
* **Headless SPICE Simulation:** Instant in-browser transient solver generating $V_{\text{out}}(t)$, $I_L(t)$, and $V_{\text{sw}}(t)$ with interactive crosshair telemetry.
* **Distributor-Connected BOM:** Automated component sourcing powered by Mouser Electronics API across 3 tiers (Economical, Standard, Premium).

---

## 🏗️ System & Microservices Architecture

AnalogPilot separates concerns into a modular full-stack architecture, connecting a high-performance **React 18 / Vite** client to an **Express API Engine** and **SNS Agent Workbench**:

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    ANALOGPILOT FRONTEND (React + Vite)                 │
 │  • Solvely-Style Landing & Playground     • Manhattan Vector Engine    │
 │  • Monochrome Developer UI (Zinc Dark)    • Interactive Oscilloscope   │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP REST / JSON Webhooks
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                   EXPRESS & SNS WORKBENCH BACKEND                      │
 │                                                                        │
 │  [ Requirement Parsing ] ──► Extracts Vin, Vout, Iout, Fsw into JSON   │
 │             │                                                          │
 │             ▼                                                          │
 │  [ Parametric Solver ]   ──► Sizes L, C, Duty Cycle & Ripple Margins   │
 │             │                                                          │
 │             ▼                                                          │
 │  [ SPICE Netlist Engine] ──► Transient solver yields V(t), I(t), DRC   │
 │             │                                                          │
 │             ▼                                                          │
 │  [ Mouser Sourcing API ] ──► Real-time MPN matching & 3-Tier BOM cache │
 └────────────────────────────────────────────────────────────────────────┘
