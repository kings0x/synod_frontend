"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { Sidebar, type DashboardTab } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { WalletConnect } from "@/components/dashboard/wallet-connect";
import { WalletCard } from "@/components/dashboard/wallet-card";
import { AgentManager, type AgentSlot } from "@/components/dashboard/agent-manager";
import { PolicyManager } from "@/components/dashboard/policy-manager";
import { ActivityLog } from "@/components/dashboard/activity-log";
import { apiFetch } from "@/lib/api";

interface Wallet {
  wallet_address: string;
  label: string | null;
  multisig_active: boolean;
  status: string;
}

interface TreasuryState {
  treasury_id: string;
  name: string;
  health: "HEALTHY" | "HALTED" | "DEGRADED" | "PENDING_WALLET";
  current_aum_usd: number;
  peak_aum_usd: number;
  network: string;
  wallets: Wallet[];
  active_permit_count: number;
}

interface DashboardListEntry {
  treasury_id: string;
}

interface DashboardBalancesResponse {
  treasury_id: string;
  total_aum_usd: number;
  balances: Array<{
    wallet_address: string;
    usd_value: number;
  }>;
}

interface EventPayload {
  treasury_id?: string;
}

interface EventEnvelope {
  event_type: string;
  payload?: EventPayload;
}

interface KPICardProps {
  label: string;
  value: number | string;
  change: string;
  trend: "up" | "neutral";
  isLoading?: boolean;
  isCurrency?: boolean;
}

