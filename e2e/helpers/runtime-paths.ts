import os from "node:os"
import path from "node:path"

const homeDir = os.homedir()
const frontendDir = process.env.SYNOD_FRONTEND_DIR ?? process.cwd()

export const FRONTEND_DIR = frontendDir
export const COORDINATOR_ROOT =
  process.env.SYNOD_COORDINATOR_ROOT ?? path.join(homeDir, "Documents", "synod")
export const COORDINATOR_DIR =
  process.env.SYNOD_COORDINATOR_DIR ?? path.join(COORDINATOR_ROOT, "synod-coordinator")
export const MCP_DIR =
  process.env.SYNOD_MCP_DIR ?? path.join(homeDir, "Downloads", "synod-mcp")

export const ARTIFACTS_DIR = path.join(FRONTEND_DIR, ".playwright")
export const LOGS_DIR = path.join(ARTIFACTS_DIR, "logs")
export const MCP_HOME_DIR = path.join(ARTIFACTS_DIR, "mcp-home")
export const RUNTIME_STATE_PATH = path.join(ARTIFACTS_DIR, "runtime-state.json")
export const COORDINATOR_TARGET_DIR = path.join(ARTIFACTS_DIR, "cargo-target")
export const COORDINATOR_BINARY_PATH = path.join(
  COORDINATOR_TARGET_DIR,
  "debug",
  "synod-coordinator.exe",
)

export const COORDINATOR_PORT = Number(process.env.SYNOD_E2E_COORDINATOR_PORT ?? "38080")
export const FRONTEND_PORT = Number(process.env.SYNOD_E2E_FRONTEND_PORT ?? "3300")
export const MCP_PORT = Number(process.env.SYNOD_E2E_MCP_PORT ?? "3366")

export const COORDINATOR_URL = `http://127.0.0.1:${COORDINATOR_PORT}`
export const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`
export const MCP_URL = `http://127.0.0.1:${MCP_PORT}`

export const E2E_DATABASE_NAME = process.env.SYNOD_E2E_DATABASE_NAME ?? "synod_e2e_pw"
export const E2E_DATABASE_URL =
  process.env.SYNOD_E2E_DATABASE_URL ??
  `postgres://postgres:postgres@127.0.0.1:5432/${E2E_DATABASE_NAME}`
export const E2E_REDIS_URL =
  process.env.SYNOD_E2E_REDIS_URL ?? "redis://127.0.0.1:6379/15"
