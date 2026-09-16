/**
 * Intent & Spec Extraction Helper
 */
function analyzePrompt(prompt = '') {
  const text = prompt.toLowerCase();

  // 1. Numerical Spec Extraction
  const vinMatch = text.match(/(\d+(?:\.\d+)?)\s*v(?:in|\s*input)?/i);
  const voutMatch = text.match(/(?:to|output|\->)\s*(\d+(?:\.\d+)?)\s*v/i);
  const ioutMatch = text.match(/(\d+(?:\.\d+)?)\s*a(?:mp|mperes|\s*output|\s*delivering)?/i);
  const powerMatch = text.match(/(\d+(?:\.\d+)?)\s*w(?:att)?/i);

  // 2. High-Level Intent & Product Classification
  const isLaptopCharger = text.includes('laptop') || (text.includes('charger') && (text.includes('65w') || text.includes('100w') || text.includes('type-c') || text.includes('usb-c') || text.includes('notebook')));
  const isPhoneCharger = text.includes('phone') || text.includes('mobile') || (text.includes('charger') && !isLaptopCharger);
  const isBuck = text.includes('buck') || text.includes('step-down') || (vinMatch && voutMatch && parseFloat(vinMatch[1]) > parseFloat(voutMatch[1]));
  const isBoost = text.includes('boost') || text.includes('step-up') || (vinMatch && voutMatch && parseFloat(vinMatch[1]) < parseFloat(voutMatch[1]));
  const isLdo = text.includes('ldo') || text.includes('linear regulator');
  const isPowerBank = text.includes('power bank') || text.includes('battery pack');

  // Default inferred specifications
  if (isLaptopCharger) {
    return {
      category: 'laptop_charger',
      title: '65W USB-PD 3.0 Type-C Laptop Power Adapter',
      topology: 'Quasi-Resonant (QR) Flyback / GaN Active Clamp Flyback with Synchronous Rectification',
      vin: '90V - 264V AC (Universal Mains)',
      vout: '5V / 9V / 15V / 20V DC Auto-Negotiation',
      iout: '3.25A (at 20V)',
      power: '65W Max',
      primarySwitch: '650V GaN Fast HEMT (e.g., Navitas NV6115) or Superjunction MOSFET',
      controller: 'Dedicated QR PWM Controller + USB-PD 3.0 Protocol Controller',
      magnetics: 'Custom Planar or PQ26/20 High-Frequency Transformer',
      rectifier: 'Synchronous Rectification Controller + Low RDS(on) 60V Logic N-FET',
      budget: { prototype_bom: '$18.00 - $26.00', volume_1k: '$5.50 - $7.80', notes: 'Using GaN reduces magnetic core size and saves 50% heatsink enclosure volume.' },
      considerations: [
        'Safety & Isolation: Reinforced galvanic barrier meeting IEC 62368-1 / UL 60950 with >= 6.4mm creepage.',
        'Thermal Target: Package surface temp < 65°C under continuous 65W load.',
        'EMI/EMC: Dual common-mode choke and differential X2/Y1 filter network to meet CISPR 32 Class B.'
      ],
      pcbRoadmap: [
        '1. AC Inlet: Place fuse, MOV, and X2 suppression capacitor directly against AC receptacle.',
        '2. Primary High-Voltage Loop: Restrict loop area between bulk electrolytic cap, switch FET, and transformer to < 2 cm².',
        '3. Galvanic Isolation Barrier: Enforce 6.4mm clearance zone under transformer and optocoupler.',
        '4. Secondary Synchronous Rectification: Route gate traces tightly with short ground return loops.',
        '5. USB-C Port: Place low-ESR solid polymer filter caps directly adjacent to Type-C connector pins.'
      ]
    };
  }

  if (isPhoneCharger) {
    return {
      category: 'phone_charger',
      title: '20W USB-C PD Fast Mobile Charger',
      topology: 'Primary-Side Regulated (PSR) Quasi-Resonant Flyback',
      vin: '100V - 240V AC Universal',
      vout: '5V/3A, 9V/2.22A DC',
      iout: '2.22A - 3.0A',
      power: '20W',
      primarySwitch: '650V Integrated Power Switch IC',
      controller: 'PSR Flyback Controller with Integrated USB-PD Handshake',
      magnetics: 'EE16 / EE19 High-Frequency Ferrite Transformer',
      rectifier: 'Secondary Synchronous Rectifier FET',
      budget: { prototype_bom: '$8.00 - $14.00', volume_1k: '$2.10 - $3.40', notes: 'Highly integrated PSR controllers minimize external resistor count.' },
      considerations: [
        'Minimal standby power (< 30mW at no-load).',
        'Reinforced galvanic isolation barrier compliant with IEC 62368-1.',
        'ESD protection array directly on CC1/CC2 and D+/D- lines.'
      ],
      pcbRoadmap: [
        '1. Input fuse and bridge rectifier placed at AC connector.',
        '2. Transformer primary placed near primary switching IC.',
        '3. Creepage isolation slot routed between primary and secondary planes.',
        '4. USB-PD controller placed adjacent to Type-C port.'
      ]
    };
  }

  // Explicit Buck Converter or Extracted DC-DC Specs
  const vin = vinMatch ? `${vinMatch[1]}V` : '12V';
  const vout = voutMatch ? `${voutMatch[1]}V` : '5V';
  const iout = ioutMatch ? `${ioutMatch[1]}A` : '2A';
  const powerCalc = (parseFloat(vout) || 5) * (parseFloat(iout) || 2);
  const power = powerMatch ? `${powerMatch[1]}W` : `${powerCalc}W`;

  return {
    category: isBoost ? 'boost' : isLdo ? 'ldo' : 'buck',
    title: `${vin} to ${vout} @ ${iout} (${power}) ${isBoost ? 'Boost' : isLdo ? 'LDO' : 'Buck'} Converter`,
    topology: isBoost ? 'Synchronous Boost Converter' : isLdo ? 'Low-Dropout Linear Regulator' : 'Synchronous Step-Down (Buck) Regulator',
    vin: `${vin} DC Nominal`,
    vout: `${vout} DC Regulated`,
    iout: iout,
    power: power,
    primarySwitch: 'Logic-level N-Channel Power MOSFET (low RDS(on))',
    controller: 'Dedicated Monolithic Switching PWM Controller',
    magnetics: 'Shielded Drum Core Power Inductor (Isat >= 1.4 * Iout)',
    rectifier: 'Low-Vf Schottky Barrier Diode or Synchronous Lower FET',
    budget: { prototype_bom: '$6.00 - $12.00', volume_1k: '$1.80 - $3.20', notes: 'Cost depends on monolithic IC vs. discrete controller + FET selection.' },
    considerations: [
      'Thermal: Check MOSFET dissipation at rated load current.',
      'Inductor Sizing: Target peak-to-peak inductor ripple current around 30% of max IOUT.',
      'Capacitor Sizing: Use low-ESR ceramic X7R or polymer capacitors to minimize output ripple.'
    ],
    pcbRoadmap: [
      '1. Input Capacitor: Position Cin within 2mm of the high-side switch and GND pad.',
      '2. Switching Node (SW): Keep the copper area of SW compact to reduce radiated EMI.',
      '3. Inductor Loop: Place inductor L1 directly beside SW node.',
      '4. Feedback Divider: Route the FB sensing trace far from the noisy SW node and inductor.',
      '5. Output Filter: Group Cout capacitors closely at output terminals with direct ground returns.'
    ]
  };
}

