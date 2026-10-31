# Communications Laboratory

## Modbus register model

AQUA-CORE includes holding registers, input registers, coils and discrete inputs as in-memory structures. The UI permits reads/writes against the simulator. The module also provides an MBAP frame encode/decode helper for protocol-shape demonstrations.

Supported modeled function-code operations:

- FC01 Read Coils
- FC02 Read Discrete Inputs
- FC03 Read Holding Registers
- FC04 Read Input Registers
- FC05 Write Single Coil
- FC06 Write Single Register
- FC16 Write Multiple Registers (range validation occurs before commands are queued)

FC15 is not currently exposed. The MBAP helper is not a TCP socket or a Modbus TCP server. No port 502 is opened and no packet is exchanged with a device.

### Holding register map (4xxxx)

| Address | Tag / meaning | Access | Scaling / values |
|---:|---|---|---|
| 40001 | Operating mode command | R/W | 0 OFF, 1 AUTO, 2 MANUAL |
| 40002 | Command word | R/W | bit 0 Start, bit 1 Stop, bit 2 Reset trip, bit 3 Ack |
| 40003 | Command source (reserved) | R/O | 0 HMI, 1 Modbus, 2 Test harness (reserved status field) |
| 40004 | PIC-401 setpoint | R/W | 0.01 bar/count; accepted 0.50–5.50 bar |
| 40005 | LIC-101 setpoint | R/W | 0.1 %/count; accepted 10–90 % |
| 40006 | FIC-201 setpoint | R/W | 0.01 m³/h/count; accepted 0–10 m³/h |
| 40007 | AIC-301 setpoint | R/W | 0.01 pH/count; accepted 6.80–7.60 |
| 40008 | Backwash request | R/W | 0 none, 1 Filter A, 2 Filter B |
| 40009 | Packaging enable | R/W | 0 Disable, 1 Enable |
| 40010 | VFD speed limit | R/W | 0.1 %/count; accepted 0–100 % |
| 40011 | HMI heartbeat | R/W | Stored test counter; no external watchdog endpoint |
| 40012 | Fault injection control | R/W | Reserved for future test-mode gating |

### Input register map (3xxxx)

| Address | Meaning | Scaling |
|---:|---|---|
| 30001 | PLC state | 0 stopped/off, 1 active, 2 tripped |
| 30002 | Scan counter low word | count |
| 30003 | Last scan runtime | ms |
| 30004 | TK-101 level | 0.1 %/count |
| 30005 | FIT-101 flow | 0.01 m³/h/count |
| 30006 | PIT-102 pressure | 0.01 bar/count |
| 30007–30008 | Filter A/B differential pressure | 0.01 bar/count |
| 30009 | AIT-301 pH | 0.01 pH/count |
| 30010 | TK-401 level | 0.1 %/count |
| 30011 | FIT-401 flow | 0.01 m³/h/count |
| 30012 | PIT-401 pressure | 0.01 bar/count |
| 30013 | AIT-401 conductivity proxy | µS/cm/count |
| 30014 | Pump availability bitmask | bit 0 P-101A, bit 1 P-101B, bits 2–4 P-401A/B/C |
| 30015–30016 | Active / unacknowledged alarm count | count |
| 30017–30018 | Filter A/B state | 0 service, 1 isolated, 2 precheck, 3 backwash, 4 rinse, 5 return, 6 fault |
| 30019–30020 | Accepted / rejected packages | low 16 bits |
| 30021 | Signal quality summary | bitmask |
| 30022 | E-STOP status | 0 normal, 1 active, 2 reset required |
| 30023 | Communications health | 0 simulated connected, 1 simulated disconnected |
| 30024 | Historian buffer indicator | current implementation ratio proxy, not disk utilization |

### Coils and discrete inputs

Coils 1–8 expose selected mode/trip/run status. Coils 9–12 are command pulse points (Start, Stop, Reset, Acknowledge). Discrete inputs 10001–10010 expose tank switches, pump faults, packaging guard status, E-STOP health and bottle presence.

### Protocol behavior

Invalid addresses/quantities and invalid values return Modbus-style exception structures. FC16 validates the full range before queuing any command so a rejected batch does not partially execute. Register writes are audited in the local simulator.

## OPC UA-shaped information model

The local address space has a root `AquaCorePlant`, area objects (Intake, Filtration, Dosing, Distribution, Packaging, Equipment, Measurements, ControlLoops, Alarms, Diagnostics), and variable nodes shaped as `ns=2;s=<Tag>.Value`.

The model supports local `read`, `browse` and callback `subscribe` functions. It exposes type, value, engineering unit, timestamp, quality/status and access-level metadata. It does **not** implement OPC UA wire encoding, endpoint discovery, server certificates, session security, subscriptions over a network or client interoperability.

## Real-device integration path

A separate gateway would be required to bridge a web UI to Modbus TCP or OPC UA. That gateway must define authentication, authorization, network segmentation, command validation, write allow-lists, timeout behavior, audit logging and a safe failure mode. Do not place an untrusted browser directly on an OT control network.
