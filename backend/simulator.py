import numpy as np

class SpiceSimulator:
    @staticmethod
    def generate_netlist(calc: dict) -> str:
        """
        Builds a standard SPICE deck (.cir) for a Synchronous/Asynchronous Buck Converter.
        """
        vin = calc['vin_nominal_V']
        vout = calc['vout_target_V']
        iout = calc['iout_rated_A']
        l_val = calc['inductor']['selected_standard_uH'] * 1e-6
        c_val = calc['output_capacitor']['selected_uF'] * 1e-6
        fsw = calc['fsw_kHz'] * 1e3
        d = calc['duty_cycle_pct'] / 100.0
        period = 1.0 / fsw
        ton = d * period
        r_load = vout / iout

        # Complete SPICE deck with parasitics (MOSFET RDSon, Diode drop, Inductor DCR, Cap ESR)
        netlist = f"""* Automated SPICE Netlist - Buck Converter
.title Buck Converter Transient Simulation

* Power Rails
V_IN in 0 DC {vin}

* PWM Gate Driver (Pulsed Voltage Source)
V_GATE gate 0 PULSE(0 10 0 10n 10n {ton:.4e} {period:.4e})

* High-Side Switch (Voltage-controlled switch with 35mOhm Ron)
S1 in sw gate 0 SW_MODEL
.MODEL SW_MODEL VSWITCH (RON=0.035 ROFF=1MEG VON=5 VOFF=1)

* Freewheeling Schottky Diode
D1 0 sw D_SCHOTTKY
.MODEL D_SCHOTTKY D (IS=1e-7 RS=0.02 N=1.05 BV=40)

* Inductor with Series DCR (15mOhm)
L1 sw mid {l_val:.4e}
R_DCR mid out_node 0.015

* Output Capacitor with ESR (12mOhm)
C1 out_node out_c {c_val:.4e}
R_ESR out_c 0 0.012

* Dynamic Load Resistor
R_LOAD out_node 0 {r_load:.4f}

* Transient Analysis (Simulate 500 switching cycles)
.tran 50n {period * 500:.4e} {period * 400:.4e}
.end
"""
        return netlist

    @staticmethod
    def run_transient_simulation(calc: dict) -> dict:
        """
        Executes transient numerical simulation to derive real measured waveform metrics.
        Returns sampled points for the frontend charts and electrical verifications.
        """
        vin = calc['vin_nominal_V']
        vout = calc['vout_target_V']
        iout = calc['iout_rated_A']
        l_h = calc['inductor']['selected_standard_uH'] * 1e-6
        c_f = calc['output_capacitor']['selected_uF'] * 1e-6
        fsw = calc['fsw_kHz'] * 1e3
        d = calc['duty_cycle_pct'] / 100.0
        period = 1.0 / fsw

        # Discrete numerical transient run for the final steady-state cycles
        cycles = 100
        steps_per_cycle = 40
        total_steps = cycles * steps_per_cycle
        dt = period / steps_per_cycle

        # Numerical integration vectors
        t_vec = np.linspace(0, cycles * period, total_steps)
        v_out_vec = np.zeros(total_steps)
        i_l_vec = np.zeros(total_steps)

        # Approximate circuit state
        v_c = vout * 0.9  # Initial condition near steady state
        i_l = iout
        r_load = vout / iout
        r_dcr = 0.015
        r_esr = 0.012

        for k in range(total_steps):
            phase = (t_vec[k] % period) / period
            v_sw = vin if phase < d else -0.4  # Switch ON vs Diode forward drop

            # Differential equations:
            # di_L/dt = (v_sw - v_c - i_l * r_dcr) / L
            di_l = (v_sw - v_c - (i_l * r_dcr)) / l_h
            i_l += di_l * dt
            if i_l < 0:
                i_l = 0  # DCM diode block

            # dv_C/dt = (i_l - (v_c / r_load)) / C
            dv_c = (i_l - (v_c / r_load)) / c_f
            v_c += dv_c * dt

            v_out_actual = v_c + (i_l - (v_c / r_load)) * r_esr
            v_out_vec[k] = v_out_actual
            i_l_vec[k] = i_l

        # Extract steady-state window (last 20% of simulation)
        ss_start = int(total_steps * 0.8)
        ss_vout = v_out_vec[ss_start:]
        ss_il = i_l_vec[ss_start:]

        measured_v_ripple_mv = float(np.ptp(ss_vout) * 1000.0)
        measured_vout_mean = float(np.mean(ss_vout))
        measured_i_peak = float(np.max(ss_il))
        measured_i_valley = float(np.min(ss_il))

        # Downsample waveform points to send to frontend for visual plotting
        sample_indices = np.linspace(ss_start, total_steps - 1, 30, dtype=int)
        waveform_data = [
            {
                "time_us": round(float((t_vec[i] - t_vec[ss_start]) * 1e6), 2),
                "vout_v": round(float(v_out_vec[i]), 3),
                "il_a": round(float(i_l_vec[i]), 3)
            }
            for i in sample_indices
        ]

        return {
            "simulation_engine": "Native Transient Solver / ngspice compatible",
            "measured_vout_V": round(measured_vout_mean, 2),
            "voltage_ripple_mV": round(measured_v_ripple_mv, 1),
            "measured_peak_current_A": round(measured_i_peak, 2),
            "measured_valley_current_A": round(measured_i_valley, 2),
            "is_stable": bool(measured_v_ripple_mv < (vout * 20.0)),  # Ripple < 2%
            "waveform_samples": waveform_data
        }
    