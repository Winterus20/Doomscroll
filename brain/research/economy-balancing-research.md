# Doomscroll Economy Balancing Research

**Date:** 2026-10-01  
**Scope:** Economy formulas, pacing, multiplier stacking, active/idle balance, and validation  
**Method:** Repository inspection, existing local playtest logs, and comparison with primary or developer-authored incremental-game references  
**Change policy:** Research only. No application source code was modified.

## Executive summary

The main economy problem is not that the dimension cost curve is inherently wrong. It is that several strong systems are available too early and then multiply together without a shared power budget.

The highest-priority findings are:

1. The game starts with four dimensions available (`unlockedDimensionsCount = 4`), while `maxAll` can buy across all four dimensions every two seconds in the existing five-minute script. This creates a much earlier dimension cascade than the staged opening used by Antimatter Dimensions.
2. Resolution milestones are multiplied cumulatively even though their descriptions read as individual milestone values. Their cumulative factors become `×2, ×6, ×24, ×192, ×3,072, ×98,304`.
3. Collective milestones have the same ambiguity. The displayed milestone values imply a maximum of `×50`, but the implementation multiplies them to `×375,000`.
4. `napMultiplier` is saved, displayed, and increased by Power Nap, but it is not included in the production calculation. The prestige-like colony loop therefore currently grants no economic benefit.
5. The advertised `7 × 777 = 5,439×` resonance is not applied as a shared multiplier. The production path receives the 7× buff and the click path receives the 777× buff independently.
6. Repeatable active rewards are potentially much larger than their labels suggest. A Brainrot Remix harvest pays 7,200 seconds of production and can repeat after 75 seconds of growth, while “Sleep Denial” pays 1,800 seconds of production and can recharge from energy in about 50 seconds.

**Recommendation:** First make multiplier semantics and reset rewards correct and legible; then gate the first four dimensions and retune repeatable rewards. Preserve the project’s documented first-singularity ambition, but target a measured first run of roughly 2–4 hours and make the second run materially faster without making it instantaneous.

## Evidence and limits

### Repository evidence

The relevant formulas are in:

- `src/stores/game.ts`: dimension costs, tickspeed, production, multipliers, anomalies, lab rewards, crisis rewards, colony, and resets.
- `src/game/unlocks.ts`: feature unlock thresholds.
- `src/core/game-loop.ts`: fixed 20 TPS loop and offline simulation handoff.
- `GAME_DESIGN.md`: intended phases, active events, and prestige targets.
- `brain/decisions/0008-neural-colony-power-nap.md`: intended colony design.
- `brain/decisions/0009-feature-unlock-ladder.md`: intended unlock pacing.
- `brain/decisions/0010-hybrid-algorithm-studio-viral-matrix.md`: intended lab economy.

### Playtest evidence

The five-minute script is an intentionally active test, not an idle baseline. Every two seconds it:

- presses Space ten times;
- attempts `Max All`;
- attempts tickspeed;
- clicks the first four dimension purchase buttons when enabled.

Therefore, the log measures the economy under repeated active intervention and automatic purchasing. It is useful for detecting runaway acceleration, but it is not evidence that an unattended player reaches the same values.

The smoke-test log is a separate short interaction test. Its decimal comma is locale formatting, so `35,29` means approximately `35.29`.

## Current economy inventory