/**
 * Ask Mode Agent Handler
 */
export async function generateAskAdvice(prompt) {
  const analysis = analyzePrompt(prompt);

  return {
    overview: `Technical advice for "${prompt}": Utilizing a ${analysis.topology} provides optimal efficiency, parameter accuracy, and thermal control for ${analysis.title}.`,
    recommended_topology: analysis.topology,
    essential_components: [
      { category: 'Primary Switch', spec: analysis.primarySwitch },
      { category: 'Controller', spec: analysis.controller },
      { category: 'Magnetics', spec: analysis.magnetics },
      { category: 'Output Rectifier', spec: analysis.rectifier }
    ],
    budget: analysis.budget,
    considerations: analysis.considerations
  };
}

/**
 * Plan Mode Agent Handler
 */
export async function generatePlanRoadmap(prompt) {
  const analysis = analyzePrompt(prompt);
  const isCharger = analysis.category === 'laptop_charger' || analysis.category === 'phone_charger';

  return {
    project_title: analysis.title,
    specs: {
      input_voltage: analysis.vin,
      output_voltage: analysis.vout,
      power_rating: analysis.power,
      target_efficiency: isCharger ? '92% - 94.5%' : '90% - 95%'
    },
    tiers: {
      economical: {
        label: 'Economical',
        bom: isCharger ? '$4.00 - $5.50' : '$1.20 - $1.80',
        topology: isCharger ? 'Discontinuous QR Flyback' : 'Standard Asynchronous Buck',
        silicon: 'Standard Superjunction MOSFET / Discrete Schottky',
        efficiency: '~89%',
        pros: 'Lowest BOM cost, standard catalog magnetics.',
        cons: 'Bulkier casing required, higher operating thermals.'
      },
      standard: {
        label: 'Standard',
        bom: isCharger ? '$6.50 - $8.20' : '$2.20 - $3.40',
        topology: analysis.topology,
        silicon: 'Low RDS(on) Silicon Power MOSFETs with Synchronous Rectification',
        efficiency: '~92%',
        pros: 'Optimal industry balance of thermals, footprint, and reliability.',
        cons: 'Requires tuned snubber network to damp EMI ringing.'
      },
      premium: {
        label: 'Premium',
        bom: isCharger ? '$11.50 - $14.50' : '$4.50 - $6.20',
        topology: isCharger ? 'Active Clamp Flyback (ACF) / GaN Architecture' : 'High-Frequency Monolithic GaN Buck',
        silicon: 'Dual High-Voltage GaN ICs + Planar Core',
        efficiency: '>94.5%',
        pros: 'Ultra-compact form factor, cold operation, travel pocket size.',
        cons: 'Requires 4-layer HDI PCB and tight RF layout tolerances.'
      }
    },
    pcb_roadmap: analysis.pcbRoadmap
  };
}