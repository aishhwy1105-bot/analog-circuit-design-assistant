import re
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
import schemdraw
import schemdraw.elements as elm

from calculators import CircuitCalculator
from simulator import SpiceSimulator

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "service": "Analog Circuit Copilot Engine",
        "endpoints": ["/api/engineer-circuit"]
    })


def extract_circuit_params(prompt: str):
    """Extracts numeric electrical parameters from natural language prompts."""
    vin_match = re.search(r'(\d+(?:\.\d+)?)\s*v(?:olts?)?\s*(?:in|input)?', prompt, re.IGNORECASE)
    vout_match = re.search(r'(?:to|output)\s*(\d+(?:\.\d+)?)\s*v(?:olts?)?', prompt, re.IGNORECASE)
    iout_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:a|amps?|amperes?)', prompt, re.IGNORECASE)

    vin = float(vin_match.group(1)) if vin_match else 12.0
    vout = float(vout_match.group(1)) if vout_match else 5.0
    iout = float(iout_match.group(1)) if iout_match else 2.0

    return vin, vout, iout


def render_buck_svg(calc: dict) -> str:
    """Renders a standard clean vector schematic using calculated values."""
    d = schemdraw.Drawing(show=False)
    d.config(inches_per_unit=0.5, unit=3)

    vin = d.add(elm.SourceV().label(f"VIN\n{calc['vin_nominal_V']}V"))
    d.add(elm.Line().right().length(1.5).at(vin.end))
    rail = d.add(elm.Dot())

    d.add(elm.Capacitor().down().at(rail.center).label(f"CIN\n{calc['input_capacitor']['selected_uF']}uF"))
    d.add(elm.Ground())

    d.add(elm.Line().right().length(1).at(rail.center))
    switch = d.add(elm.NFet().label("Q1\nSi4420", loc="bottom"))
    d.add(elm.Line().right().length(1).at(switch.source))
    switch_node = d.add(elm.Dot())

    d.add(elm.Diode().down().at(switch_node.center).label("D1\nSS34"))
    d.add(elm.Ground())
    d.add(elm.Inductor2().right().at(switch_node.center).label(f"L1\n{calc['inductor']['selected_standard_uH']}uH"))
    output_node = d.add(elm.Dot())

    d.add(elm.Capacitor().down().at(output_node.center).label(f"COUT\n{calc['output_capacitor']['selected_uF']}uF"))
    d.add(elm.Ground())
    d.add(elm.Line().right().length(2).at(output_node.center))
    load_node = d.add(elm.Dot())
    d.add(elm.Resistor().down().at(load_node.center).label(f"LOAD\n{calc['iout_rated_A']}A"))
    d.add(elm.Ground())
    d.add(elm.Line().right().length(1).at(load_node.center).label(f"VOUT\n{calc['vout_target_V']}V", loc="right"))

    svg_bytes = d.get_imagedata('svg')
    return svg_bytes.decode('utf-8') if isinstance(svg_bytes, bytes) else str(svg_bytes)


