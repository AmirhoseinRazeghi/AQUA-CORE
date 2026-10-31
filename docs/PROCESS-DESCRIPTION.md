# Process Description & Simplified P&ID

## Scope

The model represents a compact water-treatment and distribution train, ending with a small packaging cell. It is deliberately simplified for control education. The model does not represent a complete municipal or industrial water-treatment design.

## Process narrative

### Area 100 — Raw-water intake

Incoming raw water enters `TK-101` (20 m³ nominal capacity). `LIT-101` measures normalized tank level. Duty/standby pumps `P-101A/B` draw from the tank and feed the filtration section. The intake ST program selects Pump A while healthy and Pump B as fallback when A is faulted. Low-low and high-high level conditions inhibit intake pump commands.

### Area 200 — Filtration

Two parallel filter vessels `F-201A/B` operate in service. Each filter has a differential-pressure model (`DPIT-201A/B`) whose pressure drop rises with throughput and loading. A backwash sequence isolates one filter while requiring the alternate filter to remain in service. The modeled sequence contains precheck, isolation, backwash, rinse, return and verification phases. The 90 s backwash and 60 s rinse are simulated-time durations, not real equipment timings.

### Area 300 — Dosing / quality proxy

A dosing pump proxy (`P-301`, `D-301`) adjusts a first-order pH state. `AIT-301` measures the modeled outlet pH. If pH is outside the configured acceptance band or analyzer quality is invalid, the model diverts product flow from the clearwell path to a reject collection tank. The model is educational and is not a chemical dosing design or a water-quality guarantee.

### Area 400 — Storage and distribution

Filtered/accepted water enters `TK-401` (15 m³ nominal capacity). `LIT-401` measures level. Parallel pumps `P-401A/B/C` serve a distribution header; `PIT-401` measures header pressure and `PIC-401` controls pump demand. The simplified lead/lag logic can change the lead pump after a modeled fault. A high-pressure condition stops modeled distribution pumps and latches the trip state.

### Area 500 — Packaging cell

A small bottle line demonstrates discrete sequencing: wait for bottle → index → fill → fill inspection → cap → accept/reject. A guard-open condition or conveyor jam inhibits the cell. Underfill and capper fault scenarios route the product to reject. This area is a demonstration of interlocks and discrete control, not a complete packaging-machine safety design.

## Simplified flow path

```text
RAW SOURCE
   │
   ▼
TK-101 ── P-101A/B ── F-201A/B ── D-301 / AIT-301 ──┬── Good water ── TK-401
                                                     │                    │
                                                     └── Reject ─ TK-301R │
                                                                          ▼
                                                                  P-401A/B/C
                                                                          │
                                                                       PIT-401
                                                                          │
                                                                      USERS
                                                                          │
                                                              Packaging demonstration
```

## Simplified equipment data

| Tag | Equipment | Model basis | Main feedback / purpose |
|---|---|---|---|
| TK-101 | Raw-water tank | 20 m³ | Level; low/low-low/high-high permissives |
| P-101A/B | Intake pumps | 4.6 m³/h nominal each | Speed, run, fault, current proxy |
| F-201A/B | Filter vessels | 4 m³/h nominal each | Differential pressure, loading, sequence state |
| XV-201A/B | Isolation valves | 2 s modeled travel | Position and mismatch fault |
| FCV-201 | Flow control valve | 1.2 s modeled travel | Flow controller output |
| D-301 / P-301 | Chemical dosing proxy | First-order pH response | pH, dosage output |
| TK-401 | Clearwell | 15 m³ | Level and high/low conditions |
| P-401A/B/C | Distribution pumps | 4.2 m³/h nominal each | Speed, run, fault, current proxy |
| TK-301R | Reject collection | 2 m³ | Rejected-stream inventory |
| PK-501 | Packaging cell | 1 L bottle model | Discrete sequence state and counts |

## Model equations

Tank balance:

`V[k+1] = clamp(V[k] + (Qin - Qout) × Δt / 3600, 0, Vmax)`

Normalized tank level:

`Level[%] = 100 × V / Vmax`

Pump flow approximation:

`Qpump = Qnominal × Speed[%]/100 × HydraulicFactor`

Filter differential-pressure approximation:

`ΔPfilter = ΔPclean + 0.42 × Loading + 0.012 × Qfilter`

Header-pressure target (simplified):

`Ptarget = min(6 bar, 0.55 + 0.29 × Qdistribution)`

pH proxy:

A first-order response approaches a dose-dependent target with the configured time constant. It is not a chemical equilibrium model.

## Units and scaling

Flow is m³/h; tank volume is m³; pressure is bar; pH is dimensionless; conductivity is µS/cm; time constants are seconds; analog output references are percent. Displayed levels are percent of tank capacity.
