/**
 * CLICK-CONTRIBUTION AUDIT (measurement only — no game code is modified)
 * ============================================================================
 * Soru: "Tıklama tuşu neden işe yaramıyor?" — cevapı ölçerek bulmak.
 *
 * Bu harness GERÇEK Pinia store'u (src/stores/game.ts) Node'da headless çalıştırır
 * ve her saniye şunu kaydeder:
 *
 *   clickDps        = manualClickPower × clicksPerSecond     (manuel kazanç/sn)
 *   passiveDps      = matterPerSecond                       (pasif kazanç/sn)
 *   clickShare      = clickDps / (clickDps + passiveDps)     (tıklamanın payı)
 *   clickVsCost     = bir tıklamanın değeri / mevcut D1 maliyeti
 *
 * Bir dokunuşun anlamlı sayılması için iki eşik arıyoruz:
 *   A) clickDps/passiveDps >= 0.10  → tıklama üretimin en az %10'unu taşımalı
 *   B) clickVsCost  >= 1.0          → bir tıklama bir boyut alımına yetmeli
 *
 * Ayrıca "tıklama hiçbir şeyi değiştirmiyor" bölgesini (clickShare < 1%) bulup
 * o andan itibaren oyuncunun tıklamayı bırakmasının bir simülasyonunu da
 * koşuyoruz: clickProfile açıkken ve kapalıyken aynı profile'in süresi.
 *
 * KULLANIM (repo kökünden):
 *   node brain/scratchpad/clickaudit/build.mjs
 *   node brain/scratchpad/clickaudit/out/audit.mjs --out brain/scratchpad/clickaudit/result.json
 *   node brain/scratchpad/clickaudit/out/audit.mjs --capHours 6 --cps 2
 */
import { createPinia, setActivePinia } from "pinia";
import { useGameStore, AUTOBUYER_COSTS } from "../../../src/stores/game";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Determinism: virtual clock + seeded RNG
// ---------------------------------------------------------------------------
let virtualNowMs = 1_700_000_000_000;
const realNow = Date.now;
Date.now = () => virtualNowMs;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TIME_TOL = 1e-9;

interface Row {
  t: number;
  logMatter: number;
  logDps: number;
  logClickPower: number;
  clickDps: number;
  clickShare: number;
  clickVsCost: number;
  shifts: number;
  bought: number[];
  comboUnlocked: boolean;
  cpsSyncLevel: number;
  stance: string;
}

interface RunResult {
  label: string;
  cps: number;
  seed: number;
  reached: boolean;
  timeSeconds: number | null;
  clickContributionAtEnd: number;
  rows: Row[];
  /** İlk kez clickShare < %1 olduğu an — "tıklama öldü" eşiği. */
  clickDeathAt: number | null;
  clickDeathLogMatter: number | null;
  /** clickShare hiç %1'in altına inmediyse null. */
  totalClicks: number;
  error: string | null;
}

function log10safe(d: { lte: (n: number) => boolean; log10: () => { toNumber: () => number } }): number {
  return d.lte(0) ? 0 : d.log10().toNumber();
}

