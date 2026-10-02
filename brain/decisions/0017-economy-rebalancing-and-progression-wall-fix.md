# ADR 0017 — Economy Rebalancing, Dimension Shift Scaling and Progression Wall Fix

**Date:** 2026-10-02 | **Status:** Accepted | **Version:** v0.19.0 candidate

## Context

Players encountered a hard softlock after reaching Level 5 of Akış Sıçraması (Dimension Shift / Boost). The requirement jumped from 25 D8 to 2,500 D8 (`25 * 100^(shifts - 4)`).
Because D8 has a base cost of $10^{24}$ and a cost multiplier of $10^{15}$ per 10 bought, purchasing 2,500 D8 requires 250 purchases totaling $10^{3759}$ Dopamine. Since the Singularity (prestige) threshold is $1.797 \times 10^{308}$, reaching Shift 6 was physically impossible.
Furthermore, players at Shift 5 could at most earn $10^{80} - 10^{99}$ Dopamine, allowing 50 to 60 D8 to be purchased. Galaxy 1 had a requirement of 100 D8 ($10^{159}$ Dopamine), leaving the player completely blocked between Shift 5 and Galaxy 1.

Additional deep audits revealed:
- `BASE_SHIFT_POWER` was nerfed to 1.07 (+7%), trivializing resets and severely throttling compounding growth.
- `AUTOBUYER_PROGRESS_REQ` allowed D7 and D8 autobuyers to unlock at Shift 2, before D7 (Shift 3) and D8 (Shift 4) were even unlocked.
- Challenge 7 (Hesap Kısıtlaması) used an exponential step for D6 amounts, requiring $10^{503}$ Dopamine for a single Galaxy in a challenge capped at $1.79 \times 10^{308}$, and the UI hardcoded D8 in the Galaxy card.
- Challenge 5 (Gece Enflasyonu) never cleared inflation on prestige, leading to costs exceeding $10^{308}$ after ~1,700 purchases.
- Challenge 4 (Sansür Matrisi) set even dimension production to 0 without routing odd dimensions to the lower odd tier, causing production to vanish into D2 and making completion take $10^{260}$ years.
- Neural Tree was missing `break_singularity` and `guilt_immunity`, breaking Break Singularity autobuyer functionality past e308 and locking the `gui_drug` achievement.
- SP gain formula truncated at the threshold due to a premature `Decimal.floor`.

## Decision

1. **Shift Requirement Linear Scaling:**
   Replace `25 * 100^(shifts - 4)` with standard linear scaling `20 + 15 * (shifts - 4)`.
   Shift 4: 20 D8 ($10^{39}$). Shift 5: 35 D8 ($10^{69}$). Shift 6: 50 D8 ($10^{84}$). Shift 7: 65 D8 ($10^{99}$). Shift 8: 80 D8 ($10^{114}$).
2. **Galaxy Requirement Calibration:**
   Calibrate galaxy requirement to `40 + state.galaxies * 20` (Galaxy 1: 40 D8 = $10^{69}$ Dopamine; Galaxy 2: 60 D8; Galaxy 3: 80 D8). For C7, scale smoothly using D6 with a 1.5x factor.
3. **Shift Power Multiplier:**
   Set `BASE_SHIFT_POWER = 2.0` (C7 reward: 2.2x), matching reference incremental game standards.
4. **C5 & C4 Challenge Engine Fixes:**
   In C5, clear `challengeCostInflation = 0` on Shift and Galaxy.
   In C4, connect the odd dimension chain: $D_7 \to D_5 \to D_3 \to D_1$.
5. **Autobuyer Unlock Alignment:**
   Fix `dim7: { shifts: 3 }, dim8: { shifts: 4 }`.
6. **Neural Tree Completion & SP Gain:**
   Add `guilt_immunity` and `break_singularity` to `NEURAL_TREE` and sync to legacy state. Ensure `singularityGain` guarantees at least 1 SP and scales properly with multipliers.
7. **UI Consistency:**
   Update `DimensionsTab.vue` to dynamically display the required tier for Galaxies (D6 in C7, D8 otherwise) and show the next boost value (`×2.0 Boost`) on the Shift button.

## Validation

Simulations run via `brain/scratchpad/simulate-economy.js`:
- Galaxy 1 reached at ~1h 21m (40 D8).
- Galaxy 2 reached at ~2h 50m (60 D8).
- Continuous, smooth progression to $1.79 \times 10^{308}$ in 3.5 to 4 hours with 0 softlocks, 0 NaNs, and 0 crashes.
