# ADR 0011 — First Singularity Prestige Pacing Recalibration

**Date:** 2026-10-01 | **Status:** Accepted | **Version:** v0.13.1 candidate

## Context

The first Singularity was reached in 6–31 minutes when Lab, crisis, anomaly, autobuyer, Shift, and galaxy systems were all used. The intended first-prestige experience is a multi-hour overnight session, with a target of approximately 3–4 hours for a highly active run.

The simulation identified an economy defect in the dimension chain: higher dimensions produced the lower dimension at `1.0×` per second, while the reference incremental model uses a `0.1×` base rate. This multiplied across the seven-tier chain and made every side-system reward much more powerful than its local description suggested.

## Decision

1. Restore a `0.1` higher-dimension chain rate in the production update.
2. Use `1.07^shifts` for the Shift production and click bonus. Shifts remain valuable, but do not independently multiply the first run into a minute-scale prestige.
3. After the fourth Shift, require `25 × 100^(shifts - 4)` units of D8 for the next Shift. This creates an intentional late-run wall instead of linear requirements.
4. Keep the previously reduced repeatable Lab, crisis, sponsor, and Viral Drop payouts. They remain active incentives but no longer compound current production without a pacing budget.
5. Calibrate against the first Singularity threshold of `1.797e308` using a clean in-memory store and deterministic seeded simulation.

## Validation

The final simulation used `0.1s` updates and included:

- 5 manual clicks every 2 seconds;
- Max All, Hz, and dimension purchases;
- all affordable algorithm patches;
- Lab seeds and harvests;
- anomaly collection and crisis spells;
- autobuyers, Shift, and galaxy actions.

Result: **13,938.0 seconds / 3.872 hours**, with `log10(Dopamin) ≈ 308.255`, five Shifts, two galaxies, and all tested side systems active.

## Consequences

- The first prestige now matches the intended 3–4 hour session target under an aggressive active route.
- Casual or idle players will take longer.
- Later Singularity/SP upgrades may need a separate second-run calibration; this decision only establishes the first-run baseline.
- The dimension chain now matches the intended reference-model pacing assumption.
