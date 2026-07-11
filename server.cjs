const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());

let previousCpu = null;
let gpuHistory = [];
let lastGenerationActivity = 0;

const GENERATING_GPU_THRESHOLD = 35;
const GENERATING_RAW_THRESHOLD = 60;
const FINISHING_WINDOW_MS = 5000;

function run(command) {
  return new Promise((resolve) => {
    exec(command, { timeout: 3000 }, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }

      resolve(stdout.trim());
    });
  });
}

function readCpuSnapshot() {
  const line = fs.readFileSync("/proc/stat", "utf8").split("\n")[0];
  const values = line.trim().split(/\s+/).slice(1).map(Number);

  const idle = values[3] + values[4];
  const total = values.reduce((sum, value) => sum + value, 0);

  return { idle, total };
}

function getCpuUsage() {
  const current = readCpuSnapshot();

  if (!previousCpu) {
    previousCpu = current;
    return null;
  }

  const idleDelta = current.idle - previousCpu.idle;
  const totalDelta = current.total - previousCpu.total;

  previousCpu = current;

  if (totalDelta <= 0) {
    return null;
  }

  return Math.round(100 * (1 - idleDelta / totalDelta));
}

function smoothGpuUsage(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  gpuHistory.push(value);

  if (gpuHistory.length > 5) {
    gpuHistory.shift();
  }

  const average =
    gpuHistory.reduce((sum, item) => sum + item, 0) / gpuHistory.length;

  return Math.round(average);
}

function getJarvisState({
  ollamaRunning,
  loadedModel,
  gpuUsage,
  rawGpuUsage,
}) {
  if (!ollamaRunning) {
    return {
      state: "Offline",
      activity: "Ollama offline",
      activityLevel: "offline",
    };
  }

  if (loadedModel === "No active model") {
    lastGenerationActivity = 0;

    return {
      state: "Idle",
      activity: "Waiting",
      activityLevel: "idle",
    };
  }

  const generating =
    gpuUsage >= GENERATING_GPU_THRESHOLD ||
    rawGpuUsage >= GENERATING_RAW_THRESHOLD;

  if (generating) {
    lastGenerationActivity = Date.now();

    return {
      state: "Generating",
      activity: "Generating response",
      activityLevel: "active",
    };
  }

  if (
    lastGenerationActivity > 0 &&
    Date.now() - lastGenerationActivity < FINISHING_WINDOW_MS
  ) {
    return {
      state: "Finishing",
      activity: "Completing response",
      activityLevel: "finishing",
    };
  }

  return {
    state: "Ready",
    activity: "Model ready",
    activityLevel: "ready",
  };
}

app.get("/api/status", async (req, res) => {
  const [
    gpuOutput,
    memoryOutput,
    cpuTempOutput,
    diskOutput,
    uptimeOutput,
    ollamaOutput,
    modelOutput,
  ] = await Promise.all([
    run(
      "nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,fan.speed --format=csv,noheader,nounits"
    ),
    run("free -m | awk '/Mem:/ {print $3 \",\" $2}'"),
    run(
      "sensors | awk '/Package id 0:/ {gsub(/[+°C]/,\"\",$4); print $4; exit}'"
    ),
    run("df -h / | awk 'NR==2 {print $3 \",\" $2 \",\" $5}'"),
    run("uptime -p"),
    run("pgrep ollama >/dev/null && echo running || echo stopped"),
    run("ollama ps | awk 'NR==2 {print $1}'"),
  ]);

  const cpuUsage = getCpuUsage();

  let gpuData = {
    usage: null,
    rawUsage: null,
    temp: null,
    vramUsed: null,
    vramTotal: null,
    fan: null,
  };

  if (gpuOutput) {
    const [usage, temp, vramUsed, vramTotal, fan] = gpuOutput
      .split(",")
      .map((value) => value.trim());

    const rawGpuUsage = Number(usage);

    gpuData = {
      usage: smoothGpuUsage(rawGpuUsage),
      rawUsage: rawGpuUsage,
      temp: Number(temp),
      vramUsed: Number(vramUsed),
      vramTotal: Number(vramTotal),
      fan: Number(fan),
    };
  }

  let ramUsed = null;
  let ramTotal = null;

  if (memoryOutput) {
    const [used, total] = memoryOutput.split(",");
    ramUsed = Number(used);
    ramTotal = Number(total);
  }

  let diskData = {
    used: null,
    total: null,
    percent: null,
  };

  if (diskOutput) {
    const [used, total, percent] = diskOutput.split(",");
    diskData = { used, total, percent };
  }

  const ollamaRunning = ollamaOutput === "running";
  const loadedModel = modelOutput || "No active model";

  const jarvisState = getJarvisState({
    ollamaRunning,
    loadedModel,
    gpuUsage: gpuData.usage ?? 0,
    rawGpuUsage: gpuData.rawUsage ?? 0,
  });

  res.json({
    jarvis: {
      ...jarvisState,
      loadedModel,
      lastUpdated: new Date().toISOString(),
    },

    gpu: gpuData,

    cpu: {
      usage: cpuUsage,
      temp: cpuTempOutput
        ? Math.round(Number(cpuTempOutput))
        : null,
    },

    ram: {
      used: ramUsed,
      total: ramTotal,
    },

    disk: diskData,
    uptime: uptimeOutput || "unknown",
    ollama: ollamaOutput,
    model: loadedModel,
  });
});

app.listen(5055, "0.0.0.0", () => {
  console.log("Jarvis status API running on http://192.168.1.29:5055");
});
