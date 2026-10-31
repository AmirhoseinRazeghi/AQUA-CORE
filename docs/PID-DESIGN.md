# PID Control Loops

## Controller form

The software controller uses a bounded parallel-form approximation:

`u* = bias + Kp·e + integral + Kd·filtered_d(PV)`

`u = clamp(u*, umin, umax)`

The integral update is inhibited when saturation and error would drive the output farther into saturation (conditional-integration anti-windup). Derivative action is based on PV change and smoothed with a first-order filter. The controller can be switched to MANUAL with a bounded manual output and then returned to AUTO with a tracking-based integral initialization.

## Loop register

| Loop | Tag | PV | SP (default) | Output role | Action |
|---|---|---|---:|---|---|
| LIC-101 | LIC101 | LIT-101 | 55 % | Intake pump speed reference | Reverse acting for a tank whose outlet pump drains inventory |
| FIC-201 | FIC201 | FIT-101 | 8.00 m³/h | FCV-201 position reference | Direct acting |
| PIC-401 | PIC401 | PIT-401 | 3.00 bar | Distribution pump speed demand | Direct acting |
| AIC-301 | AIC301 | AIT-301 | 7.20 pH | Dosing rate proxy | Direct acting |

## Initial tunings

Values below are simulation starting points, not commissioning recommendations.

| Loop | Kp | Ki | Kd | Bias | Output range |
|---|---:|---:|---:|---:|---:|
| LIC101 | 3.4 | 0.05 | 0.10 | 0 | 0–100 % |
| FIC201 | 8.0 | 0.30 | 0 | 0 | 0–100 % |
| PIC401 | 18.0 | 0.65 | 0.20 | 45 | 0–100 % |
| AIC301 | 9.0 | 0.12 | 0 | 48 | 0–100 % |

## Runtime rules

- The update interval is the configured logical PLC scan interval.
- If PV quality is not GOOD, the controller holds its last bounded output.
- The HMI validates setpoints against loop-specific bounds.
- `SET_PID_TUNINGS` validates non-negative gain values up to the implemented software ceiling.
- `SET_SPEED_LIMIT` limits VFD output references globally in the simulated PLC.

## Tuning procedure for this model

1. Start from default tunings and confirm the process reaches a stable state.
2. Change only one parameter at a time.
3. Observe PV, SP, output, saturation and historian trend.
4. Inject a disturbance and verify recovery without persistent saturation.
5. Record the final tuning set and the specific scenario used.

Do not use the displayed values on real equipment. No plant identification, actuator characterization or commissioning data was supplied for this training model.
