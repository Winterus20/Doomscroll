# ADR 0013 — Singularity Autobuyer, Break Singularity ve Faz 2 Kilometre Taşı

**Date:** 2026-10-01 | **Status:** Accepted | **Version:** v0.14.0 candidate

## Context

First Singularity pacing was fixed by ADR 0011 (~3.9 h first run). However, once the Neural Tree (Şafak Habercisi `dawnSpeedMult`) and SP upgrades compound, the reset loop shrinks below one second. The `singularityGain` formula is deliberately logarithmic (`10^((log10(matter) − 308)/308)`), so waiting is never rewarded; the degenerate end state is a "number watching screen" where Shift/Galaxy bots reset matter faster than the player can click the Singularity CTA.

Web research on reference models:

- **Antimatter Dimensions** ([Break Infinity wiki](https://antimatterdimensions.wiki.gg/wiki/Break_Infinity)): the Infinity threshold (1.8e308) never changes; a Big Crunch autobuyer automates the loop; Break Infinity lets matter exceed the threshold and adds super-exponential cost scaling as a pacing valve. IP gain ×10 per additional 1e308 — matching our existing `singularityGain` formula, which was therefore left untouched.
- **ExponentialIdle auto-prestige analysis** ([r/ExponentialIdle](https://www.reddit.com/r/ExponentialIdle/comments/muofsn/an_analysis_of_best_autoprestige_and/)): optimal trigger = prestige when the marginal ln-gain rate has been declining for a few seconds and the reward exceeds a meaningful floor. Chosen (user decision) over the simpler interval+min-gain AD model for its self-recalibration property.
- **Incremental Adventures guides** ([Steam guide](https://steamsolo.com/guide/basic-guide-updated-from-manowar999-s-kongregate-version-incremental-adventures/)): static thresholds cause endless low-layer reset churn; upper-layer gates must scale (log/root). This informed the Faz 2 milestone at 1e4000 from the GDD.

## Decision

1. **Şafak Nöbeti Botu (Singularity Autobuyer):** marginal-gain optimizer, not interval spam. Samples `log10(matter)` once per second (max 60 runtime samples, cleared on every matter reset). Triggers when: matter ≥ 1.79e308, projected SP gain ≥ user-configured floor (`minGainSp`, default 1), run ≥ 10 s, and the marginal growth (last-3s slope) has settled at or below the run-average slope for 3 consecutive seconds. While production accelerates, the marginal slope exceeds the average and the streak resets — waiting remains optimal; once the ramp flattens (including constant-slope linear production from autobuyers, where waiting yields nothing), the streak builds and the bot crunches silently (`singularityReset(false)`).
2. **Unlock:** requires ≥ 3 total singularities and 1.79e308 matter (bot cost), so it cannot shortcut the intended first-run experience.
3. **Break Singularity (`break_singularity` SP upgrade, 8 SP, 1 level):** while unbroken, the tekillik hold keeps Shift/Galaxy bots paused at e308 (the fix from the previous session). Once broken, `singularityHoldActive` is false and the bots resume normal behavior past the threshold.
4. **Faz 2 milestone (Kolektif Gece Nöbeti):** permanent `nightWatchUnlocked` flag at 1e4000 Dopamin with a locked progress card in SingularityTab. Corruption content explicitly out of scope; the card is the pacing signpost per the GDD faz ladder.
5. **Persistence:** `singularities` and `nightWatchUnlocked` added to save v9 payload (old saves fall back to `stats.singularityCount`); `minGainSp` added to the autobuyer serialization subset. Runtime optimizer state is never serialized.

## Consequences

- Post-fast pacing is automated and self-calibrating; manual clicking is no longer a bottleneck.
- Break Singularity makes the bot decision space meaningful again past e308 (hold vs. push).
- The marginal trigger is heuristic; super-exponential phases keep the streak at zero and the bot waits, which matches optimal play.
- Faz 2 content (Corruptions, talismans) still needs its own ADR when implemented.