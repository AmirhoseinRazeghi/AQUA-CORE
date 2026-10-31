# Structured Text Runtime — Supported Subset

## Purpose

The browser contains a small lexer/parser/interpreter intended to demonstrate a PLC-like execution model. It is inspired by IEC 61131-3 Structured Text syntax but is **not a complete implementation of IEC 61131-3** and does not claim vendor compatibility or formal conformance.

## Supported program shape

```iecst
PROGRAM Example
VAR
    TankLevel : REAL;
    StartCmd  : BOOL;
    PumpRun   : BOOL;
END_VAR

IF StartCmd AND (TankLevel > 10.0) THEN
    PumpRun := TRUE;
ELSE
    PumpRun := FALSE;
END_IF;
END_PROGRAM
```

## Implemented language elements

| Element | Status |
|---|---|
| `PROGRAM` / `END_PROGRAM` | Supported |
| `VAR` / `END_VAR` declarations | Supported |
| `BOOL`, `INT`, `DINT`, `REAL`, `TIME`, `STRING` | Supported type names within the implemented runtime model |
| `:=` assignment | Supported |
| `IF`, `ELSIF`, `ELSE`, `END_IF` | Supported |
| Arithmetic `+ - * /` | Supported |
| Comparisons `= <> < <= > >=` | Supported |
| Boolean `AND OR NOT` | Supported |
| Parentheses | Supported |
| Numeric/boolean/string literals | Supported |
| Whitelisted built-ins | Limited; see interpreter source for exact names |

The current parser does not implement all standard syntax, user-defined data types, arrays, structures, pointers, methods, function declarations, function-block declaration semantics, `CASE`, `FOR`, `WHILE`, `REPEAT`, task configuration or vendor extensions. Unsupported constructs should fail compilation rather than being silently ignored.

## Execution model

1. Source is tokenized by the lexer.
2. The parser builds a bounded abstract syntax tree.
3. Declarations initialize the interpreter environment.
4. External inputs are copied into the program environment before execution.
5. Statements execute in source order.
6. Declared outputs are returned to the scan engine and combined with other controller logic.

The program is interpreted in JavaScript; ST code is not translated into native PLC machine code. The PLC program visible in the HMI is the actual source consumed by this interpreter, not decorative text.

## Function blocks

The function-block library contains software classes for `TON`, `TOF`, `TP`, `R_TRIG`, `F_TRIG`, `CTU`, `CTD`, `SR` and `RS`. They are JavaScript function-block models. The built-in intake ST program is separate from these classes; the current demo uses a dedicated JavaScript PID implementation for the four continuous loops.

## Compile and apply

On the PLC Engineering page, edit the program and choose **Compile & load**. A successful compile replaces the running interpreter program for subsequent scans. A compile error is reported in the diagnostics pane and leaves the last successfully compiled program loaded.

## Extending the language safely

Add a grammar production, AST node and evaluator path together. Add positive and negative tests for the new syntax. Never use JavaScript `eval`, `Function` constructors or arbitrary property access to execute user text. Preserve explicit variable/type rules and a whitelist for function calls.
