import os
import io
import re
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import schemdraw
import schemdraw.elements as elm

app = Flask(__name__)
CORS(app)

# Initialize Gemini Client
api_key = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=api_key) if api_key else None

SYSTEM_PROMPT = """
You are an expert analog circuit engineer and Python SchemDraw specialist.
Your task is to write pure, executable Python code using the `schemdraw` library to draw an accurate schematic diagram for the circuit requested by the user.

CRITICAL CONSTRAINTS:
1. Assume `d = schemdraw.Drawing(show=False)` is already created, and `schemdraw.theme('dark')` is configured.
2. Only use standard SchemDraw elements available under `elm.*`:
    - Passives: `elm.Resistor()`, `elm.Capacitor()`, `elm.Inductor2()`
    - Sources: `elm.SourceV()`, `elm.SourceSin()`, `elm.Ground()`, `elm.Dot()`
    - Actives/Semis: `elm.Diode()`, `elm.NFet()`, `elm.PFet()`, `elm.BjtNpn()`, `elm.Opamp()`
    - Connections: `elm.Line()`
3. Multi-terminal items (Opamp, FET): Anchor leads explicitly using coordinates (e.g. `d.add(elm.Line().at(op.out).right(1.5))`).
4. Output ONLY valid executable Python lines adding to `d`. NO explanations, NO markdown wrappers, NO imports.
"""

def generate_dynamic_schemdraw_code(prompt: str) -> str:
    if not client:
        raise ValueError("GEMINI_API_KEY is not set in your environment.")
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"Generate Python SchemDraw statements to build this circuit: {prompt}",
        config={"system_instruction": SYSTEM_PROMPT, "temperature": 0.1}
    )

    raw = (response.text or "").strip()
    match = re.search(r"```(?:python)?\s*([\s\S]*?)\s*```", raw, flags=re.IGNORECASE)
    code = match.group(1) if match else raw
    forbidden_prefixes = ("import ", "from ", "d = schemdraw", "d.draw", "d.save")
    lines = [
        line for line in code.splitlines()
        if line.strip() and not line.strip().startswith(forbidden_prefixes) and not line.strip().startswith("#")
    ]
    return "\n".join(lines).strip()

def render_svg_from_code(code_str: str) -> str:
    schemdraw.theme('dark')
    d = schemdraw.Drawing(show=False)
    d.config(unit=3.2, fontsize=12, color='#e2e8f0')

    exec_scope = {
        "schemdraw": schemdraw,
        "elm": elm,
        "d": d
    }

    exec(code_str, exec_scope)
    svg_bytes = d.get_imagedata('svg')
    return svg_bytes.decode('utf-8')

def build_fallback_svg(prompt: str) -> str:
    schemdraw.theme('dark')
    d = schemdraw.Drawing(show=False)
    d.config(unit=3.2, fontsize=12, color='#e2e8f0')

    gnd_in = d.add(elm.Ground())
    vin = d.add(elm.SourceV().up().at(gnd_in.start).label('VIN\n12V', loc='left', ofst=0.35))
    
    d.add(elm.Line().right(1.6).at(vin.end))
    dot_cin = d.add(elm.Dot())
    d.add(elm.Capacitor().down(2.0).at(dot_cin.center).label('Cin\n22µF', loc='left', ofst=0.35))
    d.add(elm.Line().down(0.6))
    d.add(elm.Ground())

    d.add(elm.Line().right(1.8).at(dot_cin.center))
    q1 = d.add(elm.NFet(theta=90).label('Q1\nNMOS', loc='top', ofst=0.35))
    
    dot_sw = d.add(elm.Dot().at(q1.source))
    d.add(elm.Diode().down(2.0).at(dot_sw.center).label('D1\nCatch', loc='left', ofst=0.35))
    d.add(elm.Line().down(0.6))
    d.add(elm.Ground())
    
    d.add(elm.Inductor2().right(2.6).at(dot_sw.center).label('L1\n10µH', loc='top', ofst=0.35))
    dot_out = d.add(elm.Dot())
    
    d.add(elm.Capacitor().down(2.0).at(dot_out.center).label('Cout\n22µF', loc='left', ofst=0.35))
    d.add(elm.Line().down(0.6))
    d.add(elm.Ground())
    
    d.add(elm.Line().right(2.0).at(dot_out.center))
    dot_load = d.add(elm.Dot())
    d.add(elm.Resistor().down(2.0).at(dot_load.center).label('Rload\n2.5Ω', loc='right', ofst=0.35))
    d.add(elm.Line().down(0.6))
    d.add(elm.Ground())
    
    d.add(elm.Line().right(1.2).at(dot_load.center))
    d.add(elm.Dot().label('VOUT\n5V @ 2A', loc='right', ofst=0.35))

    return d.get_imagedata('svg').decode('utf-8')

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "service": "SchemDraw Circuit Synthesizer",
        "port": 5001,
        "endpoint": "POST /api/generate-circuit",
        "ai_enabled": bool(client)
    })

@app.route('/api/generate-circuit', methods=['POST'])
def generate_circuit():
    data = request.get_json() or {}
    user_prompt = data.get('user_prompt', 'buck converter')

    try:
        py_code = generate_dynamic_schemdraw_code(user_prompt)
        svg_content = render_svg_from_code(py_code)
        return jsonify({
            "status": "success",
            "svg": svg_content,
            "source": "dynamic_ai"
        })
    except Exception as err:
        print(f"Dynamic generation failed: {traceback.format_exc()}")
        fallback_svg = build_fallback_svg(user_prompt)
        return jsonify({
            "status": "fallback",
            "svg": fallback_svg,
            "error": str(err)
        })

if __name__ == '__main__':
    print("AI-Powered Dynamic SchemDraw Synthesizer running on http://localhost:5001")
    app.run(port=5001)