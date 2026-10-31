# Alarm & Event Management

## Lifecycle model

Each defined alarm has a unique ID, description, source tag, priority, condition text, consequence and operator action. Runtime states are:

- `NORMAL`
- `ACTIVE_UNACK`
- `ACTIVE_ACK`
- `RTN_UNACK` (returned to normal but not acknowledged)

An activation and return-to-normal create events. Acknowledgement is an operator action and does not clear the process cause. Event records carry sequence number, alarm ID, event type, priority, tag, timestamp and response guidance. The in-memory event list is bounded by configuration.

## Priority convention

- **P1:** immediate operator attention; protective action or significant process consequence.
- **P2:** high-priority abnormal condition requiring prompt response.
- **P3:** warning / maintenance or process deviation.
- **P4:** informational (reserved; no P4 alarm currently defined).

These labels are illustrative. They are not the result of a formal alarm rationalization, consequence analysis or ISA-18.2 lifecycle assessment.

## Alarm list

| ID | Condition | Priority |
|---|---|---|
| ALM-001 | TK-101 low-low | P1 |
| ALM-002 | TK-101 low | P3 |
| ALM-003 | TK-401 low-low | P1 |
| ALM-004 | TK-401 high-high | P1 |
| ALM-005 / 006 | P-101A / P-101B drive fault | P2 |
| ALM-007 / 008 / 009 | P-401A / B / C drive fault | P2 |
| ALM-010 / 011 | Filter A / B high differential pressure | P3 |
| ALM-012 | Filter A differential pressure trip | P2 |
| ALM-013 | AIT-301 bad quality | P2 |
| ALM-014 | Product pH outside model band | P2 |
| ALM-015 | Header high pressure | P1 |
| ALM-016 | E-STOP active | P1 |
| ALM-017 | Packaging guard open | P1 |
| ALM-018 | Conveyor jam | P2 |
| ALM-019 | LIT-101 bad quality | P2 |
| ALM-020 | PIT-401 stale communication | P2 |

## Operator response pattern

1. Identify the first-out alarm and related process trends.
2. Confirm signal quality and equipment feedback.
3. Remove or correct the modeled cause.
4. Acknowledge after the alarm is understood.
5. Reset a trip only after the initiating condition is clear.
6. Return to AUTO deliberately; do not assume acknowledgement is a reset.

## Known simplifications

The current alarm engine evaluates boolean conditions each scan. Debounce, shelving, suppression, flood management, first-out arbitration, alarm grouping and formal consequence-based prioritization are not fully implemented. Alarm timestamps use browser wall-clock time rather than a synchronized plant time source.
