const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());

let previousCpu = null;

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

function readCpuSnapshot() {
  const line = fs.readFileSync("/proc/stat", "utf8").split("\n")[0];
  const parts = line.trim().split(/\s+/).slice(1).map(Number);

  const idle = parts[3] + parts[4];
  const total = parts.reduce((sum, value) => sum + value, 0);

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

  if (totalDelta <= 0) return null;

  const usage = 100 * (1 - idleDelta / totalDelta);
  return Math.round(usage);
}

app.get("/api/status", async (req, res) => {
  const gpu = await run(
    "nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,fan.speed --format=csv,noheader,nounits"
  );

  const mem = await run("free -m | awk '/Mem:/ {print $3 \",\" $2}'");
  const cpuTemp = await run("sensors | awk '/Package id 0:/ {gsub(/[+°C]/,\"\",$4); print $4; exit}'");
  const disk = await run("df -h / | awk 'NR==2 {print $3 \",\" $2 \",\" $5}'");
  const uptime = await run("uptime -p");
  const ollama = await run("pgrep ollama >/dev/null && echo running || echo stopped");
  const model = await run("ollama ps | awk 'NR==2 {print $1}'");

  const cpuUsage = getCpuUsage();

  let gpuData = {
    usage: null,
    temp: null,
    vramUsed: null,
    vramTotal: null,
    fan: null,
  };

  if (gpu) {
    const [usage, temp, vramUsed, vramTotal, fan] = gpu.split(",").map(x => x.trim());
    gpuData = {
      usage: Number(usage),
      temp: Number(temp),
      vramUsed: Number(vramUsed),
      vramTotal: Number(vramTotal),
      fan: Number(fan),
    };
  }

  let ramUsed = null;
  let ramTotal = null;

  if (mem) {
    const [used, total] = mem.split(",");
    ramUsed = Number(used);
    ramTotal = Number(total);
  }

  let diskData = {
    used: null,
    total: null,
    percent: null,
  };

  if (disk) {
    const [used, total, percent] = disk.split(",");
    diskData = { used, total, percent };
  }

  const loadedModel = model || "No active model";

  let activity = "Waiting";
  let state = "Idle";

  if (ollama !== "running") {
    activity = "Ollama offline";
    state = "Offline";
  } else if (loadedModel !== "No active model") {
    activity = "Model loaded";
    state = "Ready";
  }

  res.json({
    jarvis: {
      state,
      activity,
      loadedModel,
      lastUpdated: new Date().toISOString(),
    },
    gpu: gpuData,
    cpu: {
      usage: cpuUsage,
      temp: cpuTemp ? Math.round(Number(cpuTemp)) : null,
    },
    ram: {
      used: ramUsed,
      total: ramTotal,
    },
    disk: diskData,
    uptime: uptime || "unknown",
    ollama,
    model: loadedModel,
  });
});

app.listen(5055, "0.0.0.0", () => {
  console.log("Jarvis status API running on http://192.168.1.29:5055");
});
