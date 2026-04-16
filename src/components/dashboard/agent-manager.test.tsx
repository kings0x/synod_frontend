import type { ButtonHTMLAttributes } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AgentManager } from "./agent-manager"

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock("@/hooks/use-stellar-wallet", () => ({
  useStellarWallet: () => ({
    connect: vi.fn(),
    sign: vi.fn(),
  }),
}))

const VALID_PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

describe("AgentManager provisioning flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    cleanup()
  })

  it("creates a slot and shows the post-create policy prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        agent: {
          agent_id: "agent-1",
          treasury_id: "treasury-1",
          name: "Yield Bot",
          description: null,
          agent_pubkey: VALID_PUBLIC_KEY,
          status: "PENDING_CONFIGURATION",
          created_at: new Date().toISOString(),
          last_connected: null,
        },
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const onAgentsChange = vi.fn()
    const onManageRules = vi.fn()

    render(
      <AgentManager
        treasuryId="treasury-1"
        token="token"
        agents={[]}
        onAgentsChange={onAgentsChange}
        onManageRules={onManageRules}
        isDashboardWidget={false}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /add agent slot/i }))
    fireEvent.change(screen.getByPlaceholderText(/yield optimizer bot/i), {
      target: { value: "Yield Bot" },
    })
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    fireEvent.change(screen.getByPlaceholderText("G..."), {
      target: { value: VALID_PUBLIC_KEY },
    })
    fireEvent.click(screen.getByRole("button", { name: /done/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/agents/treasury-1",
      expect.objectContaining({
        method: "POST",
      }),
    )
    await waitFor(() => expect(onAgentsChange).toHaveBeenCalledTimes(1))

    expect(await screen.findByText(/slot registered/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /assign now/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /do it later/i })).toBeInTheDocument()
    expect(onManageRules).not.toHaveBeenCalled()
  })

  it("routes to policy when assign now is chosen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        agent: {
          agent_id: "agent-policy",
          treasury_id: "treasury-1",
          name: "Policy Bot",
          description: null,
          agent_pubkey: VALID_PUBLIC_KEY,
          status: "PENDING_CONFIGURATION",
          created_at: new Date().toISOString(),
          last_connected: null,
        },
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const onManageRules = vi.fn()

    render(
      <AgentManager
        treasuryId="treasury-1"
        token="token"
        agents={[]}
        onAgentsChange={vi.fn()}
        onManageRules={onManageRules}
        isDashboardWidget={false}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /add agent slot/i }))
    fireEvent.change(screen.getByPlaceholderText(/yield optimizer bot/i), {
      target: { value: "Policy Bot" },
    })
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    fireEvent.change(screen.getByPlaceholderText("G..."), {
      target: { value: VALID_PUBLIC_KEY },
    })
    fireEvent.click(screen.getByRole("button", { name: /done/i }))

    fireEvent.click(await screen.findByRole("button", { name: /assign now/i }))

    expect(onManageRules).toHaveBeenCalledWith("agent-policy")
    await waitFor(() => {
      expect(screen.queryByText(/slot registered/i)).not.toBeInTheDocument()
    })
  })

  it("closes the prompt without mutating policy state when do it later is chosen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        agent: {
          agent_id: "agent-later",
          treasury_id: "treasury-1",
          name: "Later Bot",
          description: null,
          agent_pubkey: VALID_PUBLIC_KEY,
          status: "PENDING_CONFIGURATION",
          created_at: new Date().toISOString(),
          last_connected: null,
        },
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const onManageRules = vi.fn()

    render(
      <AgentManager
        treasuryId="treasury-1"
        token="token"
        agents={[]}
        onAgentsChange={vi.fn()}
        onManageRules={onManageRules}
        isDashboardWidget={false}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /add agent slot/i }))
    fireEvent.change(screen.getByPlaceholderText(/yield optimizer bot/i), {
      target: { value: "Later Bot" },
    })
    fireEvent.click(screen.getByRole("button", { name: /next/i }))
    fireEvent.change(screen.getByPlaceholderText("G..."), {
      target: { value: VALID_PUBLIC_KEY },
    })
    fireEvent.click(screen.getByRole("button", { name: /done/i }))

    fireEvent.click(await screen.findByRole("button", { name: /do it later/i }))

    expect(onManageRules).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByText(/slot registered/i)).not.toBeInTheDocument()
    })
  })
})