| System | Current implementation | Economic consequence |
|---|---|---|
| Starting dimensions | Four dimensions are available immediately: `min(8, 4 + dimensionShifts)` | D2–D4 can begin the production cascade before any staged unlock |
| Dimension bundle | A purchase grants 10 units at `baseCost × costMult^floor(bought / 10)` | This is a group-based AD-style curve, not a per-unit curve |
| Dimension base costs | `10, 100, 1e4, 1e6, 1e9, 1e13, 1e18, 1e24` | Closely follows the classic eight-dimension reference curve |
| Dimension cost multipliers | `1e3, 1e4, 1e5, 1e6, 1e8, 1e10, 1e12, 1e15` per ten purchased | Very large price jumps are offset by strong bundle and milestone multipliers |
| Regular dimension multiplier | `2^floor(bought / 10)` | A familiar, readable exponential milestone |
| Resolution milestones | 25/50/100/250/500/1000 with values 2/3/4/8/16/32, all multiplied together | A documented `×32` endpoint becomes cumulative `×98,304` before other bonuses |
| Tickspeed | Cost `1000 × 13^tickspeedBought`; default effect `(1 / 0.89)^tickspeedBought` | Each purchase is about `×1.124`, while price rises 13×; the payback must be checked rather than assumed |
| Collective milestones | 25/50/100/250/500/1000 with values 2/3/5/10/25/50, all multiplied together | A documented `×50` endpoint becomes cumulative `×375,000` |
| Local/global stacking | Shift, eye drops, mirror synergy, bass boost, tickspeed, stance, events, lab, collective, achievements, and colony can overlap | No common power budget prevents a few layers from dominating the entire run |
| Manual click | Collection base `1 + 0.25 × total bought`, then a 2% CPS addend and click/event bonuses | Early clicks are meaningful; later click value depends on active rewards and CPS synchronization |
| Anomalies | Base interval 45–75 seconds, three types, 14-second visibility; FYP 7× for 60 seconds, sponsor 900 seconds of CPS | If collected reliably, expected event value can rival or exceed the passive economy |
| Lab | Mature cells remain and reheat; rewards are paid in seconds of current production | Late repeatable cells can become the dominant source rather than a supporting active system |
| Colony | Core costs `1e13`; bots grow at `0.8%/s`; colony passive bonus is logarithmic | The colony’s intended sacrifice loop is sensible, but `napMultiplier` is not applied |
| Singularity | First reset at approximately `1e308`; gain is `floor(10^((log10(matter)-308)/308))` | 1 SP at the first reset, 10 SP only around `1e616`, and very large run-to-run spacing |

## Measured local observations

### Five-minute active log

| Checkpoint | Dopamine | Displayed rate |
|---:|---:|---:|
| 0 seconds | 14.3 | 42.19/s |
| 60 seconds | 283.06 M | 134.59 M/s |
| 120 seconds | 2.93 T | 325.24 B/s |
| 180 seconds | 1.13 Qa | 115.94 T/s |
| 240 seconds | 52.02 Qa | 3.91 Qa/s |
| Final stats after the run | 419.31 Qa | 19.65 Qa/s |

The rate multiplier between logged points was approximately:

- 42.19/s → 134.59 M/s: `×3.19 million`;
- 134.59 M/s → 325.24 B/s: `×2,417`;
- 325.24 B/s → 115.94 T/s: `×356`;
- 115.94 T/s → 3.91 Qa/s: `×33.7`;
- 3.91 Qa/s → 19.65 Qa/s: `×5.03`.

The final stats also report approximately **1,330 manual scrolls**, **757.64 Qa total produced**, **zero clicked crises**, and **zero resonance combos**. This means the run reached hundreds of quadrillions without exercising the event economy that is supposed to make active play distinctive.

This is not proof that the five-minute economy is universally too fast: the script deliberately uses Space, Max All, tickspeed, and repeated purchases. It is strong evidence that the current economy has a very steep active acceleration curve and that the first five minutes are dominated by purchase automation rather than the crisis/lab decisions.

### Smoke-test log

The short smoke test recorded:

- 10 initial dopamine;
- approximately 35.29 after 25 clicks;
- approximately 50.47 after a Space interaction;
- zero passive production before a dimension purchase;
- tickspeed disabled when unaffordable.

This confirms that the early manual loop works as a bootstrap. It does not establish a healthy mid-game click share.

## Findings from high-trust references

### Antimatter Dimensions: staged unfolding and automation

