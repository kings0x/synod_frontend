import { expect, test } from "@playwright/test"

import { callMcpTool, createMcpClient } from "./helpers/mcp-client"
import { COORDINATOR_URL } from "./helpers/runtime-paths"

type IdentityResult = {
  public_key: string
  existed: boolean
  storage_type: string
}

type RegistrationStatus = {
  status: string
  message: string
}

type ConnectResult = {
  success: boolean
  agent_id?: string
  message: string
}

type ConnectionStatus = {
  ws_status: string
  public_key: string | null
}

type PolicyEnvelope = {
  success: boolean
  policy?: {
    agent_id: string
    public_key: string
    rules: unknown[]
  }
  message: string
}

test("operator UI and MCP server complete the slot registration and connect flow", async ({
  page,
}) => {
  const mcp = await createMcpClient()
  const email = `e2e-${Date.now()}@synod.local`
  const password = "Password123!"
  const agentName = `E2E Agent ${Date.now()}`

  try {
    const identity = await test.step("initialize MCP identity", async () => {
      const result = await callMcpTool<IdentityResult>(mcp.client, "initialize_identity", {})
      expect(result.public_key).toMatch(/^G[A-Z2-7]{55}$/)
      expect(result.existed).toBe(false)
      expect(result.storage_type).toBe("encrypted_store")
      return result
    })

    await test.step("sign up through the frontend and provision a treasury", async () => {
      await page.goto("/signup")

      await page.getByPlaceholder("admin@synod.xyz").fill(email)
      await page.getByPlaceholder("********").first().fill(password)
      await page.getByPlaceholder("********").nth(1).fill(password)
      await page.getByRole("button", { name: /create identity/i }).click()

      await expect(page.getByText(/system initialization/i)).toBeVisible()
      await page.getByRole("button", { name: /provision primary treasury/i }).click()
      await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible()
    })

    await test.step("register the agent slot in the dashboard", async () => {
      await page.getByRole("button", { name: /^Agents$/ }).click()
      await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible()
      await expect(page.getByText(/no agent slots yet/i)).toBeVisible()

      await page.getByRole("button", { name: /add agent slot/i }).click()
      await page.getByPlaceholder(/yield optimizer bot/i).fill(agentName)
      await page.getByRole("button", { name: /^next$/i }).click()
      await page.getByPlaceholder("G...").fill(identity.public_key)
      await page.getByRole("button", { name: /^done$/i }).click()

      await expect(page.getByText(/slot registered/i)).toBeVisible()
      await page.getByRole("button", { name: /do it later/i }).click()
      await expect(page.locator("tbody tr").filter({ hasText: agentName }).first()).toBeVisible()
    })

    await test.step("confirm coordinator readiness and connect through MCP", async () => {
      const coordinatorStatusResponse = await fetch(
        `${COORDINATOR_URL}/connect/status?public_key=${encodeURIComponent(identity.public_key)}`,
      )
      expect(coordinatorStatusResponse.ok).toBe(true)
      const coordinatorStatus = (await coordinatorStatusResponse.json()) as {
        status: string
        connect_allowed: boolean
      }
      expect(coordinatorStatus.status).toBe("ready")
      expect(coordinatorStatus.connect_allowed).toBe(true)

      const poll = await callMcpTool<RegistrationStatus>(
        mcp.client,
        "poll_registration_status",
        {},
      )
      expect(poll.status).toBe("ready")

      const connected = await callMcpTool<ConnectResult>(
        mcp.client,
        "connect_to_synod",
        {},
      )
      expect(connected.success).toBe(true)
      expect(connected.agent_id).toBeTruthy()

      const connectionStatus = await callMcpTool<ConnectionStatus>(
        mcp.client,
        "get_connection_status",
        {},
      )
      expect(connectionStatus.ws_status).toBe("connected")
      expect(connectionStatus.public_key).toBe(identity.public_key)

      const policy = await callMcpTool<PolicyEnvelope>(mcp.client, "get_policy", {})
      expect(policy.success).toBe(true)
      expect(policy.policy?.public_key).toBe(identity.public_key)
      expect(policy.policy?.agent_id).toBe(connected.agent_id)
      expect(Array.isArray(policy.policy?.rules)).toBe(true)
    })

    await test.step("reflect the connection back in the frontend", async () => {
      const row = page.locator("tbody tr").filter({ hasText: agentName }).first()

      await expect.poll(async () => {
        const text = await row.locator("td").nth(2).textContent()
        return text?.trim() ?? ""
      }).toBe("Just now")
    })
  } finally {
    await mcp.close()
  }
})
