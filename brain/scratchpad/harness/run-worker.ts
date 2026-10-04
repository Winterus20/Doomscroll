import { parentPort, workerData } from "node:worker_threads";
import { PROFILES, runOnce, type ProfileName } from "./run.ts";

interface WorkerRunPayload {
  profile: ProfileName;
  seed: number;
  dt: number;
  capHours: number;
  trace: boolean;
  collectSamples: boolean;
}

const payload = workerData as WorkerRunPayload;
const cfg = PROFILES[payload.profile];
const result = await runOnce(
  cfg,
  payload.seed,
  payload.dt,
  payload.capHours,
  payload.trace,
  payload.collectSamples
);
parentPort?.postMessage(result);
