"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRightLeft, CheckCircle2, ShieldAlert, Wallet } from "lucide-react";

interface WalletSummary {
  wallet_address: string;
  label: string | null;
  multisig_active: boolean;
  status: string;
}

interface EventEnvelope {
  event_type: string;
  payload?: Record<string, unknown>;
}

interface ActivityLogProps {
  treasuryId: string;
  network: string;
  wallets: WalletSummary[];
  historyEvents: EventEnvelope[];
  events: EventEnvelope[];
  socketStatus: "idle" | "connecting" | "connected" | "reconnecting" | "error";
}

type ActivityTone = "success" | "warning" | "danger" | "info" | "neutral";

interface ActivityItem {
  id: string;
  source: "coordinator" | "horizon";
  title: string;
  detail: string;
  scope: string;
  timestamp: string;
  tone: ActivityTone;
}

function truncateMiddle(value: string, left = 6, right = 4) {
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString();
}

function buildHorizonOrigin(network: string) {
  return network.toLowerCase() === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";
}

function toneClasses(tone: ActivityTone) {
  if (tone === "success") {
    return "border-emerald-500/20 bg-emerald-500/8 text-emerald-100";
  }

  if (tone === "warning") {
    return "border-amber-500/20 bg-amber-500/8 text-amber-100";
  }

  if (tone === "danger") {
    return "border-red-500/20 bg-red-500/8 text-red-100";
  }

  if (tone === "info") {
    return "border-sky-500/20 bg-sky-500/8 text-sky-100";
  }

  return "border-white/8 bg-white/[0.03] text-synod-muted";
}

