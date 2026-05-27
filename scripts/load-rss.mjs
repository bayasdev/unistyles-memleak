import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";

const DEFAULT_PORT = 3000;

const args = parseArgs(process.argv.slice(2));
const targetRps = readNumberArg(args, "rps", 10_000);
const durationSeconds = readNumberArg(args, "duration", 30);
const concurrency = readNumberArg(args, "concurrency", 1024);
const requestTimeoutMs = readNumberArg(args, "request-timeout", 10_000);
const drainTimeoutMs = readNumberArg(args, "drain-timeout", 30_000);
const warmupRequests = readNumberArg(args, "warmup", 20);
const port = readNumberArg(args, "port", DEFAULT_PORT);
const host = readStringArg(args, "host", "127.0.0.1");
const path = readStringArg(args, "path", "/");
const cooldownMs = readNumberArg(args, "cooldown", 1000);
const verbose = Boolean(args.verbose);
const baseUrl = readStringArg(args, "url", `http://${host}:${port}`);
const shouldSpawnServer = !args.url;

let serverProcess;

try {
  if (shouldSpawnServer) {
    serverProcess = startNextServer({ host, port, verbose });
  }

  await waitForServer(baseUrl);
  await warmup(new URL(path, baseUrl), warmupRequests, requestTimeoutMs);

  const before = await readRss(baseUrl, true);
  const result = await runLoad({
    url: new URL(path, baseUrl),
    rps: targetRps,
    durationSeconds,
    concurrency,
    requestTimeoutMs,
    drainTimeoutMs,
  });

  await sleep(cooldownMs);

  const after = await readRss(baseUrl, true);
  const rssDelta = after.rss - before.rss;

  console.log(
    JSON.stringify(
      {
        target: {
          url: new URL(path, baseUrl).toString(),
          rps: targetRps,
          durationSeconds,
          concurrency,
          requestTimeoutMs,
          drainTimeoutMs,
          warmupRequests,
        },
        server: {
          pid: before.pid,
          gcAvailable: before.gcAvailable,
        },
        requests: result,
        memory: {
          before: formatMemory(before),
          after: formatMemory(after),
          delta: {
            rss: rssDelta,
            rssMb: toMb(rssDelta),
          },
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (serverProcess) {
    serverProcess.expectedExit = true;
    serverProcess.kill("SIGTERM");
    await once(serverProcess, "exit").catch(() => undefined);
  }
}

async function warmup(url, count, requestTimeoutMs) {
  const agent = createAgent(url, Math.min(count, 32));

  try {
    for (let index = 0; index < count; index += 1) {
      await requestOnce(url, agent, requestTimeoutMs);
    }
  } finally {
    agent.destroy();
  }
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=", 2);

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    const nextValue = argv[index + 1];

    if (!nextValue || nextValue.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = nextValue;
    index += 1;
  }

  return parsed;
}

function readStringArg(parsed, key, fallback) {
  const value = parsed[key];

  if (typeof value !== "string") {
    return fallback;
  }

  return value;
}

function readNumberArg(parsed, key, fallback) {
  const value = Number(parsed[key] ?? fallback);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${key} must be a positive number`);
  }

  return value;
}

function startNextServer({ host, port, verbose }) {
  const child = spawn(
    process.execPath,
    [
      "--expose-gc",
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      host,
      "-p",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk) => {
    if (verbose) {
      process.stdout.write(chunk);
    }
  });

  child.stderr.on("data", (chunk) => {
    if (verbose) {
      process.stderr.write(chunk);
    }
  });

  child.once("exit", (code, signal) => {
    if (child.expectedExit) {
      return;
    }

    if (code !== 0 && signal !== "SIGTERM") {
      console.error(`next start exited early with code ${code ?? signal}`);
    }
  });

  return child;
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      await readRss(baseUrl, false);
      return;
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }

  throw new Error(
    `Server did not become ready: ${lastError?.message ?? "timeout"}`,
  );
}

async function readRss(baseUrl, collectGarbage) {
  const url = new URL("/api/rss", baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  if (collectGarbage) {
    url.searchParams.set("gc", "1");
  }

  const response = await fetch(url, { signal: controller.signal }).finally(
    () => {
      clearTimeout(timeout);
    },
  );

  if (!response.ok) {
    throw new Error(`RSS endpoint returned ${response.status}`);
  }

  return response.json();
}

async function runLoad({
  url,
  rps,
  durationSeconds,
  concurrency,
  requestTimeoutMs,
  drainTimeoutMs,
}) {
  const agent = createAgent(url, concurrency);
  const totalRequests = Math.round(rps * durationSeconds);
  const start = performance.now();
  const end = start + durationSeconds * 1000;
  const latencies = [];
  const statusCodes = new Map();
  let sent = 0;
  let completed = 0;
  let inFlight = 0;
  let errors = 0;
  let timer;
  let forcedStop = false;

  await new Promise((resolve) => {
    let resolved = false;

    const finish = (wasForced = false) => {
      if (resolved) {
        return;
      }

      resolved = true;
      forcedStop = wasForced;
      clearInterval(timer);
      resolve();
    };

    const pump = () => {
      const now = performance.now();
      const elapsedMs = Math.min(now - start, durationSeconds * 1000);
      const expectedSent = Math.min(
        totalRequests,
        Math.floor((elapsedMs / 1000) * rps),
      );
      const isPastSendWindow = now >= end;

      if (isPastSendWindow && now >= end + drainTimeoutMs) {
        finish(true);
        return;
      }

      while (
        !isPastSendWindow &&
        sent < expectedSent &&
        inFlight < concurrency
      ) {
        sent += 1;
        inFlight += 1;
        requestOnce(url, agent, requestTimeoutMs)
          .then(({ statusCode, latency }) => {
            latencies.push(latency);
            statusCodes.set(statusCode, (statusCodes.get(statusCode) ?? 0) + 1);
          })
          .catch(() => {
            errors += 1;
          })
          .finally(() => {
            completed += 1;
            inFlight -= 1;

            if (!resolved && (performance.now() < end || completed < sent)) {
              pump();
            }
          });
      }

      if (isPastSendWindow && completed >= sent) {
        finish();
      }
    };

    timer = setInterval(pump, 5);
    pump();
  });

  agent.destroy();

  const elapsedSeconds = (performance.now() - start) / 1000;
  const sortedLatencies = latencies.toSorted((a, b) => a - b);

  return {
    sent,
    completed,
    inFlight,
    forcedStop,
    errors,
    elapsedSeconds: Number(elapsedSeconds.toFixed(3)),
    achievedRps: Number((completed / elapsedSeconds).toFixed(2)),
    statusCodes: Object.fromEntries(statusCodes),
    latencyMs: {
      p50: percentile(sortedLatencies, 0.5),
      p95: percentile(sortedLatencies, 0.95),
      p99: percentile(sortedLatencies, 0.99),
      max: sortedLatencies.at(-1) ?? 0,
    },
  };
}

function createAgent(url, maxSockets) {
  const Agent = url.protocol === "https:" ? https.Agent : http.Agent;

  return new Agent({
    keepAlive: true,
    maxSockets,
  });
}

function requestOnce(url, agent, requestTimeoutMs) {
  const client = url.protocol === "https:" ? https : http;
  const startedAt = performance.now();

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        agent,
        method: "GET",
        headers: {
          accept: "text/html",
          connection: "keep-alive",
        },
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            latency: Number((performance.now() - startedAt).toFixed(2)),
          });
        });
      },
    );

    request.on("error", reject);
    request.setTimeout(requestTimeoutMs, () => {
      request.destroy(
        new Error(`request timed out after ${requestTimeoutMs}ms`),
      );
    });
    request.end();
  });
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }

  const index = Math.min(
    values.length - 1,
    Math.floor(values.length * percentileValue),
  );

  return values[index];
}

function formatMemory(memory) {
  return {
    rss: memory.rss,
    rssMb: toMb(memory.rss),
    heapUsed: memory.heapUsed,
    heapUsedMb: toMb(memory.heapUsed),
    heapTotal: memory.heapTotal,
    heapTotalMb: toMb(memory.heapTotal),
    external: memory.external,
    externalMb: toMb(memory.external),
    arrayBuffers: memory.arrayBuffers,
    arrayBuffersMb: toMb(memory.arrayBuffers),
  };
}

function toMb(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
