# Limitations, Cybersecurity and Safety Boundary

## Not for operational use

AQUA-CORE is a demonstrator. It must not be connected to or used to control real pumps, valves, filters, chemical dosing equipment, machinery, utility systems or safety circuits.

## No safety certification

The software E-STOP, interlocks and trip latch are pedagogical control-logic features. They do not implement a safety relay, safety PLC, dual-channel input, monitored contactor, safe torque off, validated reset circuit, safety lifecycle, SISTEMA calculation, SIL/PL verification or machinery compliance. No SIL, PL, category or risk-reduction claim is made.

## No hard real-time guarantee

The 50 ms scan is a logical target scheduled by `requestAnimationFrame`. Browser timer throttling, operating-system scheduling, power management and tab visibility can change actual execution intervals. The clock records scan duration and scheduler drift; it does not guarantee a deterministic control period.

## Protocol boundary

The Modbus module models register semantics and MBAP framing only. It does not open a TCP socket or port 502. The OPC UA-shaped data model is not an OPC UA server. A separate gateway/server would be required for interoperability.

## Process-model boundary

Tank, pump, valve, filter, header-pressure and pH models are simplified. They omit detailed fluid properties, NPSH, pipe-network hydraulics, pump curves, cavitation, transients, sensor calibration, chemistry, filter media behavior, thermal effects, energy balance and equipment vendor limits. Parameters are illustrative values created for the simulator.

## Cybersecurity guidance

- Do not expose real OT devices directly to an internet-facing browser application.
- If a gateway is added, use network segmentation and a dedicated industrial DMZ.
- Use authentication, least privilege, write allow-lists, command validation, logging and timeouts.
- Treat all browser inputs and uploaded session data as untrusted.
- Do not store passwords, tokens, API keys or private plant data in this repository.
- Review dependencies and GitHub Actions permissions before deployment.

The design is informed by OT-security concepts in NIST SP 800-82, but this project has not undergone a formal security assessment.

## Browser storage and privacy

The app stores a small tag-state snapshot in localStorage when available. Historian data remains in memory unless exported. The application makes no network requests at runtime. Users should still avoid placing confidential operational data into a public repository or public session export.