function normalizeCoordinatorEvent(event: EventEnvelope): ActivityItem {
  const payload = event.payload ?? {};
  const timestamp =
    typeof payload.timestamp === "string"
      ? payload.timestamp
      : new Date().toISOString();
  const treasuryLabel =
    typeof payload.treasury_id === "string"
      ? truncateMiddle(payload.treasury_id, 8, 4)
      : "Synod";

  switch (event.event_type) {
    case "WALLET_BALANCE_UPDATE":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Wallet balance updated",
        detail:
          typeof payload.wallet_address === "string"
            ? `Coordinator refreshed ${truncateMiddle(payload.wallet_address, 8, 4)}.`
            : "Coordinator refreshed wallet balances.",
        scope: treasuryLabel,
        timestamp,
        tone: "info",
      };
    case "PERMIT_ISSUED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Permit issued",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} received execution approval.`
            : "A new permit was issued.",
        scope: treasuryLabel,
        timestamp,
        tone: "success",
      };
    case "PERMIT_CONSUMED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Permit consumed",
        detail: "An approved action has been executed against policy.",
        scope: treasuryLabel,
        timestamp,
        tone: "success",
      };
    case "PERMIT_EXPIRED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Permit expired",
        detail: "A pending approval window elapsed before execution.",
        scope: treasuryLabel,
        timestamp,
        tone: "warning",
      };
    case "TREASURY_HALTED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Treasury halted",
        detail: "Capital movement has been frozen until the treasury is resumed.",
        scope: treasuryLabel,
        timestamp,
        tone: "danger",
      };
    case "TREASURY_RESUMED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Treasury resumed",
        detail: "Capital movement has been restored under the active constitution.",
        scope: treasuryLabel,
        timestamp,
        tone: "success",
      };
    case "AGENT_CONNECTED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Agent connected",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} established a live Synod session.`
            : "An agent connected successfully.",
        scope: treasuryLabel,
        timestamp,
        tone: "success",
      };
    case "AGENT_ACTIVATED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Agent activated",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} is fully live on approved wallets.`
            : "An agent became fully active.",
        scope: treasuryLabel,
        timestamp,
        tone: "success",
      };
    case "AGENT_SIGNER_ADDED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Agent signer approved",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} was added as a signer on a managed wallet.`
            : "An agent signer was approved on-chain.",
        scope: treasuryLabel,
        timestamp,
        tone: "info",
      };
    case "INTENT_RECEIVED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Intent received",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} submitted ${String(payload.intent_type ?? "an intent")} against ${truncateMiddle(String(payload.wallet_address ?? "wallet"), 8, 4)}.`
            : "Synod received a new agent intent.",
        scope: treasuryLabel,
        timestamp,
        tone: "info",
      };
    case "AGENT_SUSPENDED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Agent suspended",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} was suspended.`
            : "An agent was suspended.",
        scope: treasuryLabel,
        timestamp,
        tone: "warning",
      };
    case "AGENT_STATUS_CHANGED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Agent status changed",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} changed status to ${String(payload.new_status ?? "updated")}.`
            : "An agent changed state.",
        scope: treasuryLabel,
        timestamp,
        tone: "info",
      };
    case "CONSTITUTION_UPDATE":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Policy updated",
        detail: "The treasury constitution was updated and rebroadcast to agents.",
        scope: treasuryLabel,
        timestamp,
        tone: "info",
      };
    case "INTENT_CONFIRMED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Intent confirmed",
        detail:
          typeof payload.agent_id === "string"
            ? `Agent ${truncateMiddle(payload.agent_id, 8, 4)} completed a transaction successfully.`
            : "An agent intent was confirmed.",
        scope: treasuryLabel,
        timestamp,
        tone: "success",
      };
    case "INTENT_REJECTED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Intent rejected",
        detail:
          typeof payload.reason === "string"
            ? payload.reason
            : "Synod policy rejected an agent intent.",
        scope: treasuryLabel,
        timestamp,
        tone: "warning",
      };
    case "INTENT_FAILED":
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: "Intent failed",
        detail:
          typeof payload.reason === "string"
            ? payload.reason
            : "An agent intent failed after submission.",
        scope: treasuryLabel,
        timestamp,
        tone: "danger",
      };
    default:
      return {
        id: `coord-${event.event_type}-${JSON.stringify(payload)}`,
        source: "coordinator",
        title: event.event_type.replace(/_/g, " ").toLowerCase(),
        detail: "Synod coordinator reported a new system event.",
        scope: treasuryLabel,
        timestamp,
        tone: "neutral",
      };
  }
}

function normalizeHorizonOperation(
  walletLabel: string,
  walletAddress: string,
  payload: Record<string, unknown>,
): ActivityItem {
  const operationType =
    typeof payload.type === "string" ? payload.type : "operation";
  const timestamp =
    typeof payload.created_at === "string"
      ? payload.created_at
      : new Date().toISOString();
  const operationId =
    typeof payload.id === "string" || typeof payload.id === "number"
      ? String(payload.id)
      : `${walletAddress}-${timestamp}`;

  if (operationType === "payment") {
    const amount =
      typeof payload.amount === "string"
        ? Number.parseFloat(payload.amount)
        : null;
    const asset =
      typeof payload.asset_code === "string" ? payload.asset_code : "XLM";
    const destination =
      typeof payload.to === "string" ? truncateMiddle(payload.to, 6, 4) : "destination";

    return {
      id: `horizon-${operationId}`,
      source: "horizon",
      title: "Payment observed",
      detail:
        amount !== null && Number.isFinite(amount)
          ? `${amount.toLocaleString()} ${asset} moved toward ${destination}.`
          : `A payment involving ${walletLabel} reached Horizon.`,
      scope: walletLabel,
      timestamp,
      tone: "success",
    };
  }

  if (operationType === "set_options") {
    return {
      id: `horizon-${operationId}`,
      source: "horizon",
      title: "Signer configuration updated",
      detail: "A multisig or signer configuration change was seen on-chain.",
      scope: walletLabel,
      timestamp,
      tone: "info",
    };
  }

  if (operationType === "path_payment_strict_send" || operationType === "path_payment_strict_receive") {
    return {
      id: `horizon-${operationId}`,
      source: "horizon",
      title: "Path payment observed",
      detail: "A routed asset transfer involving this wallet was confirmed.",
      scope: walletLabel,
      timestamp,
      tone: "success",
    };
  }

  if (operationType === "account_merge") {
    return {
      id: `horizon-${operationId}`,
      source: "horizon",
      title: "Account merge observed",
      detail: "A merge operation involving this wallet was seen on-chain.",
      scope: walletLabel,
      timestamp,
      tone: "warning",
    };
  }

  return {
    id: `horizon-${operationId}`,
    source: "horizon",
    title: operationType.replace(/_/g, " "),
    detail: `Horizon reported a new ${operationType.replace(/_/g, " ")} event.`,
    scope: walletLabel,
    timestamp,
    tone: "neutral",
  };
}

export function ActivityLog({
  treasuryId,
  network,
  wallets,
  historyEvents,
  events,
  socketStatus,
}: ActivityLogProps) {
  const [horizonItems, setHorizonItems] = useState<ActivityItem[]>([]);
  const [horizonStatus, setHorizonStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const seenIds = useRef<Set<string>>(new Set());

  const coordinatorItems = useMemo(() => {
    const localSeen = new Set<string>();

    return [...events, ...historyEvents]
      .map((event) => normalizeCoordinatorEvent(event))
      .filter((item) => {
        if (localSeen.has(item.id)) {
          return false;
        }

        localSeen.add(item.id);
        return true;
      })
      .slice(0, 60);
  }, [events, historyEvents]);

  useEffect(() => {
    if (wallets.length === 0) {
      return;
    }

    const horizonOrigin = buildHorizonOrigin(network);
    const streams = wallets.map((wallet) => {
      const source = new EventSource(
        `${horizonOrigin}/accounts/${wallet.wallet_address}/operations?cursor=now&order=asc`,
      );

      source.onopen = () => {
        setHorizonStatus("connected");
      };

      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as Record<string, unknown>;
          const nextItem = normalizeHorizonOperation(
            wallet.label || truncateMiddle(wallet.wallet_address, 8, 4),
            wallet.wallet_address,
            payload,
          );

          if (seenIds.current.has(nextItem.id)) {
            return;
          }

          seenIds.current.add(nextItem.id);
          setHorizonItems((current) => [nextItem, ...current].slice(0, 60));
        } catch (error) {
          console.error("Horizon SSE parse error", error);
        }
      };

      source.onerror = () => {
        setHorizonStatus("error");
      };

      return source;
    });

    return () => {
      streams.forEach((stream) => stream.close());
    };
  }, [network, wallets]);

  const displayedHorizonStatus =
    wallets.length === 0
      ? "idle"
      : horizonStatus === "idle"
        ? "connecting"
        : horizonStatus;

  const coordinatorBadge = useMemo(() => {
    if (socketStatus === "connected") {
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
    }

    if (socketStatus === "reconnecting" || socketStatus === "connecting") {
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    }

    if (socketStatus === "error") {
      return "border-red-500/20 bg-red-500/10 text-red-100";
    }

    return "border-white/8 bg-white/[0.03] text-synod-muted";
  }, [socketStatus]);

  const horizonBadge = useMemo(() => {
    if (displayedHorizonStatus === "connected") {
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    }

    if (displayedHorizonStatus === "connecting") {
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    }

    if (displayedHorizonStatus === "error") {
      return "border-red-500/20 bg-red-500/10 text-red-100";
    }

    return "border-white/8 bg-white/[0.03] text-synod-muted";
  }, [displayedHorizonStatus]);

  const items = useMemo(() => {
    const merged = [...horizonItems, ...coordinatorItems];
    const localSeen = new Set<string>();

    return merged
      .filter((item) => {
        if (localSeen.has(item.id)) {
          return false;
        }

        localSeen.add(item.id);
        return true;
      })
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
      )
      .slice(0, 120);
  }, [coordinatorItems, horizonItems]);

  return (
    <section className="rounded-md border border-synod-border bg-synod-card">
      <div className="flex flex-col gap-4 border-b border-synod-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-bold text-white">Activity Log</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-synod-muted">
            Persisted coordinator history plus Horizon stream for {truncateMiddle(treasuryId, 8, 4)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
          <span className={`rounded-full border px-2.5 py-1 ${coordinatorBadge}`}>
            Coordinator {socketStatus}
          </span>
          <span className={`rounded-full border px-2.5 py-1 ${horizonBadge}`}>
            Horizon SSE {displayedHorizonStatus}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-5">
        {wallets.length === 0 ? (
          <div className="rounded-xl border border-synod-border bg-black px-4 py-10 text-center">
            <Wallet className="mx-auto h-5 w-5 text-synod-muted-dark" />
            <p className="mt-3 text-sm text-synod-muted">
              Connect a wallet to start streaming on-chain activity here.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-synod-border bg-black px-4 py-10 text-center">
            <Activity className="mx-auto h-5 w-5 text-synod-muted-dark" />
            <p className="mt-3 text-sm text-synod-muted">
              Waiting for the next coordinator or Horizon event.
            </p>
          </div>
        ) : (
          <div className="custom-scrollbar max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border px-4 py-4 ${toneClasses(item.tone)}`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {item.source === "coordinator" ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : item.tone === "success" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                    </div>
                    <p className="text-sm leading-6 text-synod-muted">{item.detail}</p>
                  </div>

                  <div className="shrink-0 space-y-1 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-synod-muted-dark">
                      {item.scope}
                    </div>
                    <div className="text-[11px] text-synod-muted">
                      {formatDate(item.timestamp)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