export default function DashboardPage() {
  const { token, loading: authLoading, user, authError, refreshSession } = useAuth();
  const { events, status: socketStatus } = useSocket(token);
  const [state, setState] = useState<TreasuryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [noTreasury, setNoTreasury] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [agentsData, setAgentsData] = useState<AgentSlot[]>([]);
  const [aumLoaded, setAumLoaded] = useState(false);
  const [policyFocusAgentId, setPolicyFocusAgentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const totalAum = Object.values(walletBalances).reduce((sum, value) => sum + value, 0);
  const displayAum = totalAum > 0 ? totalAum : state?.current_aum_usd || 0;
  const liveAgents = agentsData.filter(
    (agent) => agent.status === "ACTIVE" && Boolean(agent.last_connected),
  ).length;

  const fetchAgents = useCallback(
    async (treasuryId: string) => {
      if (!token) {
        return;
      }

      try {
        const response = await apiFetch(`/agents/${treasuryId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }
        const data = (await response.json()) as AgentSlot[];
        setAgentsData(data);
      } catch (err) {
        console.error(err);
      }
    },
    [token],
  );

  const fetchTreasuryBalances = useCallback(
    async (treasuryId: string) => {
      if (!token) {
        return;
      }

      try {
        const response = await apiFetch(`/dashboard/${treasuryId}/balances`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard balances");
        }

        const data = (await response.json()) as DashboardBalancesResponse;
        const nextBalances = data.balances.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.wallet_address] = entry.usd_value;
          return acc;
        }, {});
        setWalletBalances(nextBalances);
        setAumLoaded(true);
      } catch (err) {
        console.error(err);
        setAumLoaded(false);
      }
    },
    [token],
  );

  const fetchTreasuryState = useCallback(
    async (treasuryId: string) => {
      const response = await apiFetch(`/dashboard/${treasuryId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch treasury state");
      }
      return (await response.json()) as TreasuryState;
    },
    [],
  );

  const fetchData = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiFetch("/dashboard", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard list");
      }

      const dashboardList = (await response.json()) as DashboardListEntry[];
      if (!Array.isArray(dashboardList) || dashboardList.length === 0) {
        setNoTreasury(true);
        setState(null);
        setWalletBalances({});
        setAgentsData([]);
        setAumLoaded(true);
        return;
      }

      const treasuryId = dashboardList[0].treasury_id;
      const nextState = await fetchTreasuryState(treasuryId);
      setState(nextState);
      setNoTreasury(false);

      await Promise.all([fetchAgents(treasuryId), fetchTreasuryBalances(treasuryId)]);
    } catch (err) {
      console.error(err);
      setLoadError("Unable to load the dashboard while the coordinator is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, fetchTreasuryBalances, fetchTreasuryState, token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void fetchData();
  }, [fetchData, token]);

  useEffect(() => {
    const latestEvent = events[0] as EventEnvelope | undefined;
    if (!latestEvent || !state?.treasury_id || !token) {
      return;
    }

    if (
      latestEvent.payload?.treasury_id &&
      latestEvent.payload.treasury_id !== state.treasury_id
    ) {
      return;
    }

    switch (latestEvent.event_type) {
      case "WALLET_BALANCE_UPDATE":
      case "TREASURY_HALTED":
      case "TREASURY_RESUMED":
        void Promise.all([
          fetchTreasuryBalances(state.treasury_id),
          fetchTreasuryState(state.treasury_id).then(setState).catch(console.error),
        ]);
        break;
      case "AGENT_STATUS_CHANGED":
      case "AGENT_CONNECTED":
      case "AGENT_ACTIVATED":
      case "AGENT_SUSPENDED":
        void fetchAgents(state.treasury_id);
        break;
      default:
        break;
    }
  }, [events, fetchAgents, fetchTreasuryBalances, fetchTreasuryState, state?.treasury_id, token]);

  const triggerResync = useCallback(async () => {
    if (!token || !state) {
      return;
    }

    try {
      await apiFetch(`/treasuries/${state.treasury_id}/resync`, {
        method: "POST",
      });
      await Promise.all([
        fetchTreasuryState(state.treasury_id).then(setState),
        fetchTreasuryBalances(state.treasury_id),
      ]);
    } catch (err) {
      console.error(err);
    }
  }, [fetchTreasuryBalances, fetchTreasuryState, state, token]);

  const handleProvision = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/treasuries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Primary Treasury",
          network: "testnet",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to provision treasury");
      }
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to provision treasury. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageRules = (agentId: string) => {
    setPolicyFocusAgentId(agentId);
    setActiveTab("policy");
  };

  const handleOpenAgentSlot = () => {
    setActiveTab("agents");
  };

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-synod-bg p-4">
        <div className="glass-card w-full max-w-xl space-y-6 p-8 text-center">
          <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 p-5">
            <Shield className="h-10 w-10 text-red-200" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Coordinator Unavailable
            </h1>
            <p className="text-sm text-synod-muted">{authError}</p>
            <p className="text-xs text-synod-muted-dark">
              Start `synod-coordinator` or point `SYNOD_COORDINATOR_ORIGIN` at the
              active coordinator, then retry.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void refreshSession()}
              className="h-12 flex-1 rounded-md bg-white px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-zinc-200"
            >
              Retry Session Check
            </button>
            <a
              href="/signin"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-md border border-synod-border px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/5"
            >
              Open Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-synod-bg font-mono text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50">
          Synchronizing Core...
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-synod-bg p-4">
        <div className="glass-card w-full max-w-xl space-y-6 p-8 text-center">
          <div className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 p-5">
            <Shield className="h-10 w-10 text-red-200" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Dashboard Load Failed
            </h1>
            <p className="text-sm text-synod-muted">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="h-12 w-full rounded-md bg-white px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-black transition-colors hover:bg-zinc-200"
          >
            Retry Dashboard Load
          </button>
        </div>
      </div>
    );
  }

  if (noTreasury || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-synod-bg p-4">
        <div className="w-full max-w-md space-y-12 text-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-8">
            <Shield className="h-12 w-12 text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
              System Initialization
            </h1>
            <p className="text-sm text-synod-muted">
              No active treasuries found. Provision a primary treasury to
              continue.
            </p>
          </div>
          <button
            onClick={handleProvision}
            className="h-14 w-full bg-white text-xs font-bold uppercase tracking-widest text-black transition-all hover:bg-zinc-200"
          >
            Provision Primary Treasury
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-row overflow-hidden bg-synod-bg">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={{ name: user.name, avatar: user.avatar }}
        badges={{
          wallets: state.wallets.length || 0,
          agents: agentsData.length,
          permits: state.active_permit_count || 0,
        }}
      />

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <Topbar
          title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          subtitle={
            activeTab === "agents"
              ? `/ ${agentsData.length} slots`
              : `/ ${state.name || "treasury-1"}`
          }
          health={state.health}
          onResync={triggerResync}
        />

        <main className="custom-scrollbar flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl">
            {activeTab === "overview" ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <KPICard
                    label="Total AUM"
                    value={displayAum}
                    isLoading={!aumLoaded}
                    isCurrency
                    change={aumLoaded ? "Coordinator-backed balance view" : "Loading"}
                    trend="up"
                  />
                  <KPICard
                    label="Active Permits"
                    value={state.active_permit_count}
                    change="Live from coordinator"
                    trend="neutral"
                  />
                  <KPICard
                    label="Agents Active"
                    value={`${liveAgents} / ${agentsData.length}`}
                    change={`${agentsData.length - liveAgents} not live`}
                    trend="neutral"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <AgentManager
                      treasuryId={state.treasury_id}
                      token={token}
                      agents={agentsData}
                      onAgentsChange={() => fetchAgents(state.treasury_id)}
                      isDashboardWidget
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "wallets" ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {state.wallets.map((wallet) => (
                  <WalletCard
                    key={wallet.wallet_address}
                    treasuryId={state.treasury_id}
                    token={token}
                    wallet={wallet}
                    onRefresh={() => {
                      void triggerResync();
                      void fetchData();
                    }}
                    onBalanceUpdate={(address, aum) => {
                      setWalletBalances((prev) => ({ ...prev, [address]: aum }));
                      setAumLoaded(true);
                    }}
                    onDisconnect={() => {
                      setWalletBalances((prev) => {
                        const next = { ...prev };
                        delete next[wallet.wallet_address];
                        return next;
                      });
                      void triggerResync();
                      void fetchData();
                    }}
                  />
                ))}
                <WalletConnect
                  treasuryId={state.treasury_id}
                  token={token}
                  activeWallets={state.wallets}
                  onSuccess={() => {
                    void triggerResync();
                    void fetchData();
                  }}
                />
              </div>
            ) : null}

            {activeTab === "agents" ? (
              <div className="h-full space-y-8">
                <AgentManager
                  treasuryId={state.treasury_id}
                  token={token}
                  agents={agentsData}
                  onAgentsChange={() => fetchAgents(state.treasury_id)}
                  onManageRules={handleManageRules}
                  isDashboardWidget={false}
                />
              </div>
            ) : null}

            {activeTab === "policy" ? (
              <PolicyManager
                treasuryId={state.treasury_id}
                token={token}
                wallets={state.wallets}
                walletBalances={walletBalances}
                agents={agentsData}
                treasuryHealth={state.health}
                focusAgentId={policyFocusAgentId}
                onTreasuryRefresh={fetchData}
                onOpenAgent={handleOpenAgentSlot}
              />
            ) : null}

            {activeTab === "activity" ? (
              <ActivityLog
                treasuryId={state.treasury_id}
                network={state.network}
                wallets={state.wallets}
                events={events}
                socketStatus={socketStatus}
              />
            ) : null}

            {activeTab === "permits" || activeTab === "settings" ? (
              <div className="space-y-4 rounded-md border border-dashed border-synod-border bg-synod-card py-20 text-center">
                <div className="text-sm font-bold uppercase tracking-widest text-white">
                  Section Initialization Required
                </div>
                <p className="text-xs text-synod-muted">
                  This module is currently being optimized for the new Synod app
                  shell.
                </p>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  change,
  trend,
  isLoading,
  isCurrency,
}: KPICardProps) {
  const [displayVal, setDisplayVal] = useState(0);
  const targetVal = isCurrency && typeof value === "number" ? value : 0;

  useEffect(() => {
    if (!isCurrency || isLoading) {
      return;
    }

    const duration = 1200;
    const start = performance.now();
    const from = displayVal;
    const to = targetVal;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [displayVal, isCurrency, isLoading, targetVal]);

  const formattedValue = isCurrency
    ? `$${displayVal.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`
    : value;

  return (
    <div className="cursor-default rounded-md border border-synod-border bg-synod-card p-5 transition-colors hover:border-synod-border-strong">
      <h4 className="mb-4 font-mono text-[9px] uppercase tracking-[0.2em] text-synod-muted">
        {label}
      </h4>
      {isLoading ? (
        <div className="flex h-8 items-center">
          <div
            className="h-5 w-28 animate-pulse rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5"
            style={{ animationDuration: "1.5s" }}
          />
        </div>
      ) : (
        <div className="text-2xl font-bold tracking-tighter text-white">
          {formattedValue}
        </div>
      )}
      <div
        className={`mt-2 flex items-center gap-1 font-mono text-[10px] ${
          trend === "up" ? "text-white" : "text-synod-muted"
        }`}
      >
        {trend === "up" ? <ArrowUpRight size={12} /> : null}
        {change}
      </div>
    </div>
  );
}
