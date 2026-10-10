// Dekad-başına süre + kova derinliği analizörü (ADR-0051 ölçümü)
// Kullanım: node brain/scratchpad/harness/analyze-decades.mjs <results.json>
import fs from "node:fs";

const file = process.argv[2];
const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const runs = Array.isArray(raw) ? raw : Array.isArray(raw.runs) ? raw.runs : [raw];

function crossingTime(samples, level) {
  let prev = null;
  for (const s of samples) {
    if (prev !== null && prev.logMatter < level && s.logMatter >= level) {
      const span = s.logMatter - prev.logMatter;
      const frac = span > 0 ? (level - prev.logMatter) / span : 0;
      return prev.t + frac * (s.t - prev.t);
    }
    prev = s;
  }
  return null;
}

function hms(sec) {
  if (sec === null) return "—";
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

const PAIRS = [[50, 60], [100, 110], [150, 160], [200, 210], [250, 260], [290, 300]];

for (const run of runs) {
  console.log(`\n=== ${run.profile} seed ${run.seed} ===`);
  console.log(`total: ${run.timeHms} reached=${run.reached}`);
  console.log("dekad aralığı | başlangıç | bitiş | süre (sn)");
  for (const [a, b] of PAIRS) {
    const ta = crossingTime(run.samples, a);
    const tb = crossingTime(run.samples, b);
    const dur = ta !== null && tb !== null ? tb - ta : null;
    console.log(
      `  ${String(a).padStart(3)} -> ${b}   | ${hms(ta)} | ${hms(tb)} | ${dur === null ? "—" : dur.toFixed(1)}`
    );
  }

  // Kova derinliği zaman serisi (reset'ler görünür)
  console.log("t (dk) | shifts | gal | kovalar D1..D8");
  let lastLog = -1;
  for (const s of run.samples) {
    if (Math.floor(s.t / 60) % 10 !== 0 && s.t < 60) continue;
    if (Math.floor(s.t / 60) % 15 !== 0) continue;
    const buckets = s.bought.map((b) => Math.floor(b / 10));
    console.log(
      `  ${String(Math.round(s.t / 60)).padStart(3)} | ${String(s.shifts).padStart(2)} | ${s.galaxies} | ${buckets.join(",")} | log10=${s.logMatter.toFixed(1)}`
    );
    lastLog = s.logMatter;
  }
  // En derin kova her tier için
  const maxBucket = run.samples[0].bought.map(() => 0);
  for (const s of run.samples) {
    s.bought.forEach((b, i) => {
      const bucket = Math.floor(b / 10);
      if (bucket > maxBucket[i]) maxBucket[i] = bucket;
    });
  }
  console.log(`max kova (tier bazında, reset'ler hariç tepe değer): ${maxBucket.join(",")}`);
}