The original developer’s current source repository is [IvarK/AntimatterDimensionsSourceCode](https://github.com/IvarK/AntimatterDimensionsSourceCode), and the official game guide is [How to Play – Antimatter Dimensions](https://ivark.github.io/howto).

Relevant evidence:

- The game uses a cascading dimension structure in which higher dimensions produce the tier below.
- The classic economy uses eight dimensions, strong per-ten multipliers, tickspeed, dimension boosts, and galaxies.
- The guide describes dimension shifts/boosts as reset-like milestones that unlock or strengthen later dimensions.
- Automation is deliberately unfolded later. The current wiki summary of the official game lists dimension autobuyer thresholds from `1e40` through `1e110` total antimatter and tickspeed automation at `1e140`; this is secondary documentation, but it illustrates the intended separation between learning the manual loop and automating it.

**Evidence-based lesson:** A cascading dimension economy can grow quickly without exposing every dimension and every automation control at the start. The pacing comes from when the cascade is allowed to begin, not only from the cost exponents.

### Synergism: layered currencies, sacrifice, and complexity budget

The official open-source repository is [Pseudo-Corp/SynergismOfficial](https://github.com/Pseudo-Corp/SynergismOfficial), with the live game at [pseudonian.github.io/SynergismOfficial](https://pseudonian.github.io/SynergismOfficial/).

Relevant evidence:

- Synergism separates currencies and reset layers rather than making every bonus multiply the same primary production number immediately.
- Its sacrifice/ascension systems are meaningful because the reset currency has a distinct use and a persistent role.
- The live game presents taxes, challenges, run state, persistent upgrades, and automation as separate layers.

**Evidence-based lesson:** Cross-system depth is valuable when each system has a clear job. A Doomscroll multiplier should be attributable to a dimension, a temporary event, a lab build, or a reset layer; otherwise the player cannot identify why a purchase mattered.

### Orteil’s Idle Game Maker documentation: geometric costs and multiplicative effects

Orteil identifies himself as the creator behind Cookie Clicker on [his official homepage](https://orteil.dashnet.org/). His [Idle Game Maker Handbook](https://orteil.dashnet.org/igm/help.html) and [Idle Game Maker documentation](http://orteil.dashnet.org/experiments/idlegamemaker/help) describe the underlying patterns directly:

- building cost is a geometric curve, such as `base × growth^owned`;
- production is based on owned amount and multipliers;
- Cookie Clicker uses a 115% price-increase convention in the handbook example;
- percentage effects can stack multiplicatively.

**Evidence-based lesson:** Geometric cost growth is a good foundation, but price growth and effect growth must be tuned as a pair. A multiplier that is technically “only one more bonus” can be much larger when it is applied to every downstream production tier.

### Developer-authored economy math

Anthony Pecorella’s developer-authored [The Math of Idle Games, Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i) formalizes the core model:

```text
next cost = base cost × growth rate^owned
total production = base production × owned × multipliers
```

The article also warns that exponential costs eventually outrun polynomial production and recommends spreadsheet models for bulk costs, maximum affordable purchases, and generator balance.

His [Part III: Prestige Loops and Patterns](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii) compares prestige curves:

- square-root prestige currencies need roughly 4× more run currency to double;
- cube-root curves need roughly 8× more;
- very small exponents can intentionally demand much larger runs;
- prestige pacing should include both slow sections and fast milestone sections.

**Evidence-based lesson:** Use a sublinear prestige curve to make progress matter without making repeated resets identical. The exponent is a pacing control, not merely a mathematical detail.

## Specific balancing recommendations

The following are recommendations, not claims about what the current code already does.

### Priority 0: correct the economy’s stated semantics

1. **Make resolution milestones non-cumulative, or rename and retune them.**  
   Recommended default: use the highest reached milestone as the active resolution multiplier: `×2, ×3, ×4, ×8, ×16, ×32`. This makes the UI description truthful and keeps the regular `2^floor(bought/10)` curve meaningful. If cumulative milestones are intentional, reduce each individual factor and label the UI as cumulative.

2. **Make collective milestones non-cumulative, or explicitly present a cumulative curve.**  
   The current values read as “the current global bonus is 2×, 3×, 5×, 10×, 25×, or 50×,” while the implementation produces `×375,000` at the final threshold. Recommended default: take the highest reached collective value. This is the single largest multiplier ambiguity in the first-run economy.

3. **Apply Power Nap exactly once to production.**  
   `napMultiplier` should affect the intended global production path once and should not also be hidden inside the colony logarithmic bonus. Until it is applied, Power Nap is a progression dead end: it changes a saved number and the UI but not the economy.

4. **Choose one explicit resonance rule.**  
   If the theme requires a 5,439× moment, make it a bounded short-lived event or a capped instant payout. Do not let it silently become a permanent/global multiplier. If the intended behavior is separate production and click buffs, change the description from “5,439× super dopamine” to describe the two channels accurately.

### Priority 1: stage the first cascade

Recommended first-run exposure:

1. Start with D1.
2. Unlock D2 after a meaningful D1 ownership milestone.
3. Unlock D3 after D2 is established.
4. Unlock D4 after D3 is established.
5. Use the first shift to unlock D5, matching the existing thematic role of shifts.

If showing four rows at the start is important for the UI, keep D2–D4 visibly locked and show their requirements. Do not allow `Max All` to buy all four from the first seconds.

Suggested target windows for the first five to ten minutes:

| Milestone | Recommended target |
|---|---:|
| First D1 purchase | 5–20 seconds |
| First meaningful D1 multiplier | 30–90 seconds |
| First new dimension | 1–3 minutes |
| First crisis interaction | 2–4 minutes |
| First patch/upgrade decision | 3–5 minutes |
| Lab becomes a real choice | 5–8 minutes |
| First basic automation | 8–15 minutes |
| First shift | 15–30 minutes |

These are design targets for this project, not measurements from the references. They preserve a tactile opening while preventing the current five-minute script from skipping across the economy.

### Priority 2: retune costs by payback, not by isolated constants

For each purchase, calculate:

```text
payback seconds = purchase cost / production increase per second
```

Recommended guardrails:

- early core purchases: roughly 10–60 seconds of payback;
- mid-run purchases: roughly 30–180 seconds;
- late-run purchases: several minutes, followed by a visible milestone or reset objective;
- a purchase that costs more but produces less than its predecessor should have a clear unlock or strategic reason.

Keep the familiar dimension base-cost order initially. Change only one of the following at a time:

- when a dimension becomes available;
- its base cost;
- its per-ten cost multiplier;
- its milestone effect.

For tickspeed, the current effect is approximately `×1.124` per purchase while cost rises `×13`. Retain this only if the payback chart shows intentional early purchases. Otherwise test a slower cost ramp such as `×8–×10` or add a deliberate unlock gate. The exact replacement should come from the payback simulation, not from a genre-wide constant.

### Priority 3: put every multiplier into a power budget

Use three buckets:

1. **Persistent run multipliers:** dimensions, shifts, collective progress, and purchased upgrades.
2. **Persistent account multipliers:** achievements, SP upgrades, and Power Nap.
3. **Temporary active multipliers:** anomalies, crisis decisions, refresh, and Viral Drop.

Recommended first-singularity budget:

- persistent run multipliers should generally remain below about `×10–×30` before the first reset, excluding the normal dimension cascade;
- temporary events may create short spikes, but their expected average contribution should be approximately `×1.25–×2` over a full session;
- permanent account bonuses should make the next run faster, but should not remove its main decisions.

The `×10–×30` and `×1.25–×2` values are recommendations for playtesting, not external facts. The purpose is to prevent `×98,304` resolution, `×375,000` collective, achievements, lab, and events from being multiplied together before the player has learned their roles.

### Priority 4: rebalance repeatable active rewards

The current reward values should be tested as an average rate, not only as exciting one-time numbers.

| Reward | Current payout | Repeatability risk | Recommended starting test |
|---|---:|---|---|
| Sponsor anomaly | 900 seconds of CPS | At one event per 60 seconds with one-third sponsor outcomes, the theoretical average is about 5× CPS before missed clicks | Test 120–300 seconds, or add a bank-scaled cap |
| Sleep Denial | 1,800 seconds of CPS | 60 energy at 1.2 energy/s is about a 50-second recharge; theoretical average is about 36× CPS before backfire | Test 120–300 seconds plus a separate cooldown |
| Cat Audio harvest | 30 seconds of CPS every 15 seconds | About 2× CPS if harvested on cooldown | Plausible as an early active anchor |
| Mukbang harvest | 1,800 seconds every 50 seconds | About 36× CPS if continuously harvested | Reduce, add diminishing returns, or make the large payout discovery-only |
| Cat Burger harvest | 2,700 seconds every 50 seconds | About 54× CPS if continuously harvested | Same treatment |
| DriftTok harvest | 3,600 seconds every 60 seconds | About 60× CPS if continuously harvested | Same treatment |
| Brainrot Remix harvest | 7,200 seconds every 75 seconds | About 96× CPS if continuously harvested | Make it a one-time mutation reward or strongly cap repeat harvests |

A good active reward should create a reason to return, click, and make a decision. It should not make the passive production curve irrelevant after one mature cell.

### Priority 5: restore active/idle contrast

The current default Yorgan stance grants `×2` production, while Çılgın Kaydırma grants `×4` click power but no production bonus. Lab Evergreen grants `×2.5` passive lab production. Because mid-game manual clicks receive only 2% of CPS per click, a normal active player can be weaker than an idle player unless anomalies, spells, lab harvests, and refresh are used correctly.

Recommended target:

- ordinary idle play: 1.0× baseline;
- ordinary active play: 1.15–1.35× the idle result over the same period;
- a well-executed event window: 2–5× for 15–60 seconds;
- offline progress: approximately the normal idle baseline, not the active event baseline.

Specific adjustments to test:

1. Reduce the default passive stance to `×1.25–×1.5`, or give it a real trade-off.
2. Keep the current 2% CPS-to-click addend as a reasonable mid-game starting point; measure it at 1, 5, and 10 clicks per second.
3. Keep Çılgın Kaydırma’s click identity, but give it a controlled active-only benefit such as event collection, refresh charge, or a modest click-to-CPS conversion.
4. Reduce Evergreen from `×2.5` to approximately `×1.25–×1.75`, or make it disable Hype growth and active lab actions while selected.
5. Ensure event uptime is bounded. With a 45–75 second anomaly interval, a 60-second FYP event, and one-third FYP outcomes, perfect collection can produce roughly one-third uptime before stance and lab frequency bonuses. Lower the duration, lower the outcome frequency, or use a diminishing extension rule.

### Priority 6: make prestige pacing measurable

The existing project notes intentionally target a roughly three-hour first singularity. Retain a **2–4 hour first-singularity band** unless the product goal changes.

Use these reset targets:

- first singularity: meaningful but not daily-grind length;
- second run: approximately 50–70% of the first-run time;
- later runs: each should have a visible new decision, not only a larger number;
- first Power Nap: should shorten the next colony cycle without making the main run obsolete.

The current singularity formula gives approximately:

- `1e308` matter → 1 SP;
- `1e616` matter → 10 SP;
- `1e924` matter → 100 SP.

This is a valid long-tail curve, but it should be checked against SP-shop prices. If the player needs `1e616` merely to buy a second meaningful SP upgrade, the first prestige may feel like a one-time reset rather than a loop. A useful tuning method is to define SP targets first, then fit a fractional-exponent gain curve to those targets.

The ten-level `eye_drops` upgrade currently doubles station production per level, reaching `×1,024` at max level. Test a softer per-level effect, such as additive production or a diminishing exponent, if the SP shop begins to erase the run structure.

### Priority 7: validate offline behavior separately

The game loop uses fixed 50 ms updates, but `simulateOfflineProgress` runs detailed updates for at most 300 seconds and then applies the remaining time in a single large update. That is an implementation detail with economic consequences: timers, breeding, autobuyers, chain production, and event state can behave differently in a large update than during real play.

Before finalizing balance, compare:

- 1 hour actively open with no manual input;
- 1 hour closed/offline;
- 8 hours closed/offline;
- an offline period that crosses a reset or automation threshold.

Offline progress should be calibrated against passive production only. It should not silently simulate perfect event clicking, repeated lab harvests, or an unlimited active crisis strategy.

## Recommended validation plan

### 1. Build a deterministic economy harness

Use the existing formulas as data inputs, but run deterministic scenarios with a seeded random source. Do not tune from a single browser run.

Record, for each run:

- time to each dimension unlock;
- time to each feature unlock;
- time to first shift, first galaxy, first Power Nap, and first singularity;
- matter and production as `log10` values;
- cost-to-production payback for every purchase;
- contribution from clicks, passive production, anomalies, spells, lab, colony, and prestige bonuses;
- multiplier ledger by bucket;
- offline versus active production.

### 2. Test the following player profiles

| Profile | Input |
|---|---|
| New player | 0.5 clicks/s, buys only when a clear goal is affordable |
| Typical active | 2 clicks/s, checks the game every 10–20 seconds |
| Highly active | 5–10 clicks/s, collects events and uses Max All |
| Idle | No clicks, no event collection, passive stance |
| Returning player | 1–8 hour offline interval |
| Prestige optimizer | Resets at the first point where the next reset reward improves the next cycle materially |

### 3. Use explicit acceptance criteria

Recommended acceptance criteria for the next balance pass:

- no more than 3–5 meaningful feature decisions in the first five minutes;
- no single early multiplier contributes more than 10× without a clearly communicated milestone;
- active normal play is 15–35% better than passive play over the same interval;
- temporary event windows are exciting but do not dominate the whole session’s average;
- no repeatable reward produces more than roughly 2–5× CPS on average without a late-game unlock and an intentional trade-off;
- first singularity remains within the 2–4 hour target for the typical active profile;
- second-run time is 50–70% of the first-run time;
- a one-hour offline session is close to one hour of passive production and does not grant active-only rewards for free;
- every UI multiplier description matches the actual effective multiplier.

### 4. Playtest in two passes

**Pass A: semantic correctness**

- verify resolution and collective milestone totals;
- verify Power Nap changes production;
- verify resonance behavior matches its text;
- verify one reward payout equals the number shown in the UI;
- verify no reset accidentally removes or duplicates persistent bonuses.

**Pass B: pacing**

- run the six player profiles above;
- compare time-to-milestone charts;
- inspect purchase payback distributions;
- inspect the active/idle ratio;
- inspect the multiplier ledger at 1, 5, 15, 30, 60, and 180 minutes;
- repeat after every single curve change so causal effects remain visible.

## Final recommendation

Do not start by globally increasing all prices. First remove the three semantic economy defects: cumulative milestone ambiguity, unused Power Nap, and the mismatch between the resonance description and its implementation. Then stage the dimension cascade, cap repeatable active payouts, and retune by measured payback.

This preserves the strongest parts of Doomscroll—tactile clicking, surprise events, lab experimentation, and prestige—while preventing the current economy from becoming a purchase macro followed by opaque multiplier multiplication.

## Implementation status

The first economy pass was applied without changing the application architecture:

- Resolution and collective milestones now use the highest reached value instead of multiplying every prior milestone.
- Power Nap is applied once to production with a softened logarithmic reward curve.
- Espresso is a separate frequency buff; the fast-charge spell respects the anomaly capacity.
- Viral combo copy now describes the actual separate production and click channels.
- Lab and crisis repeatable rewards were reduced and Lab harvest payouts share an active-cell budget.
- Codex progress counts only synthesized recipe results, and save imports validate Decimal values, timers, buff types, and seed types.

The final active five-minute playtest recorded `244.71 Qa` total Dopamin and `6.37 Qa/s`, down from the earlier `757.64 Qa` and `19.65 Qa/s` baseline under the same scripted active route. This is an active stress test, not an idle target.

## Follow-up first-prestige simulation

The earlier 2–4 hour estimate was not reliable. A clean in-memory Pinia store was simulated through the browser with a seeded RNG, `0.1s` update steps, and the first Singularity threshold set to `log10(1.797e308) ≈ 308.254`.

| Profile | Side systems | First Singularity |
|---|---|---:|
| Active + side boosts | 5 clicks/s, Max All/Hz every 2s, all affordable patches, Lab, anomalies, spells, autobuyers, shifts and galaxies | **379.5s / 6.33 min** |
| Casual + side boosts | 2 clicks/s, purchasing and side actions every 10s, same affordable side systems | **1842.5s / 30.71 min** |
| Active, no side boosts | 5 clicks/s, Max All/Hz/dimension buying every 2s, no Lab/crisis/bots/resets | **Not reached in 2 hours**; `log10(Dopamin) ≈ 30.66` |

The side-boost profiles were assisted simulations rather than ordinary human play: they collected every visible anomaly, harvested every mature Lab cell, cast affordable crisis spells, and performed resets immediately. The result still proves that the side systems are currently an enormous acceleration layer. The previous 2–4 hour estimate should be rejected; the current economy reaches the first prestige in roughly **6–31 minutes under assisted active play**, depending on interaction frequency.

## Pacing recalibration

The follow-up simulation exposed a second root cause: higher dimensions were feeding the lower dimension at `1.0×` per second instead of the `0.1×` base rate used by the reference dimension-chain model. The final calibration therefore:

- restored the `0.1` higher-dimension chain rate;
- reduced the Shift production/click factor to `1.07^shifts`;
- made post-fourth Shift requirements grow as `25 × 100^(shifts - 4)`;
- reduced repeatable Lab, crisis, sponsor, and Viral Drop payouts to prevent current-CPS rewards from compounding the chain.

With the same clean in-memory store, seeded RNG, `0.1s` updates, and all side systems actively used, the first Singularity was reached at **13,938.0 seconds / 3.872 hours** with `log10(Dopamin) ≈ 308.255`. The run included 5 clicks every 2 seconds, Max All/Hz purchases, Lab, anomalies, spells, autobuyers, shifts, and galaxies.

## Sources

### Primary and developer-authored

- [IvarK/AntimatterDimensionsSourceCode](https://github.com/IvarK/AntimatterDimensionsSourceCode) — original developer’s open-source Antimatter Dimensions repository.
- [How to Play – Antimatter Dimensions](https://ivark.github.io/howto) — official game guide.
- [Pseudo-Corp/SynergismOfficial](https://github.com/Pseudo-Corp/SynergismOfficial) — official open-source Synergism repository.
- [Synergism live game](https://pseudonian.github.io/SynergismOfficial/) — current reference implementation.
- [Orteil’s homepage](https://orteil.dashnet.org/) — developer site identifying Orteil and Cookie Clicker.
- [Idle Game Maker Handbook](https://orteil.dashnet.org/igm/help.html) — Orteil-authored cost and effect documentation.
- [Idle Game Maker documentation](http://orteil.dashnet.org/experiments/idlegamemaker/help) — source-format documentation for price inflation and multiplicative effects.
- [The Math of Idle Games, Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i) — Anthony Pecorella’s developer-authored generator and cost models.
- [The Math of Idle Games, Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii) — Anthony Pecorella’s developer-authored prestige-curve analysis.

### Secondary reference used for comparison

- [Antimatter Dimensions Wiki – Automation](https://antimatterdimensions.wiki.gg/wiki/Automation) — community-maintained summary of official game automation thresholds and intervals.
- [Antimatter Dimensions Wiki – Dimensions](https://antimatterdimensions.wiki.gg/wiki/Dimensions) — community-maintained summary of the dimension cascade and its production implications.
