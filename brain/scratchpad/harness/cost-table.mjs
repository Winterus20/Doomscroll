// Eski vs yeni kova maliyeti karşılaştırma tablosu (ADR-0051)
// Log10 uzayında çalışır; B0 altı = eski formül, üstü = eski × 10^(S·d(d-1)/2)
const B0 = Number(process.argv[3] ?? 30);
const S = Number(process.argv[4] ?? 0.02);

const BASE = [10, 100, 1e4, 1e6, 1e9, 1e13, 1e18, 1e24];
const MULT = [1e3, 1e4, 1e5, 1e6, 1e8, 1e10, 1e12, 1e15];
const LADDER = [
  { ratio: 55, soft: 4 },
  { ratio: 42, soft: 3 },
  { ratio: 32, soft: 3 },
  { ratio: 28, soft: 2 },
  { ratio: 24, soft: 2 },
  { ratio: 20, soft: 2 }
];

function legacyLog10(tier, b) {
  const base = Math.log10(BASE[tier - 1]);
  const mult = Math.log10(MULT[tier - 1]);
  if (tier <= 6) {
    const { ratio, soft } = LADDER[tier - 1];
    if (b < soft) return base + Math.log10(ratio) * b;
    return base + Math.log10(ratio) * soft + mult * (b - soft);
  }
  return base + mult * b;
}

function accelLog10(b) {
  if (b <= B0) return 0;
  const d = b - B0;
  return (S * d * (d - 1)) / 2;
}

const buckets = [10, 30, 50, 100, 300, 1000];
const tiers = [1, 4, 8];

console.log(`B0=${B0} S=${S}`);
console.log('tier | kova | eski log10(maliyet) | yeni log10(maliyet) | ek çarpan (log10) | eski oran (log10) | yeni oran (log10)');
for (const t of tiers) {
  for (const b of buckets) {
    const oldL = legacyLog10(t, b);
    const newL = oldL + accelLog10(b);
    const oldRatio = legacyLog10(t, b) - legacyLog10(t, b - 1);
    const newRatio = oldRatio + (b > B0 ? S * (b - 1 - B0) : 0);
    console.log(
      `D${t}   | ${String(b).padStart(4)} | ${oldL.toFixed(2).padStart(18)} | ${newL.toFixed(2).padStart(18)} | ${accelLog10(b).toFixed(2).padStart(15)} | ${oldRatio.toFixed(3).padStart(15)} | ${newRatio.toFixed(3).padStart(15)}`
    );
  }
}