def to_native(value):
    """Convert NumPy/scalar containers into values Flask can JSON-encode."""
    if hasattr(value, 'item'):
        return value.item()
    if isinstance(value, dict):
        return {key: to_native(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_native(item) for item in value]
    return value


@app.route('/api/engineer-circuit', methods=['POST'])
def engineer_circuit():
    try:
        data = request.get_json(silent=True) or {}
        
        user_prompt = (
            data.get('user_prompt') or 
            data.get('prompt') or 
            data.get('message') or 
            data.get('text') or 
            ''
        )

        print(f"\n[ENGINE] Incoming request payload: {data}")
        print(f"[ENGINE] Parsed prompt: '{user_prompt}'")

        print('[ENGINE] Stage 1: parameter extraction')
        vin, vout, iout = extract_circuit_params(user_prompt)
        print(f"[ENGINE] Extracted specs -> Vin: {vin}V, Vout: {vout}V, Iout: {iout}A")

        print('[ENGINE] Stage 2: calculation')
        calc_data = CircuitCalculator.calculate_buck(vin=vin, vout=vout, iout=iout)

        print('[ENGINE] Stage 3: simulation and netlist generation')
        sim_results = SpiceSimulator.run_transient_simulation(calc_data)
        spice_netlist = SpiceSimulator.generate_netlist(calc_data)

        print('[ENGINE] Stage 4: SVG rendering')
        svg_content = render_buck_svg(calc_data)

        # 5. Build metrics
        metrics = {
            "topology": calc_data["topology"],
            "operating_mode": calc_data["operating_mode"],
            "input_voltage": f"{calc_data['vin_nominal_V']} V",
            "output_voltage": f"{calc_data['vout_target_V']} V",
            "output_current": f"{calc_data['iout_rated_A']} A",
            "duty_cycle": f"{calc_data['duty_cycle_pct']}%",
            "inductor": f"{calc_data['inductor']['selected_standard_uH']} µH",
            "inductor_sat_current": f"≥ {calc_data['inductor']['min_saturation_current_A']} A",
            "output_capacitor": f"{calc_data['output_capacitor']['selected_uF']} µF",
            "max_cout_esr": f"≤ {calc_data['output_capacitor']['max_esr_mohm']} mΩ",
            "feedback_r1": f"{calc_data['feedback_network']['r1_kohm']} kΩ",
            "feedback_r2": f"{calc_data['feedback_network']['r2_kohm']} kΩ",
            "efficiency": f"{calc_data['system_metrics']['estimated_efficiency_pct']}%",
            "sim_measured_vout": f"{sim_results['measured_vout_V']} V",
            "sim_ripple": f"{sim_results['voltage_ripple_mV']} mV"
        }

        # 6. BOM
        bom = [
            {
                "mpn": "Si4420DY-T1-GE3",
                "name": "N-Channel 30V MOSFET",
                "package": "SO-8",
                "unit_price": "$0.65",
                "description": f"Main switch rated for {calc_data['inductor']['peak_current_A']}A peak"
            },
            {
                "mpn": f"SRP1038A-{int(calc_data['inductor']['selected_standard_uH'])}0M",
                "name": f"Power Inductor {calc_data['inductor']['selected_standard_uH']}µH",
                "package": "SMD 10x10mm",
                "unit_price": "$1.12",
                "description": f"Shielded inductor, Isat ≥ {calc_data['inductor']['min_saturation_current_A']}A"
            },
            {
                "mpn": "B340A-13-F",
                "name": "Schottky Barrier Diode 40V 3A",
                "package": "SMA",
                "unit_price": "$0.22",
                "description": "Freewheeling diode"
            },
            {
                "mpn": "CL31A226KOCLNNC",
                "name": f"MLCC Ceramic Cap {calc_data['output_capacitor']['selected_uF']}µF",
                "package": "1206",
                "unit_price": "$0.14",
                "description": f"Output filter cap, rating ≥ {calc_data['output_capacitor']['voltage_rating_min_V']}V"
            }
        ]

        # 7. Validation
        validation = {
            "status": "PASS" if sim_results["is_stable"] else "WARNING",
            "errors": [],
            "warnings": [
                f"Transient simulation measured output ripple: {sim_results['voltage_ripple_mV']} mV.",
                f"Simulated peak inductor current reached: {sim_results['measured_peak_current_A']} A."
            ]
        }

        return jsonify(to_native({
            "status": "success",
            "svg": svg_content,
            "metrics": metrics,
            "simulation": sim_results,
            "netlist": spice_netlist,
            "bom": bom,
            "validation": validation
        }))

    except Exception as e:
        print("[ENGINE ERROR] Traceback:")
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


if __name__ == '__main__':
    print("Starting Circuit Engine on http://127.0.0.1:5001...")
    app.run(host='127.0.0.1', port=5001, debug=True)