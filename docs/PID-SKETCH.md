# Simplified P&ID Sketch (Text Form)

```text
  RAW WATER SOURCE
        |
        |  4.2 m3/h source model
        v
    +---------+      LIT-101 / ZSL-101 / ZSH-101
    | TK-101  |-------------------------------------> PLC-SIM-01
    +---------+                                          |
        |                                                |
   +----+----+                                           |
   |         |                                           |
 P-101A   P-101B <----------- duty/standby --------------+
   |         |
   +----+----+
        |
   +----+-----------------------------------------------+
   |                                                    |
 [F-201A]                                             [F-201B]
 DPIT-201A                                           DPIT-201B
   |                                                    |
   +--------------------+-------------------------------+
                        |
                     FCV-201
                        |
                 D-301 / P-301
                        |
                     AIT-301
                        |
              +---------+---------+
              |                   |
           ACCEPT               REJECT
              |                   |
          +-------+             +-------+
          | TK-401|             |TK-301R|
          +-------+             +-------+
              |
       +------+------+------+
       |             |      |
     P-401A        P-401B P-401C
       |             |      |
       +------+------+------+
              |
           PIT-401
              |
       DISTRIBUTION HEADER
              |
        PK-501 DEMO CELL
```

This is a logical connectivity sketch only. It is not a CAD P&ID and does not define line classes, pipe sizes, valve fail positions, instrument hook-ups, hazardous-area classifications, relief devices or construction details.
