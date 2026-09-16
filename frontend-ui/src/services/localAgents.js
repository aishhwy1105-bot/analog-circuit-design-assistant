/**
 * Local Domain Intelligence Engines for Analog Circuit Copilot
 */

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function generateAskAdvice(prompt) {
  await delay(350);

  const p = prompt.toLowerCase();
  const isCharger = p.includes("charger") || p.includes("adapter") || p.includes("laptop");
  const isBuck = p.includes("buck") || p.includes("step-down");
  const isBoost = p.includes("boost") || p.includes("step-up");

  let topology = "Quasi-Resonant (QR) Flyback with Secondary Synchronous Rectification";
  let overview = `Engineering feasibility and architectural assessment for "${prompt}". Optimal for universal mains conversion with galvanic isolation.`;
  let components = [
    { category: "Primary Switch", recommendation: "650V Superjunction MOSFET or GaN HEMT (e.g., Navitas NV6115)" },
    { category: "Controller", recommendation: "Quasi-Resonant PWM Controller with Frequency Foldback" },
    { category: "Magnetics", recommendation: "Custom planar transformer / PQ26/20 ferrite core" },
    { category: "Output Rectifier", recommendation: "Synchronous Rectifier MOSFET (e.g., 60V, 3.2mΩ) + Controller" },
  ];
  let budget = { prototype_bom_usd: "$18.00 - $28.00", production_1k_usd: "$5.50 - $7.50", notes: "Using GaN increases BOM by ~$2.00 but reduces magnetic volume and heatsink weight by 50%." };

  if (isBuck) {
    topology = "Synchronous Buck Regulator";
    overview = `Step-down DC-DC switching architecture for "${prompt}". High efficiency conversion across load steps.`;
    components = [
      { category: "High-Side Switch", recommendation: "Logic-level N-Channel MOSFET with low RDS(on)" },
      { category: "Synchronous Rectifier", recommendation: "Low RDS(on) N-Channel MOSFET (replaces Schottky diode)" },
      { category: "Inductor", recommendation: "Shielded power inductor with high saturation current (Isat > 1.4 * Iout)" },
      { category: "Controller", recommendation: "Synchronous Buck PWM controller with integrated gate drivers" },
    ];
    budget = { prototype_bom_usd: "$6.00 - $12.00", production_1k_usd: "$1.80 - $3.20", notes: "Integrated monolithic ICs offer lower component count for currents < 5A." };
  } else if (isBoost) {
    topology = "Asynchronous/Synchronous Boost Converter";
    overview = `Step-up DC-DC conversion topology for "${prompt}".`;
    components = [
      { category: "Main Switch", recommendation: "Low-RDS(on) Power MOSFET" },
      { category: "Rectifier", recommendation: "Ultra-fast recovery Schottky barrier diode or synchronous FET" },
      { category: "Energy Storage", recommendation: "High-saturation toroidal or shielded drum core inductor" },
    ];
    budget = { prototype_bom_usd: "$7.00 - $14.00", production_1k_usd: "$2.10 - $3.80", notes: "Output voltage rating of storage capacitors dominates bulk BOM cost." };
  }

  return {
    mode: "ask",
    overview,
    recommended_topology: topology,
    essential_components: components,
    estimated_budget: budget,
    thermal_and_safety: [
      "Reinforced galvanic isolation barrier compliant with IEC 62368-1 / UL 60950.",
      "Maintain junction temperature Tj < 105°C via thermal vias under power semiconductor pads.",
      "Differential and common-mode input filtering to pass CISPR 32 Class B conducted EMI limits.",
    ],
    next_steps: isCharger ? "Confirm the mains range, isolation class, USB-PD profiles, and compliance targets before sizing the magnetics." : "Confirm input range, output transients, switching frequency, and ripple targets before sizing the power stage.",
  };
}

export async function generatePlanRoadmap(prompt) {
  await delay(350);

  const p = prompt.toLowerCase();
  const isCharger = p.includes("charger") || p.includes("laptop");

  return {
    mode: "plan",
    project_title: prompt,
    electrical_specifications: {
      input_voltage: isCharger ? "90V - 264V AC (Universal Mains)" : "12V DC Nominal (9V - 18V Range)",
      output_voltage: isCharger ? "5V / 9V / 15V / 20V DC (USB-PD 3.0)" : "5V DC Regulated",
      rated_power: isCharger ? "65W Max Continuous" : "10W - 25W Target",
      target_efficiency: "91% - 94%",
    },
    tiers: {
      economical: {
        label: "Economical",
        bom_target: isCharger ? "$3.80 - $5.00 (1k qty)" : "$1.20 - $1.80 (1k qty)",
        topology: "Discontinuous Conduction / QR Flyback",
        silicon: "Standard Silicon Superjunction MOSFET",
        efficiency: "~89%",
        pros: "Lowest BOM cost, standard off-the-shelf catalog magnetics.",
        cons: "Bulkier casing required, higher operating thermals under peak load.",
      },
      standard: {
        label: "Standard",
        bom_target: isCharger ? "$6.20 - $8.20 (1k qty)" : "$2.40 - $3.50 (1k qty)",
        topology: "Quasi-Resonant Flyback + Synchronous Rectification",
        silicon: "Optimized low-gate-charge Silicon FETs",
        efficiency: "~92%",
        pros: "Balanced thermal profile, proven industry reliability, low EMI profile.",
        cons: "Requires precise snubber tuning on secondary synchronous stage.",
      },
      premium: {
        label: "Premium",
        bom_target: isCharger ? "$11.00 - $14.50 (1k qty)" : "$4.80 - $6.50 (1k qty)",
        topology: "Active Clamp Flyback (ACF) / GaN High-Density Architecture",
        silicon: "Dual High-Voltage GaN Fast Switches + Planar Transformer",
        efficiency: ">94.5%",
        pros: "Ultra-high power density, cold surface operation, compact travel footprint.",
        cons: "Requires 4-layer HDI PCB stackup and strict RF-level layout practices.",
      },
    },
    pcb_floor_planning_strategy: [
      "1. AC/DC Input Stage: Place fuse, MOV, and X2 capacitor directly adjacent to the input connector.",
      "2. High-Voltage Loop: Minimize loop area bounded by bulk capacitor, switch, and transformer primary to < 2 cm².",
      "3. Isolation Creepage: Enforce >= 6.4mm clearance between primary and secondary copper planes across isolation barrier.",
      "4. Feedback Isolation: Route optocoupler / digital isolator traces well away from high dv/dt switching nodes.",
      "5. Output Rectification: Position synchronous switch and low-ESR capacitors directly at the output port terminal.",
    ],
    layout_precautions: [
      "Implement star grounding: separate high-current power ground (PGND) from sensitive analog signal ground (AGND).",
      "Keep gate drive loop length strictly under 15mm with dedicated ground return under the trace.",
    ],
  };
}
