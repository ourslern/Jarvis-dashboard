const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim());
    });
  });
}

app.get("/api/status", async (req, res) => {
  const gpu = await run(
    "nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,fan.speed --format=csv,noheader,nounits"
  );

  const mem = await run("free -m | awk '/Mem:/ {print $3 \",\" $2}'");
  const cpu = await run("top -bn1 | awk '/Cpu\\(s\\)/ {print 100 - $8}'");
  const cpuTemp = await run("sensors | awk '/Package id 0:/ {gsub(/[+°C]/,\"\",$4); print $4; exit}'");
  const disk = await run("df -h / | awk 'NR==2 {print $3 \",\" $2 \",\" $5}'");
  const uptime = await run("uptime -p");
  const ollama = await run("pgrep ollama >/dev/null && echo running || echo stopped");
  const model = await run("ollama ps | awk 'NR==2 {print $1}'");

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
    diskData = {
      used,
      total,
      percent,
    };
  }

  res.json({
    gpu: gpuData,
    cpu: {
      usage: cpu ? Math.round(Number(cpu)) : null,
      temp: cpuTemp ? Math.round(Number(cpuTemp)) : null,
    },
    ram: {
      used: ramUsed,
      total: ramTotal,
    },
    disk: diskData,
    uptime: uptime || "unknown",
    ollama,
    model: model || "No active model",
  });
});

app.listen(5055, "0.0.0.0", () => {
  console.log("Jarvis status API running on http://192.168.1.29:5055");
});
