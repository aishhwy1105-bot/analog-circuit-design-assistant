# AI-Powered Analog Circuit Design & Optimization Assistant

> **SNS DT 2.0 Framework | III Cohort Tech Pilot Project**  
> An intelligent electronic circuit design system designed to automate domain parameter extraction, component sizing, datasheet search, and validation.

---

## 📌 Problem Statement

Designing modern electronic circuits requires extensive manual effort, domain expertise, and iterative validation processes. Engineers need intelligent design assistance that can accelerate circuit development while improving design accuracy and reducing development iteration time.

* **Benchmark Startup (YC Company):** Atrisa — Agents for Analog Circuit Design (2026)
* **Innovation Technology:** Data Science / AI / ML
* **Innovation Industry:** Electronics & Manufacturing

---

## 🏗️ System Design & Microservices Architecture

The platform follows a decoupled microservices pattern where the **Frontend UI (VS Code)** communicates with the **Orchestrated Backend Services (SNS Agent Workbench)** via API Webhooks.

```text
  [ User Spec Input ] ──► (Streamlit UI in VS Code)
                                  │
                                  ▼ HTTP POST (Webhook)
  ┌─────────────────────────────────────────────────────────────────┐
  │                 SNS AGENT WORKBENCH BACKEND                     │
  │                                                                 │
  │  [ Requirement Service ] ──► Parses user intent into JSON       │
  │           │                                                     │
  │           ▼                                                     │
  │  [ Calculation Service ] ──► Sizes Inductors/Capacitors (Math)  │
  │           │                                                     │
  │           ▼                                                     │
  │  [ Knowledge Search ]    ──► Queries Component DB & Datasheets  │
  │           │                                                     │
  │           ▼                                                     │
  │  [ Validation Service ]  ──► Thermal & Voltage Tolerance Checks │
  └─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ JSON Response
  [ Interactive Schematic ] ◄── (Streamlit UI in VS Code)
  