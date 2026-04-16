import { createWriteStream } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { spawnSync, spawn, type ChildProcess } from "node:child_process"

import {
  ARTIFACTS_DIR,
  COORDINATOR_BINARY_PATH,
  COORDINATOR_DIR,
  COORDINATOR_PORT,
  COORDINATOR_ROOT,
  COORDINATOR_TARGET_DIR,
  COORDINATOR_URL,
  E2E_DATABASE_NAME,
  E2E_DATABASE_URL,
  E2E_REDIS_URL,
  FRONTEND_DIR,
  FRONTEND_PORT,
  FRONTEND_URL,
  LOGS_DIR,
  MCP_DIR,
  MCP_HOME_DIR,
  MCP_PORT,
  MCP_URL,
  RUNTIME_STATE_PATH,
} from "./runtime-paths"

const CMD = process.env.ComSpec ?? "cmd.exe"

type RuntimeProcess = {
  name: string
  pid: number
}

type RuntimeState = {
  processes: RuntimeProcess[]
}

export async function ensureArtifactsDir() {
  await mkdir(ARTIFACTS_DIR, { recursive: true })
  await mkdir(LOGS_DIR, { recursive: true })
}

export async function prepareInfrastructure() {
  await ensureArtifactsDir()

  runCommand("docker", ["compose", "up", "-d", "postgres", "redis"], {
    cwd: COORDINATOR_ROOT,
  })

  await waitForCommandSuccess("postgres readiness", () =>
    spawnSync("docker", ["exec", "synod-postgres", "pg_isready", "-U", "postgres"], {
      encoding: "utf8",
    }),
  )
  await waitForCommandSuccess("redis readiness", () =>
    spawnSync("docker", ["exec", "synod-redis", "redis-cli", "PING"], {
      encoding: "utf8",
    }),
  )

  runCommand("docker", [
    "exec",
    "synod-postgres",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-c",
    `DROP DATABASE IF EXISTS ${E2E_DATABASE_NAME} WITH (FORCE);`,
  ])
  runCommand("docker", [
    "exec",
    "synod-postgres",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-c",
    `CREATE DATABASE ${E2E_DATABASE_NAME};`,
  ])
  runCommand("docker", ["exec", "synod-redis", "redis-cli", "-n", "15", "FLUSHDB"])

  await rm(MCP_HOME_DIR, { recursive: true, force: true })
  await rm(COORDINATOR_TARGET_DIR, { recursive: true, force: true })
  await mkdir(MCP_HOME_DIR, { recursive: true })
  await mkdir(COORDINATOR_TARGET_DIR, { recursive: true })

  runCommand("cargo.exe", ["build", "--bin", "synod-coordinator"], {
    cwd: COORDINATOR_DIR,
    env: {
      ...process.env,
      CARGO_TARGET_DIR: COORDINATOR_TARGET_DIR,
    },
  })

  runCommand(CMD, ["/d", "/s", "/c", "npm run build"], { cwd: MCP_DIR })
  runCommand(CMD, ["/d", "/s", "/c", "npm run build"], {
    cwd: FRONTEND_DIR,
    env: {
      ...process.env,
      SYNOD_COORDINATOR_ORIGIN: COORDINATOR_URL,
    },
  })
}