async function runOnce(label: string, cps: number, seed: number, dt: number, capHours: number): Promise<RunResult> {
  Math.random = mulberry32(seed);
  virtualNowMs = 1_700_000_000_000;
  setActivePinia(createPinia());
  const store = useGameStore();

  const capSeconds = capHours * 3600;
  const rows: Row[] = [];
  let simTime = 0;
  let nextClickAt = 0;
  let nextPurchaseAt = 0;
  let nextRowAt = 0;
  let reached = false;
  let timeSeconds: number | null = null;
  let clickDeathAt: number | null = null;
  let clickDeathLogMatter: number | null = null;
  let clickContributionAtEnd = 0;
  let error: string | null = null;
  const clickInterval = cps > 0 ? 1 / cps : Infinity;

  // Strateji: casual-aktif oyuncu. Tıklama + maxAll + bot açma + shift/galaxy/sacrifice.
  const doPurchases = (): void => {
    store.maxAll();
    const ids = Object.keys(AUTOBUYER_COSTS)
      .filter((id) => {
        const bot = store.autobuyers[id];
        if (!bot || bot.unlocked) return false;
        if (!store.isAutobuyerRequirementMet(id)) return false;
        return store.matter.gte(AUTOBUYER_COSTS[id]);
      })
      .sort((a, b) => AUTOBUYER_COSTS[a].log10().toNumber() - AUTOBUYER_COSTS[b].log10().toNumber());
    for (const id of ids) store.unlockAutobuyer(id);
    if (!store.autobuyerBulkUnlocked && store.canUnlockBulk) store.unlockBulkMode();
    if (!store.autobuyerMaxUnlocked && store.canUnlockMax) store.unlockMaxMode();
    const mode = store.autobuyerMaxUnlocked ? "max" : store.autobuyerBulkUnlocked ? "bulk" : null;
    if (mode) {
      for (const id of Object.keys(store.autobuyers)) {
        const bot = store.autobuyers[id];
        if (!bot.unlocked || id === "singularity") continue;
        if (bot.mode !== mode) store.setAutobuyerMode(id, mode);
      }
    }
  };

  while (simTime < capSeconds) {
    virtualNowMs += dt * 1000;

    if (cps > 0) {
      while (simTime + TIME_TOL >= nextClickAt) {
        store.manualClick();
        nextClickAt += clickInterval;
      }
    }

    if (simTime + TIME_TOL >= nextPurchaseAt) {
      doPurchases();
      nextPurchaseAt = simTime + 5;
    }

    // Anomaliler (golden cookie muadili) — tıklama ile aynı "aktif" ekseni
    for (const a of [...store.floatingAnomalies]) store.clickAnomaly(a.id);

    if (store.canShift) store.dimensionShift(false);
    if (store.canBuyGalaxy) store.buyGalaxy(false);
    if (store.canSacrifice) {
      const reward = store.currentSacrificeReward;
      if (reward.gte(store.sacrificeMultiplier.times(1.5))) store.sacrificeDimensions(false);
    }

    if (store.canSingularity) {
      reached = true;
      timeSeconds = simTime;
      break;
    }

    store.update(dt);
    simTime += dt;

    if (store.canSingularity) {
      reached = true;
      timeSeconds = simTime;
      break;
    }

    if (store.matter.isNan() || !Number.isFinite(store.matter.mag)) {
      error = `matter became NaN at t=${simTime.toFixed(1)}s`;
      break;
    }

    // Saniyelik ölçüm: tıklamanın üretimdeki payı
    if (simTime + TIME_TOL >= nextRowAt) {
      const passive = store.matterPerSecond;
      const clickPower = store.manualClickPower;
      const clickDps = clickPower.times(cps);
      const total = passive.plus(clickDps);
      const share = total.lte(0) ? 0 : clickDps.div(total).toNumber();

      const d1 = store.dimensions[0];
      const d1Cost = store.getDimensionCost(1);
      const vsCost = d1Cost.lte(0) ? Infinity : clickPower.div(d1Cost).toNumber();

      clickContributionAtEnd = share;
      if (clickDeathAt === null && share < 0.01 && simTime > 120) {
        clickDeathAt = simTime;
        clickDeathLogMatter = log10safe(store.matter);
      }

      rows.push({
        t: Math.round(simTime),
        logMatter: log10safe(store.matter),
        logDps: log10safe(passive),
        logClickPower: log10safe(clickPower),
        clickDps: log10safe(clickDps),
        clickShare: Number(share.toFixed(5)),
        clickVsCost: vsCost === Infinity ? 1e9 : Number(vsCost.toFixed(3)),
        shifts: store.dimensionShifts,
        bought: store.dimensions.map((d) => d.bought),
        comboUnlocked: (store.neuralNodesBought["combo_unlock"] || 0) >= 1,
        cpsSyncLevel: store.neuralEffects.cpsSyncLevel,
        stance: store.currentStance,
      });
      nextRowAt += 60;
    }
  }

  Date.now = realNow;
  return {
    label,
    cps,
    seed,
    reached,
    timeSeconds,
    clickContributionAtEnd,
    rows,
    clickDeathAt,
    clickDeathLogMatter,
    totalClicks: store.stats.manualClicks,
    error,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
function arg(name: string, fallback: string): string {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

const capHours = Number(arg("capHours", "6"));
const dt = Number(arg("dt", "0.1"));
const outPath = arg("out", path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "result.json"));

// Üç profil: aktif oyuncu (5 cps), casual (2 cps), idle (0 cps = referans)
const runs: RunResult[] = [];
runs.push(await runOnce("active-5cps", 5, 1, dt, capHours));
runs.push(await runOnce("casual-2cps", 2, 2, dt, capHours));
runs.push(await runOnce("idle-0cps", 0, 3, dt, capHours));

fs.writeFileSync(outPath, JSON.stringify({ capHours, dt, runs }, null, 2));

// --- Konsol raporu -------------------------------------------------------
console.log("\n=== TIKLAMA KATKISI DENETIMI (Click Contribution Audit) ===\n");
for (const r of runs) {
  const end = r.rows.length ? r.rows[r.rows.length - 1] : null;
  console.log(`--- ${r.label} (${r.cps} tık/sn) ---`);
  console.log(
    `  prestij: ${r.reached ? `${Math.round(r.timeSeconds!)} sn (${(r.timeSeconds! / 60).toFixed(1)} dk)` : "ulaşılamadı"}${r.error ? ` HATA: ${r.error}` : ""}`
  );
  console.log(`  toplam tıklama: ${r.totalClicks}`);
  if (r.clickDeathAt !== null) {
    console.log(
      `  ⚠ TIKLAMA ÖLDÜ: pay %1'in altına ${Math.round(r.clickDeathAt)} sn'de (${(r.clickDeathAt / 60).toFixed(1)} dk) düştü @ log10=${r.clickDeathLogMatter!.toFixed(1)}`
    );
  } else {
    console.log(`  ✓ Tıklama payı hiç %1'in altına düşmedi`);
  }
  if (end) {
    console.log(
      `  son: log10(dopamin)=${end.logMatter.toFixed(1)} tıklama payı=%${(end.clickShare * 100).toFixed(2)} 1 tıklama=${end.clickVsCost} D1 maliyeti`
    );
  }
  console.log("");
}

console.log("Zaman(s) | log10(DP) | Tıklama Payı % | 1 Tık = Kaç D1 | Shift | Bought(1..8)");
console.log("---------------------------------------------------------------");
const active = runs[0];
for (const row of active.rows) {
  if (row.t % 300 !== 0) continue; // 5 dakikada bir
  console.log(
    `${String(row.t).padStart(8)} | ${row.logMatter.toFixed(1).padStart(9)} | ${(row.clickShare * 100).toFixed(2).padStart(13)} | ${String(row.clickVsCost).padStart(14)} | ${String(row.shifts).padStart(5)} | ${row.bought.join(",")}`
  );
}
console.log(`\n[audit] yazıldı -> ${outPath}`);