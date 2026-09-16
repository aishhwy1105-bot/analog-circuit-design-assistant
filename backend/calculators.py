import math

class CircuitCalculator:
    @staticmethod
    def calculate_buck(vin: float = 12.0, vout: float = 5.0, iout: float = 2.0, fsw_khz: float = 500.0):
        # Guard rails
        if vin <= vout:
            vin = vout + 2.0

        d = (vout / vin) * 100.0  # Duty cycle %
        period = 1.0 / (fsw_khz * 1000.0)

        # Standard current ripple ratio (30% to 40%)
        r = 0.35
        delta_il = iout * r
        il_peak = iout + (delta_il / 2.0)
        il_valley = max(0.0, iout - (delta_il / 2.0))

        # Target inductance: L = (Vin - Vout) * D / (fsw * delta_IL)
        l_ideal = ((vin - vout) * (vout / vin)) / ((fsw_khz * 1000.0) * delta_il)
        l_ideal_uh = l_ideal * 1e6

        # Standard E12 inductor sizes
        e12 = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8, 10.0, 15.0, 22.0, 33.0, 47.0]
        selected_l = min(e12, key=lambda x: abs(x - l_ideal_uh))
        if selected_l < l_ideal_uh:
            idx = e12.index(selected_l)
            if idx < len(e12) - 1:
                selected_l = e12[idx + 1]

        # Output capacitor: target ~1% ripple
        v_ripple_target = vout * 0.01
        cout_min = delta_il / (8.0 * (fsw_khz * 1000.0) * v_ripple_target)
        cout_min_uf = cout_min * 1e6

        standard_caps = [10.0, 22.0, 47.0, 100.0]
        selected_cout = next((c for c in standard_caps if c >= cout_min_uf), 47.0)

        # Feedback network for a typical 0.8V reference
        vref = 0.8
        r2_kohm = 10.0
        r1_kohm = round(r2_kohm * ((vout / vref) - 1.0), 2)

        return {
            "topology": "Synchronous/Asynchronous Buck Converter",
            "operating_mode": "Continuous Conduction Mode (CCM)",
            "vin_nominal_V": vin,
            "vout_target_V": vout,
            "iout_rated_A": iout,
            "fsw_kHz": fsw_khz,
            "duty_cycle_pct": round(d, 2),
            "inductor": {
                "calculated_uH": round(l_ideal_uh, 2),
                "selected_standard_uH": selected_l,
                "peak_current_A": round(il_peak, 2),
                "min_saturation_current_A": round(il_peak * 1.25, 2)
            },
            "input_capacitor": {
                "selected_uF": 22.0,
                "voltage_rating_min_V": round(vin * 1.5, 1)
            },
            "output_capacitor": {
                "selected_uF": selected_cout,
                "max_esr_mohm": 25.0,
                "voltage_rating_min_V": round(vout * 1.5, 1)
            },
            "feedback_network": {
                "r1_kohm": r1_kohm,
                "r2_kohm": r2_kohm
            },
            "system_metrics": {
                "estimated_efficiency_pct": 92.5
            }
        }