export async function startRuntimeProcesses() {
  const processes: RuntimeProcess[] = []

  try {
    const coordinator = await startProcess(
      "coordinator",
      COORDINATOR_BINARY_PATH,
      [],
      {
        cwd: COORDINATOR_DIR,
        env: {
          ...process.env,
          SYNOD__SERVER__HOST: "127.0.0.1",
          SYNOD__SERVER__PORT: String(COORDINATOR_PORT),
          SYNOD__DATABASE__URL: E2E_DATABASE_URL,
          SYNOD__DATABASE__MAX_CONNECTIONS: "20",
          SYNOD__REDIS__URL: E2E_REDIS_URL,
          SYNOD__STELLAR__NETWORK: "testnet",
          SYNOD__STELLAR__NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
          SYNOD__STELLAR__HORIZON_URL: "https://horizon-testnet.stellar.org",
          SYNOD__STELLAR__COORDINATOR_PUBKEY: "",
          SYNOD__STELLAR__COORDINATOR_SECRET_KEY: "",
          SYNOD__STELLAR__COORDINATOR_SECRET_KEY_PATH: "",
          SYNOD__AUTH__JWT_SECRET: "synod-e2e-jwt-secret-32-bytes-minimum",
          SYNOD__AUTH__JWT_EXPIRY_HOURS: "24",
          SYNOD__AUTH__BCRYPT_COST: "4",
          SYNOD__WALLETCONNECT__PROJECT_ID: "",
          SYNOD__WALLETCONNECT__RELAY_URL: "wss://relay.walletconnect.com",
        },
      },
      `${COORDINATOR_URL}/`,
    )
    processes.push(coordinator)

    const frontend = await startProcess(
      "frontend",
      CMD,
      ["/d", "/s", "/c", `npx next start --hostname 127.0.0.1 --port ${FRONTEND_PORT}`],
      {
        cwd: FRONTEND_DIR,
        env: {
          ...process.env,
          SYNOD_COORDINATOR_ORIGIN: COORDINATOR_URL,
        },
      },
      `${FRONTEND_URL}/login`,
    )
    processes.push(frontend)

    const mcp = await startProcess(
      "mcp",
      "node",
      ["dist/index.js"],
      {
        cwd: MCP_DIR,
        env: {
          ...process.env,
          HOME: MCP_HOME_DIR,
          USERPROFILE: MCP_HOME_DIR,
          SYNOD_AKP_STORAGE: "encrypted_store",
          SYNOD_MCP_PORT: String(MCP_PORT),
          SYNOD_BASE_URL: COORDINATOR_URL,
          SYNOD_WS_URL: `${COORDINATOR_URL.replace(/^http/i, "ws")}/agent/ws`,
        },
      },
      `${MCP_URL}/health`,
    )
    processes.push(mcp)

    await writeRuntimeState({ processes })
  } catch (error) {
    await stopRuntimeProcesses(processes)
    throw error
  }
}

export async function teardownRuntime() {
  const state = await readRuntimeState()
  await stopRuntimeProcesses(state?.processes ?? [])
  await rm(MCP_HOME_DIR, { recursive: true, force: true })
  await rm(RUNTIME_STATE_PATH, { force: true })
}

async function startProcess(
  name: string,
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
  readyUrl: string,
): Promise<RuntimeProcess> {
  const stdout = createWriteStream(path.join(LOGS_DIR, `${name}.stdout.log`), { flags: "w" })
  const stderr = createWriteStream(path.join(LOGS_DIR, `${name}.stderr.log`), { flags: "w" })

  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })

  child.stdout?.pipe(stdout)
  child.stderr?.pipe(stderr)

  const pid = child.pid
  if (!pid) {
    throw new Error(`Failed to start ${name}: no pid returned`)
  }

  try {
    await waitForUrl(readyUrl, child, name)
  } catch (error) {
    await stopRuntimeProcesses([{ name, pid }])
    throw error
  }

  child.once("exit", () => {
    stdout.end()
    stderr.end()
  })

  return { name, pid }
}

async function waitForUrl(url: string, child: ChildProcess, name: string) {
  const deadline = Date.now() + 240_000
  let lastError = "service not ready yet"

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${name} exited early with code ${child.exitCode}`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
      lastError = `received HTTP ${response.status} from ${url}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }

    await sleep(1000)
  }

  throw new Error(`${name} did not become ready at ${url}: ${lastError}`)
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
    windowsHide: true,
  })

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.error?.message,
        outputText(result.stdout),
        outputText(result.stderr),
      ]
        .filter(Boolean)
        .join("\n"),
    )
  }

  return result
}

async function waitForCommandSuccess(
  label: string,
  run: () => ReturnType<typeof spawnSync>,
) {
  const deadline = Date.now() + 60_000
  let lastError = "service not ready"

  while (Date.now() < deadline) {
    const result = run()
    if (result.status === 0) {
      return
    }

    lastError = outputText(result.stderr) || outputText(result.stdout) || lastError
    await sleep(1000)
  }

  throw new Error(`${label} failed to become ready: ${lastError}`)
}

async function writeRuntimeState(state: RuntimeState) {
  await writeFile(RUNTIME_STATE_PATH, JSON.stringify(state, null, 2), "utf8")
}

async function readRuntimeState(): Promise<RuntimeState | null> {
  try {
    const raw = await readFile(RUNTIME_STATE_PATH, "utf8")
    return JSON.parse(raw) as RuntimeState
  } catch {
    return null
  }
}

async function stopRuntimeProcesses(processes: RuntimeProcess[]) {
  for (const processInfo of [...processes].reverse()) {
    spawnSync("taskkill", ["/PID", String(processInfo.pid), "/T", "/F"], {
      encoding: "utf8",
      stdio: "ignore",
      windowsHide: true,
    })
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function outputText(value: string | Buffer | null | undefined) {
  if (!value) {
    return ""
  }

  return (typeof value === "string" ? value : value.toString("utf8")).trim()
}
