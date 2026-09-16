/**
 * Component pin offset registry and orthogonal Manhattan routing engine.
 */

// Local offsets (x, y) relative to component center (0, 0) at rotation = 0
export const PIN_MAP = {
  MOSFET: {
    DRAIN: { x: 0, y: -30 },
    GATE: { x: -30, y: 0 },
    SOURCE: { x: 0, y: 30 },
    D: { x: 0, y: -30 },
    G: { x: -30, y: 0 },
    S: { x: 0, y: 30 },
  },
  DIODE: {
    ANODE: { x: 0, y: -30 },
    CATHODE: { x: 0, y: 30 },
    A: { x: 0, y: -30 },
    K: { x: 0, y: 30 },
  },
  PASSIVE_2PIN: {
    1: { x: 0, y: -30 },
    2: { x: 0, y: 30 },
    P1: { x: 0, y: -30 },
    P2: { x: 0, y: 30 },
    P: { x: 0, y: -30 },
    N: { x: 0, y: 30 },
  },
  IC_CONTROLLER: {
    VIN: { x: -40, y: -20 },
    GATE: { x: -40, y: 20 },
    FB: { x: 40, y: -20 },
    GND: { x: 40, y: 20 },
  },
};

export function getPinCoordinates(component, pinName) {
  const { x = 0, y = 0, rotation = 0, type = "" } = component;
  const upperType = type.toUpperCase();

  let registry = PIN_MAP.PASSIVE_2PIN;
  if (upperType.includes("MOSFET") || upperType.includes("FET") || component.id?.startsWith("Q")) {
    registry = PIN_MAP.MOSFET;
  } else if (upperType.includes("DIODE") || component.id?.startsWith("D")) {
    registry = PIN_MAP.DIODE;
  } else if (upperType.includes("IC") || upperType.includes("CONTROLLER") || component.id?.startsWith("U")) {
    registry = PIN_MAP.IC_CONTROLLER;
  }

  const normalizedPin = String(pinName || "").toUpperCase();
  const offset = registry[pinName] || registry[normalizedPin] || { x: 0, y: 0 };
  const rad = (Number(rotation) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return {
    x: x + (offset.x * cos - offset.y * sin),
    y: y + (offset.x * sin + offset.y * cos),
  };
}

export function generateManhattanPath(p1, p2) {
  const midX = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} H ${midX} V ${p2.y} H ${p2.x}`;
}
