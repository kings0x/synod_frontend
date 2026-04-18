"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { Horizon, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import type { AgentSlot } from "@/components/dashboard/agent-manager";

interface WalletSummary {
  wallet_address: string;
  label: string | null;
  multisig_active: boolean;
  status: string;
}

interface TreasuryRules {
  max_drawdown_pct: number;
  max_concurrent_permits: number;
}

interface AgentWalletRule {
  agent_id: string;
  wallet_address: string;
  allocation_pct: number;
  tier_limit_usd: number;
  concurrent_permit_cap: number;
}

interface ConstitutionContent {
  treasury_rules: TreasuryRules;
  agent_wallet_rules: AgentWalletRule[];
  memo: string | null;
}

interface ConstitutionResponse {
  version: number;
  treasury_id: string;
  state_hash: string;
  content: ConstitutionContent;
  executed_at: string;
}

interface PolicyManagerProps {
  treasuryId: string;
  token: string | null;
  wallets: WalletSummary[];
  walletBalances: Record<string, number>;
  agents: AgentSlot[];
  treasuryHealth: "HEALTHY" | "HALTED" | "DEGRADED" | "PENDING_WALLET";
  focusAgentId?: string | null;
  onTreasuryRefresh?: () => void | Promise<void>;
  onOpenAgent?: (agentId: string) => void;
}

interface RevokeTarget {
  agentId: string;
  walletAddress: string;
  agentName: string;
  walletLabel: string;
}

interface InteractionToast {
  type: "error" | "success";
  message: string;
}

type AllocationMode = "percent" | "usd";
type ApprovalState = "unknown" | "checking" | "approved" | "missing" | "approving" | "error";

interface WalletPolicyMetaEntry {
  agent_id: string;
  wallet_address: string;
  allocation_mode: AllocationMode;
  allocation_value: number;
  whitelist: string[];
  blacklist: string[];
}

interface PolicyMemoEnvelope {
  kind: "synod-policy-meta/v1";
  note: string | null;
  wallet_rule_meta: WalletPolicyMetaEntry[];
}

interface WalletDraft {
  selected: boolean;
  approvalState: ApprovalState;
  approvalMessage: string;
  allocationMode: AllocationMode;
  allocationValue: string;
  whitelist: string[];
  blacklist: string[];
  whitelistInput: string;
  blacklistInput: string;
}

const POLICY_MEMO_KIND = "synod-policy-meta/v1";

function truncateMiddle(value: string, left = 6, right = 4) {
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  })}`;
}

function statusClasses(status: string) {
  if (status === "ACTIVE") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (status.startsWith("PENDING")) return "border-synod-warning/30 bg-synod-warning/10 text-synod-warning";
  if (status === "INACTIVE") return "border-zinc-700 bg-zinc-900 text-zinc-300";
  if (status === "REVOKED") return "border-red-500/25 bg-red-500/10 text-red-300";
  if (status === "SUSPENDED") return "border-amber-500/25 bg-amber-500/10 text-amber-200";
  return "border-sky-500/25 bg-sky-500/10 text-sky-200";
}

function displayAgentStatus(agent: AgentSlot) {
  if (agent.status.startsWith("PENDING")) return "PENDING";
  if (agent.status === "ACTIVE" && !agent.last_connected) return "READY";
  return agent.status;
}

function agentStatusClasses(agent: AgentSlot) {
  if (agent.status === "ACTIVE" && !agent.last_connected) {
    return "border-white/10 bg-white/[0.03] text-synod-muted";
  }

  return statusClasses(agent.status);
}

function parsePolicyMemo(memo: string | null) {
  if (!memo) {
    return { note: null, entries: [] as WalletPolicyMetaEntry[] };
  }

  try {
    const parsed = JSON.parse(memo) as Partial<PolicyMemoEnvelope>;
    if (parsed.kind !== POLICY_MEMO_KIND || !Array.isArray(parsed.wallet_rule_meta)) {
      return { note: memo, entries: [] as WalletPolicyMetaEntry[] };
    }

    const entries = parsed.wallet_rule_meta
      .map((entry) => ({
        agent_id: String(entry.agent_id ?? ""),
        wallet_address: String(entry.wallet_address ?? ""),
        allocation_mode:
          entry.allocation_mode === "usd"
            ? ("usd" as AllocationMode)
            : ("percent" as AllocationMode),
        allocation_value:
          typeof entry.allocation_value === "number" && Number.isFinite(entry.allocation_value)
            ? entry.allocation_value
            : 0,
        whitelist: Array.isArray(entry.whitelist)
          ? entry.whitelist.map((item) => String(item).trim()).filter(Boolean)
          : [],
        blacklist: Array.isArray(entry.blacklist)
          ? entry.blacklist.map((item) => String(item).trim()).filter(Boolean)
          : [],
      }))
      .filter((entry) => entry.agent_id && entry.wallet_address);

    return {
      note: typeof parsed.note === "string" ? parsed.note : null,
      entries,
    };
  } catch {
    return { note: memo, entries: [] as WalletPolicyMetaEntry[] };
  }
}

function serializePolicyMemo(
  note: string | null,
  entries: WalletPolicyMetaEntry[],
) {
  if (!note && entries.length === 0) {
    return null;
  }

  return JSON.stringify({
    kind: POLICY_MEMO_KIND,
    note,
    wallet_rule_meta: entries,
  } satisfies PolicyMemoEnvelope);
}

function sanitizeAccountList(accounts: string[]) {
  return Array.from(
    new Set(accounts.map((account) => account.trim()).filter(Boolean)),
  );
}

function getMetaEntry(
  entries: WalletPolicyMetaEntry[],
  agentId: string,
  walletAddress: string,
) {
  return entries.find(
    (entry) =>
      entry.agent_id === agentId && entry.wallet_address === walletAddress,
  );
}

function approvalBadgeClasses(state: ApprovalState) {
  if (state === "approved") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  if (state === "approving" || state === "checking") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-100";
  }

  if (state === "missing" || state === "error") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  return "border-white/10 bg-white/[0.03] text-synod-muted";
}

function approvalLabel(state: ApprovalState) {
  if (state === "approved") return "Signer approved";
  if (state === "approving") return "Approving";
  if (state === "checking") return "Checking signer";
  if (state === "missing") return "Needs approval";
  if (state === "error") return "Needs review";
  return "Not checked";
}

function hasBoundPubkey(agent: AgentSlot) {
  return Boolean(agent.agent_pubkey?.trim());
}

export function PolicyManager({
  treasuryId,
  token,
  wallets,
  walletBalances,
  agents,
  treasuryHealth,
  focusAgentId,
  onTreasuryRefresh,
  onOpenAgent,
}: PolicyManagerProps) {
  const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
  const [agentRows, setAgentRows] = useState<AgentSlot[]>(agents);
  const [constitution, setConstitution] = useState<ConstitutionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [maxDrawdown, setMaxDrawdown] = useState("");
  const [maxConcurrentPermits, setMaxConcurrentPermits] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [interactionToast, setInteractionToast] = useState<InteractionToast | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({});
  const [walletDrafts, setWalletDrafts] = useState<Record<string, WalletDraft>>({});
  const [modalError, setModalError] = useState("");
  const [modalNotice, setModalNotice] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [approvingWalletAddress, setApprovingWalletAddress] = useState<string | null>(null);
  const [checkingWallets, setCheckingWallets] = useState(false);

  useEffect(() => {
    setAgentRows(agents);
  }, [agents]);

  useEffect(() => {
    if (!interactionToast) return;
    setToastVisible(false);

    const showTimer = window.setTimeout(() => setToastVisible(true), 10);
    const hideTimer = window.setTimeout(() => setToastVisible(false), 3400);
    const clearTimer = window.setTimeout(() => setInteractionToast(null), 3700);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [interactionToast]);

  useEffect(() => {
    const loadConstitution = async () => {
      if (!token) return;

      setLoading(true);
      setError("");

      try {
        const res = await apiFetch(`/treasuries/${treasuryId}/constitution`, {
          cache: "no-store",
          token,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || "Failed to load constitution");
        }

        const data: ConstitutionResponse = await res.json();
        setConstitution(data);
        setMaxDrawdown(String(data.content.treasury_rules.max_drawdown_pct));
        setMaxConcurrentPermits(String(data.content.treasury_rules.max_concurrent_permits));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load constitution");
      } finally {
        setLoading(false);
      }
    };

    void loadConstitution();
  }, [token, treasuryId]);

  useEffect(() => {
    if (!focusAgentId || !constitution || wallets.length === 0) {
      return;
    }

    const focusAgent = agentRows.find((agent) => agent.agent_id === focusAgentId);
    if (!focusAgent) {
      return;
    }

    void openAgentPolicyModal(focusAgent);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentRows, constitution, focusAgentId, wallets.length]);

  useEffect(() => {
    if (!activeAgentId) {
      return;
    }

    const activeAgent = agentRows.find((agent) => agent.agent_id === activeAgentId);
    const agentPubkey = activeAgent?.agent_pubkey?.trim();

    if (!activeAgent || !agentPubkey || wallets.length === 0) {
      return;
    }

    let cancelled = false;

    const checkWalletApprovals = async () => {
      setCheckingWallets(true);

      const results = await Promise.all(
        wallets.map(async (wallet) => ({
          walletAddress: wallet.wallet_address,
          signerState: await readAgentCosignerState(wallet.wallet_address, agentPubkey),
        })),
      );

      if (cancelled) {
        return;
      }

      setWalletDrafts((current) => {
        const next = { ...current };

        results.forEach((result) => {
          const draft = next[result.walletAddress];
          if (!draft) {
            return;
          }

          const nextState =
            result.signerState === "unknown"
              ? draft.approvalState === "approved"
                ? "approved"
                : "missing"
              : result.signerState;

          next[result.walletAddress] = {
            ...draft,
            approvalState: nextState,
            approvalMessage:
              nextState === "approved"
                ? "Signer approved on this wallet."
                : "Approve this agent as a co-signer before setting wallet rules.",
          };
        });

        return next;
      });
      setCheckingWallets(false);
    };

    void checkWalletApprovals();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgentId, agentRows, wallets]);

  const parsedMemo = parsePolicyMemo(constitution?.content.memo ?? null);
  const activeAgent =
    activeAgentId !== null
      ? agentRows.find((agent) => agent.agent_id === activeAgentId) ?? null
      : null;

  function showInteractionToast(type: InteractionToast["type"], message: string) {
    setInteractionToast({ type, message });
  }

  function getRule(agentId: string, walletAddress: string) {
    return constitution?.content.agent_wallet_rules.find(
      (rule) => rule.agent_id === agentId && rule.wallet_address === walletAddress,
    );
  }

  async function refreshAgents() {
    if (!token) return agentRows;

    try {
      const res = await apiFetch(`/agents/${treasuryId}`, {
        cache: "no-store",
        token,
      });

      if (!res.ok) {
        throw new Error("Failed to refresh agents");
      }

      const data: AgentSlot[] = await res.json();
      setAgentRows(data);
      return data;
    } catch (err) {
      console.error(err);
      return agentRows;
    }
  }

  async function saveConstitution(content: ConstitutionContent, successMessage: string) {
    if (!token) return null;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const res = await apiFetch(`/treasuries/${treasuryId}/constitution`, {
        method: "PUT",
        token,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to save constitution");
      }

      const data: ConstitutionResponse = await res.json();
      setConstitution(data);
      setMaxDrawdown(String(data.content.treasury_rules.max_drawdown_pct));
      setMaxConcurrentPermits(String(data.content.treasury_rules.max_concurrent_permits));
      setNotice(`${successMessage} Constitution v${data.version} saved.`);
      return data;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save constitution");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function readAgentCosignerState(
    walletAddress: string,
    agentPubkey: string,
  ): Promise<Extract<ApprovalState, "approved" | "missing" | "unknown">> {
    try {
      const account = await horizon.loadAccount(walletAddress);
      const approved = account.signers.some(
        (signer) => signer.key === agentPubkey && Number(signer.weight) > 0,
      );

      return approved ? "approved" : "missing";
    } catch (err) {
      console.error(err);
      return "unknown";
    }
  }

  async function waitForAgentCosignerState(
    walletAddress: string,
    agentPubkey: string,
    attempts = 8,
    delayMs = 1200,
  ): Promise<Extract<ApprovalState, "approved" | "missing" | "unknown">> {
    let lastState: Extract<ApprovalState, "approved" | "missing" | "unknown"> = "unknown";

    for (let index = 0; index < attempts; index += 1) {
      lastState = await readAgentCosignerState(walletAddress, agentPubkey);
      if (lastState === "approved") {
        return lastState;
      }

      if (index < attempts - 1) {
        await sleep(delayMs);
      }
    }

    return lastState;
  }

  async function finalizeSignerApprovalWithCoordinator(
    walletAddress: string,
    signedTxXdr: string,
  ) {
    if (!token) {
      throw new Error("Synod needs an authenticated session to finalize this multisig signer update.");
    }

    updateWalletDraft(walletAddress, (current) => ({
      ...current,
      approvalMessage: "Finalizing signer with Synod Security...",
    }));

    const res = await apiFetch(`/multisig/${treasuryId}/approve-signer`, {
      method: "POST",
      token,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        xdr: signedTxXdr,
        wallet_address: walletAddress,
      }),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(errData.message || "Failed to finalize co-signer approval with Synod.");
    }
  }

  async function submitSignerApprovalDirectly(walletAddress: string, signedTxXdr: string) {
    updateWalletDraft(walletAddress, (current) => ({
      ...current,
      approvalMessage: "Submitting signer approval to Stellar...",
    }));

    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    await horizon.submitTransaction(signedTx);
  }

  function getWalletBalance(walletAddress: string) {
    return walletBalances[walletAddress] ?? 0;
  }

  function buildInitialDraft(agentId: string, walletAddress: string): WalletDraft {
    const existingRule = getRule(agentId, walletAddress);
    const metaEntry = getMetaEntry(parsedMemo.entries, agentId, walletAddress);

    return {
      selected: Boolean(existingRule),
      approvalState: existingRule ? "approved" : "unknown",
      approvalMessage: existingRule
        ? "Signer already approved on this wallet."
        : "Select this wallet to configure access rules.",
      allocationMode: metaEntry?.allocation_mode ?? "percent",
      allocationValue:
        metaEntry && metaEntry.allocation_value > 0
          ? String(metaEntry.allocation_value)
          : existingRule
            ? String(existingRule.allocation_pct)
            : "",
      whitelist: metaEntry?.whitelist ?? [],
      blacklist: metaEntry?.blacklist ?? [],
      whitelistInput: "",
      blacklistInput: "",
    };
  }

  async function openAgentPolicyModal(agent: AgentSlot) {
    let latestAgent = agent;

    if (!latestAgent.agent_pubkey?.trim()) {
      const refreshedAgents = await refreshAgents();
      latestAgent = refreshedAgents.find((item) => item.agent_id === agent.agent_id) ?? agent;
    }

    if (!latestAgent.agent_pubkey?.trim()) {
      showInteractionToast("error", "Bind this agent public key in the Agent Slot first.");
      onOpenAgent?.(latestAgent.agent_id);
      return;
    }

    const nextDrafts = wallets.reduce<Record<string, WalletDraft>>((acc, wallet) => {
      acc[wallet.wallet_address] = buildInitialDraft(latestAgent.agent_id, wallet.wallet_address);
      return acc;
    }, {});

    setWalletDrafts(nextDrafts);
    setModalError("");
    setModalNotice("");
    setActiveAgentId(latestAgent.agent_id);
  }

  function closeAgentPolicyModal() {
    setActiveAgentId(null);
    setWalletDrafts({});
    setApprovingWalletAddress(null);
    setCheckingWallets(false);
    setModalError("");
    setModalNotice("");
  }

  function updateWalletDraft(
    walletAddress: string,
    updater: (draft: WalletDraft) => WalletDraft,
  ) {
    setWalletDrafts((current) => {
      const existing = current[walletAddress];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [walletAddress]: updater(existing),
      };
    });
  }

  function toggleAgentSummary(agentId: string) {
    setExpandedAgents((current) => ({
      ...current,
      [agentId]: !current[agentId],
    }));
  }

  function addAccountToList(
    walletAddress: string,
    listKey: "whitelist" | "blacklist",
  ) {
    const inputKey = listKey === "whitelist" ? "whitelistInput" : "blacklistInput";
    const draft = walletDrafts[walletAddress];
    if (!draft) {
      return;
    }

    const entries = sanitizeAccountList(
      draft[inputKey]
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean),
    );

    if (entries.length === 0) {
      return;
    }

    updateWalletDraft(walletAddress, (current) => ({
      ...current,
      [listKey]: sanitizeAccountList([...current[listKey], ...entries]),
      [inputKey]: "",
    }));
  }

  function removeAccountFromList(
    walletAddress: string,
    listKey: "whitelist" | "blacklist",
    value: string,
  ) {
    updateWalletDraft(walletAddress, (current) => ({
      ...current,
      [listKey]: current[listKey].filter((item) => item !== value),
    }));
  }

  function resolveAllocationForWallet(walletAddress: string, draft: WalletDraft) {
    const rawValue = Number.parseFloat(draft.allocationValue);

    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return { error: "Allocation must be greater than 0." } as const;
    }

    if (draft.allocationMode === "percent") {
      if (rawValue > 100) {
        return { error: "Allocation % must be between 1 and 100." } as const;
      }

      const balance = getWalletBalance(walletAddress);
      const derivedTierLimit =
        balance > 0 ? Math.max((balance * rawValue) / 100, 1) : 1000;

      return {
        allocationPct: rawValue,
        tierLimitUsd: derivedTierLimit,
        allocationValue: rawValue,
      } as const;
    }

    const balance = getWalletBalance(walletAddress);
    if (balance <= 0) {
      return {
        error:
          "Dollar allocation needs a live wallet balance so Synod can translate it into the current policy percentage.",
      } as const;
    }

    const allocationPct = (rawValue / balance) * 100;
    if (allocationPct < 1) {
      return {
        error:
          "This dollar value is below 1% of the current wallet balance. Increase it or switch to % mode.",
      } as const;
    }

    if (allocationPct > 100) {
      return {
        error: "This dollar value is larger than the current wallet balance.",
      } as const;
    }

    return {
      allocationPct,
      tierLimitUsd: rawValue,
      allocationValue: rawValue,
    } as const;
  }

  function walletAllocationSnapshot(walletAddress: string, editingAgentId?: string) {
    const allocated = (constitution?.content.agent_wallet_rules ?? [])
      .filter(
        (rule) =>
          rule.wallet_address === walletAddress && rule.agent_id !== editingAgentId,
      )
      .reduce((sum, rule) => sum + rule.allocation_pct, 0);

    const activeDraft = walletDrafts[walletAddress];
    if (!activeDraft?.selected) {
      return {
        allocated,
        total: allocated,
        remaining: Math.max(0, 100 - allocated),
        exceeds: allocated > 100,
      };
    }

    const resolved = resolveAllocationForWallet(walletAddress, activeDraft);
    if ("error" in resolved) {
      return {
        allocated,
        total: allocated,
        remaining: Math.max(0, 100 - allocated),
        exceeds: false,
      };
    }

    const total = allocated + resolved.allocationPct;
    return {
      allocated,
      total,
      remaining: Math.max(0, 100 - total),
      exceeds: total > 100,
    };
  }

  async function approveAgentSignerOnWallet(walletAddress: string) {
    if (!activeAgent?.agent_pubkey?.trim()) {
      setModalError("This agent still needs a bound public key.");
      return false;
    }

    const wallet = wallets.find((item) => item.wallet_address === walletAddress);
    if (!wallet) {
      return false;
    }

    setApprovingWalletAddress(walletAddress);
    setModalError("");
    setModalNotice("");
    updateWalletDraft(walletAddress, (current) => ({
      ...current,
      approvalState: "approving",
      approvalMessage: "Preparing signer transaction...",
    }));

    try {
      const source = await horizon.loadAccount(walletAddress);
      const tx = new TransactionBuilder(source, {
        fee: "1000",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.setOptions({
            signer: {
              ed25519PublicKey: activeAgent.agent_pubkey!.trim(),
              weight: 1,
            },
          }),
        )
        .setTimeout(30)
        .build();

      updateWalletDraft(walletAddress, (current) => ({
        ...current,
        approvalMessage: "Sign the multisig approval in your wallet...",
      }));

      const signed = await StellarWalletsKit.signTransaction(tx.toXDR(), {
        networkPassphrase: Networks.TESTNET,
        address: walletAddress,
      });

      if (!signed) {
        throw new Error("Wallet signing rejected");
      }

      if (
        "signerAddress" in signed &&
        typeof signed.signerAddress === "string" &&
        signed.signerAddress !== walletAddress
      ) {
        throw new Error(
          `Wallet signed with ${truncateMiddle(signed.signerAddress, 8, 4)} instead of ${truncateMiddle(walletAddress, 8, 4)}.`,
        );
      }

      const masterWeight =
        source.signers.find((signer) => signer.key === walletAddress)?.weight ?? 1;
      const thresholdNeedsCosign =
        source.thresholds.med_threshold > masterWeight ||
        source.thresholds.high_threshold > masterWeight;
      const shouldUseCoordinator = wallet.multisig_active && thresholdNeedsCosign;

      let lastSubmissionError: Error | null = null;

      if (shouldUseCoordinator) {
        try {
          await finalizeSignerApprovalWithCoordinator(walletAddress, signed.signedTxXdr);
        } catch (err) {
          lastSubmissionError =
            err instanceof Error
              ? err
              : new Error("Failed to finalize signer approval with Synod.");
        }
      }

      if (!shouldUseCoordinator || lastSubmissionError) {
        try {
          await submitSignerApprovalDirectly(walletAddress, signed.signedTxXdr);
          lastSubmissionError = null;
        } catch (err) {
          if (shouldUseCoordinator && lastSubmissionError) {
            throw lastSubmissionError;
          }

          if (wallet.multisig_active && token) {
            await finalizeSignerApprovalWithCoordinator(walletAddress, signed.signedTxXdr);
            lastSubmissionError = null;
          } else {
            throw err;
          }
        }
      }

      const confirmed = await waitForAgentCosignerState(
        walletAddress,
        activeAgent.agent_pubkey!.trim(),
      );

      if (confirmed === "missing") {
        throw new Error(
          "Signer approval was submitted, but Stellar has not reflected the new signer yet. Please wait a few seconds and try again.",
        );
      }

      updateWalletDraft(walletAddress, (current) => ({
        ...current,
        approvalState: "approved",
        approvalMessage: "Signer approved. Wallet rules are now editable.",
      }));

      if (confirmed === "unknown") {
        setModalNotice("Signer approval submitted. Synod is still refreshing the final on-chain check.");
      }

      showInteractionToast(
        "success",
        `Agent signer approved on ${wallet.label || truncateMiddle(wallet.wallet_address, 8, 4)}.`,
      );
      return true;
    } catch (err) {
      console.error(err);
      updateWalletDraft(walletAddress, (current) => ({
        ...current,
        approvalState: "error",
        approvalMessage:
          err instanceof Error ? err.message : "Something went wrong during signer approval.",
      }));
      setModalError(
        err instanceof Error ? err.message : "Something went wrong during signer approval.",
      );
      return false;
    } finally {
      setApprovingWalletAddress(null);
    }
  }

  async function approveSelectedWallets() {
    if (!activeAgent) {
      return;
    }

    const selectedWallets = wallets.filter(
      (wallet) =>
        walletDrafts[wallet.wallet_address]?.selected &&
        walletDrafts[wallet.wallet_address]?.approvalState !== "approved",
    );

    if (selectedWallets.length === 0) {
      setModalNotice("All selected wallets are already approved for this agent.");
      return;
    }

    for (const wallet of selectedWallets) {
      const ok = await approveAgentSignerOnWallet(wallet.wallet_address);
      if (!ok) {
        break;
      }
    }
  }

  async function saveAgentWalletRules() {
    if (!constitution || !activeAgent) {
      return;
    }

    setModalSaving(true);
    setModalError("");
    setModalNotice("");

    const nextRules = constitution.content.agent_wallet_rules.filter(
      (rule) => rule.agent_id !== activeAgent.agent_id,
    );
    const nextMetaEntries = parsedMemo.entries.filter(
      (entry) => entry.agent_id !== activeAgent.agent_id,
    );

    for (const wallet of wallets) {
      const draft = walletDrafts[wallet.wallet_address];
      if (!draft?.selected) {
        continue;
      }

      if (draft.approvalState !== "approved") {
        setModalSaving(false);
        setModalError(
          `${wallet.label || truncateMiddle(wallet.wallet_address, 8, 4)} still needs co-signer approval before it can receive rules.`,
        );
        return;
      }

      const resolved = resolveAllocationForWallet(wallet.wallet_address, draft);
      if ("error" in resolved) {
        setModalSaving(false);
        setModalError(
          `${wallet.label || truncateMiddle(wallet.wallet_address, 8, 4)}: ${resolved.error}`,
        );
        return;
      }

      const otherAllocated = constitution.content.agent_wallet_rules
        .filter(
          (rule) =>
            rule.wallet_address === wallet.wallet_address &&
            rule.agent_id !== activeAgent.agent_id,
        )
        .reduce((sum, rule) => sum + rule.allocation_pct, 0);

      if (otherAllocated + resolved.allocationPct > 100) {
        setModalSaving(false);
        setModalError(
          `${wallet.label || truncateMiddle(wallet.wallet_address, 8, 4)} exceeds 100% total allocation with the current draft.`,
        );
        return;
      }

      const existingRule = getRule(activeAgent.agent_id, wallet.wallet_address);
      nextRules.push({
        agent_id: activeAgent.agent_id,
        wallet_address: wallet.wallet_address,
        allocation_pct: Number(resolved.allocationPct.toFixed(2)),
        tier_limit_usd: Number(resolved.tierLimitUsd.toFixed(2)),
        concurrent_permit_cap:
          existingRule?.concurrent_permit_cap ??
          constitution.content.treasury_rules.max_concurrent_permits,
      });

      nextMetaEntries.push({
        agent_id: activeAgent.agent_id,
        wallet_address: wallet.wallet_address,
        allocation_mode: draft.allocationMode,
        allocation_value: resolved.allocationValue,
        whitelist: sanitizeAccountList(draft.whitelist),
        blacklist: sanitizeAccountList(draft.blacklist),
      });
    }

    const saved = await saveConstitution(
      {
        ...constitution.content,
        agent_wallet_rules: nextRules,
        memo: serializePolicyMemo(parsedMemo.note, nextMetaEntries),
      },
      "Agent wallet policy updated.",
    );

    setModalSaving(false);

    if (!saved) {
      return;
    }

    setModalNotice("Wallet access and policy rules saved.");
    closeAgentPolicyModal();
  }

  async function saveTreasuryRules() {
    if (!constitution) return;

    const nextDrawdown = Number.parseFloat(maxDrawdown);
    const nextConcurrent = Number.parseInt(maxConcurrentPermits, 10);

    if (!Number.isFinite(nextDrawdown) || nextDrawdown <= 0) {
      setError("Maximum Drawdown % must be greater than 0.");
      return;
    }

    if (!Number.isInteger(nextConcurrent) || nextConcurrent < 1) {
      setError("Maximum Concurrent Permits must be at least 1.");
      return;
    }

    await saveConstitution(
      {
        ...constitution.content,
        treasury_rules: {
          max_drawdown_pct: nextDrawdown,
          max_concurrent_permits: nextConcurrent,
        },
      },
      "Treasury rules updated.",
    );
  }

  async function revokeAccessRule() {
    if (!constitution || !revokeTarget) return;

    const nextRules = constitution.content.agent_wallet_rules.filter(
      (rule) =>
        !(
          rule.agent_id === revokeTarget.agentId &&
          rule.wallet_address === revokeTarget.walletAddress
        ),
    );

    const nextMetaEntries = parsedMemo.entries.filter(
      (entry) =>
        !(
          entry.agent_id === revokeTarget.agentId &&
          entry.wallet_address === revokeTarget.walletAddress
        ),
    );

    const saved = await saveConstitution(
      {
        ...constitution.content,
        agent_wallet_rules: nextRules,
        memo: serializePolicyMemo(parsedMemo.note, nextMetaEntries),
      },
      `Removed ${revokeTarget.agentName} access from ${revokeTarget.walletLabel}.`,
    );

    if (saved) {
      setRevokeTarget(null);
    }
  }

  async function resumeTreasury() {
    if (!token) return;

    setSaving(true);
    setError("");

    try {
      const res = await apiFetch(`/treasuries/${treasuryId}/resume`, {
        method: "POST",
        token,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to resume treasury");
      }

      setShowResumeConfirm(false);
      setNotice("Treasury resumed successfully.");
      await Promise.resolve(onTreasuryRefresh?.());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to resume treasury");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 rounded-md border border-synod-border bg-synod-card py-20 text-center">
        <div className="text-sm font-bold uppercase tracking-widest text-white">Loading Policy</div>
        <p className="text-xs text-synod-muted">
          Fetching the current constitution and wallet access rules.
        </p>
      </div>
    );
  }

  if (error && !constitution) {
    return (
      <div className="space-y-4 rounded-md border border-red-500/20 bg-synod-card py-20 text-center">
        <div className="text-sm font-bold uppercase tracking-widest text-white">
          Policy Load Failed
        </div>
        <p className="text-xs text-red-200">{error}</p>
      </div>
    );
  }

  if (!constitution) {
    return null;
  }

  const noWallets = wallets.length === 0;
  const noAgents = agentRows.length === 0;
  const noRulesConfigured = constitution.content.agent_wallet_rules.length === 0;
  const selectedWalletCount = Object.values(walletDrafts).filter((draft) => draft.selected).length;
  const allWalletsSelected = wallets.length > 0 && selectedWalletCount === wallets.length;

  return (
    <div className="space-y-6">
      {interactionToast && (
        <div
          className={`fixed bottom-6 right-6 z-[70] max-w-sm rounded-xl border border-synod-border bg-[#07070b]/95 px-4 py-3 shadow-2xl transition-all duration-300 ease-out ${
            toastVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div
            className={`text-xs ${
              interactionToast.type === "error" ? "text-red-200" : "text-emerald-200"
            }`}
          >
            {interactionToast.message}
          </div>
        </div>
      )}

      <section className="rounded-md border border-synod-border bg-synod-card">
        <div className="flex flex-col gap-4 border-b border-synod-border px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-bold text-white">Treasury Rules</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-synod-muted">
              Constitution v{constitution.version} - last updated {formatDate(constitution.executed_at)}
            </div>
          </div>
          <div className="break-all text-[10px] font-mono uppercase tracking-[0.16em] text-synod-muted-dark">
            {constitution.state_hash}
          </div>
        </div>

        <div className="space-y-5 p-5">
          {treasuryHealth === "HALTED" && (
            <div className="flex flex-col gap-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-sm font-bold text-white">Treasury is halted. Capital is frozen.</div>
                <p className="mt-2 text-sm text-synod-muted">
                  Resume operations below when you are ready to restore capital movement.
                </p>
              </div>
              <Button
                type="button"
                variant="error"
                size="sm"
                onClick={() => setShowResumeConfirm(true)}
                className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.16em]"
              >
                Resume
              </Button>
            </div>
          )}

          {(error || notice) && (
            <div
              className={`rounded-xl px-4 py-3 text-xs ${
                error
                  ? "border border-red-500/25 bg-red-500/10 text-red-200"
                  : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {error || notice}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-synod-muted-dark">
                Maximum Drawdown %
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={maxDrawdown}
                onChange={(event) => setMaxDrawdown(event.target.value)}
                className="h-12 w-full rounded-xl border border-synod-border bg-black px-4 text-sm text-white outline-none transition-colors focus:border-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-synod-muted-dark">
                Maximum Concurrent Permits
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxConcurrentPermits}
                onChange={(event) => setMaxConcurrentPermits(event.target.value)}
                className="h-12 w-full rounded-xl border border-synod-border bg-black px-4 text-sm text-white outline-none transition-colors focus:border-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => void saveTreasuryRules()}
              className="h-10 px-4 text-[10px] font-bold uppercase tracking-[0.16em]"
            >
              {saving ? "Saving..." : "Save Treasury Rules"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-synod-border bg-synod-card">
        <div className="border-b border-synod-border px-5 py-4">
          <div className="text-sm font-bold text-white">Agent Rules</div>
        </div>

        <div className="space-y-4 p-5">
          {noAgents ? (
            <div className="rounded-md border border-synod-border bg-black px-4 py-8 text-center text-sm text-synod-muted">
              No agents yet. Create an agent slot first, then configure wallet access here.
            </div>
          ) : noWallets ? (
            <div className="rounded-md border border-synod-border bg-black px-4 py-8 text-center text-sm text-synod-muted">
              No wallets connected. Connect a wallet from the Wallets page to start configuring agent access.
            </div>
          ) : (
            <>
              {noRulesConfigured && (
                <div className="rounded-md border border-synod-border bg-black px-4 py-3 text-sm text-synod-muted">
                  No access rules configured. Agents cannot move capital until you approve wallet co-signing and set rules here.
                </div>
              )}

              <div className="grid gap-4">
                {agentRows.map((agent) => {
                  const agentRules = constitution.content.agent_wallet_rules.filter(
                    (rule) => rule.agent_id === agent.agent_id,
                  );
                  const isFocused = focusAgentId === agent.agent_id;
                  const isExpanded = expandedAgents[agent.agent_id] ?? isFocused;

                  return (
                    <article
                      key={agent.agent_id}
                      className={`rounded-xl border px-4 py-3 ${
                        isFocused
                          ? "border-white/20 bg-white/[0.04]"
                          : "border-synod-border bg-black/40"
                      }`}
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-semibold text-white">{agent.name}</div>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] ${agentStatusClasses(agent)}`}
                            >
                              {displayAgentStatus(agent)}
                            </span>
                          </div>

                          <div className="font-mono text-[10px] text-synod-muted-dark">
                            {truncateMiddle(agent.agent_id, 12, 4)}
                          </div>

                          {!hasBoundPubkey(agent) ? (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                              This agent still needs a bound public key before wallet rules can be assigned.
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                          <div className="text-[9px] uppercase tracking-[0.16em] text-synod-muted-dark">
                            {agentRules.length} wallet{agentRules.length === 1 ? "" : "s"} assigned
                          </div>
                          {agentRules.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleAgentSummary(agent.agent_id)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-synod-border px-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:border-white/20"
                            >
                              {isExpanded ? "Hide Wallets" : "Show Wallets"}
                            </button>
                          ) : null}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void openAgentPolicyModal(agent)}
                            className="h-8 px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                          >
                            {agentRules.length > 0 ? "Manage Wallet Access" : "Configure Wallet Access"}
                          </Button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 grid gap-2 lg:grid-cols-3">
                          {agentRules.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-synod-border bg-black/60 px-3 py-3 text-xs text-synod-muted lg:col-span-3">
                              No wallets assigned yet.
                            </div>
                          ) : (
                            agentRules.map((rule) => {
                              const wallet = wallets.find(
                                (item) => item.wallet_address === rule.wallet_address,
                              );
                              const meta = getMetaEntry(
                                parsedMemo.entries,
                                rule.agent_id,
                                rule.wallet_address,
                              );
                              const capLabel =
                                meta?.allocation_mode === "usd"
                                  ? `${formatCurrency(meta.allocation_value)} cap`
                                  : `${rule.allocation_pct.toFixed(0)}% allocation`;

                              return (
                                <div
                                  key={`${rule.agent_id}:${rule.wallet_address}`}
                                  className="rounded-lg border border-synod-border bg-black/60 px-3 py-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-xs font-semibold text-white">
                                        {wallet?.label || "Wallet"}
                                      </div>
                                      <div className="mt-1 font-mono text-[9px] text-synod-muted-dark">
                                        {truncateMiddle(rule.wallet_address, 8, 4)}
                                      </div>
                                    </div>
                                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                                  </div>

                                  <div className="mt-3 space-y-1 text-[11px] text-synod-muted">
                                    <div className="text-white">{capLabel}</div>
                                    <div>
                                      {meta?.whitelist.length ?? 0} whitelist / {meta?.blacklist.length ?? 0} blacklist
                                    </div>
                                  </div>

                                  <div className="mt-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRevokeTarget({
                                          agentId: agent.agent_id,
                                          walletAddress: rule.wallet_address,
                                          agentName: agent.name,
                                          walletLabel:
                                            wallet?.label ||
                                            truncateMiddle(rule.wallet_address, 8, 4),
                                        })
                                      }
                                      className="text-[9px] font-bold uppercase tracking-[0.14em] text-red-300 transition-colors hover:text-red-200"
                                    >
                                      Remove Access
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {activeAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-[92vh] w-full max-w-[min(1320px,96vw)] flex-col overflow-hidden rounded-[30px] border border-synod-border bg-[#07070b] shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-synod-border px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-2xl font-semibold text-white">{activeAgent.name}</div>
                <div className="mt-2 max-w-2xl text-xs leading-5 text-white">
                  Select wallets for the agent, approve it as co-signer if needed, then set policies for each wallet.
                </div>
              </div>

              <button
                type="button"
                onClick={closeAgentPolicyModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-synod-border text-synod-muted transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-b border-synod-border lg:border-b-0 lg:border-r">
                <div className="space-y-3 border-b border-synod-border px-4 py-4">
                  <label className="flex items-center gap-2.5 rounded-lg border border-synod-border bg-white/[0.03] px-3 py-2">
                    <Checkbox
                      checked={allWalletsSelected}
                      className="size-4 border-white/40 bg-white/5 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                      onCheckedChange={(checked) => {
                        const nextSelected = checked === true;
                        setWalletDrafts((current) => {
                          const next = { ...current };
                          wallets.forEach((wallet) => {
                            const draft = next[wallet.wallet_address];
                            if (!draft) {
                              return;
                            }

                            next[wallet.wallet_address] = {
                              ...draft,
                              selected: nextSelected,
                            };
                          });
                          return next;
                        });
                      }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">Select all wallets</div>
                      <div className="text-[10px] text-white/80">
                        {selectedWalletCount} of {wallets.length} selected
                      </div>
                    </div>
                  </label>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={approvingWalletAddress !== null || selectedWalletCount === 0}
                    onClick={() => void approveSelectedWallets()}
                    className="h-9 w-full px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                  >
                    {approvingWalletAddress ? "Approving Wallets..." : "Approve Selected Co-Signers"}
                  </Button>

                  <div className="text-[9px] uppercase tracking-[0.16em] text-synod-muted-dark">
                    {checkingWallets ? "Checking wallet signer status..." : "Wallet access list"}
                  </div>
                </div>

                <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-3">
                  {wallets.map((wallet) => {
                    const draft = walletDrafts[wallet.wallet_address];
                    if (!draft) {
                      return null;
                    }

                    return (
                      <label
                        key={wallet.wallet_address}
                        className={`block rounded-xl border px-3 py-3 transition-colors ${
                          draft.selected
                            ? "border-white/15 bg-white/[0.05]"
                            : "border-synod-border bg-black/50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <Checkbox
                            checked={draft.selected}
                            className="mt-0.5 size-4 border-white/40 bg-white/5 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                            onCheckedChange={(checked) =>
                              updateWalletDraft(wallet.wallet_address, (current) => ({
                                ...current,
                                selected: checked === true,
                              }))
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[13px] font-semibold text-white">
                                  {wallet.label || "Wallet"}
                                </div>
                                <div className="mt-1 font-mono text-[9px] text-synod-muted-dark">
                                  {truncateMiddle(wallet.wallet_address, 8, 4)}
                                </div>
                              </div>
                              <span
                                className={`rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] ${approvalBadgeClasses(draft.approvalState)}`}
                              >
                                {approvalLabel(draft.approvalState)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </aside>

              <div className="custom-scrollbar min-h-0 overflow-y-auto px-4 py-4 lg:px-5">
                {modalError ? (
                  <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                    {modalError}
                  </div>
                ) : null}

                {modalNotice ? (
                  <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                    {modalNotice}
                  </div>
                ) : null}

                {selectedWalletCount === 0 ? (
                  <div className="flex h-full min-h-[360px] items-center justify-center rounded-[24px] border border-dashed border-synod-border bg-black/40 px-6 text-center">
                    <div>
                      <div className="text-sm font-semibold text-white">No wallet selected yet</div>
                      <p className="mt-3 text-xs leading-5 text-synod-muted">
                        Pick one or more wallets from the left rail. Once the signer is approved, each selected wallet opens its own policy panel here.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wallets
                      .filter((wallet) => walletDrafts[wallet.wallet_address]?.selected)
                      .map((wallet) => {
                        const draft = walletDrafts[wallet.wallet_address];
                        if (!draft) {
                          return null;
                        }

                        const snapshot = walletAllocationSnapshot(
                          wallet.wallet_address,
                          activeAgent.agent_id,
                        );
                        const canEdit = draft.approvalState === "approved";
                        const resolvedAllocation = resolveAllocationForWallet(
                          wallet.wallet_address,
                          draft,
                        );

                        return (
                          <section
                            key={wallet.wallet_address}
                            className="rounded-[24px] border border-synod-border bg-black/50"
                          >
                            <div className="flex flex-col gap-3 border-b border-synod-border px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="text-base font-semibold text-white">
                                  {wallet.label || "Wallet"}
                                </div>
                                <div className="mt-1 font-mono text-[10px] text-synod-muted-dark">
                                  {wallet.wallet_address}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] ${approvalBadgeClasses(draft.approvalState)}`}
                                >
                                  {approvalLabel(draft.approvalState)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-synod-muted">
                                  {formatCurrency(getWalletBalance(wallet.wallet_address))}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-4 px-4 py-4">
                              {!canEdit ? (
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                      <div className="text-xs font-semibold text-white">
                                        Co-signer approval required
                                      </div>
                                      <p className="mt-2 text-xs leading-5 text-amber-100">
                                        Only wallets that have approved this agent as a co-signer can receive rules.
                                      </p>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      disabled={approvingWalletAddress === wallet.wallet_address}
                                      onClick={() =>
                                        void approveAgentSignerOnWallet(wallet.wallet_address)
                                      }
                                      className="h-9 px-3 text-[9px] font-bold uppercase tracking-[0.14em]"
                                    >
                                      {approvingWalletAddress === wallet.wallet_address
                                        ? "Approving..."
                                        : "Approve Co-Signer"}
                                    </Button>
                                  </div>
                                </div>
                              ) : null}

                              <div className={`${canEdit ? "" : "pointer-events-none opacity-45"}`}>
                                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
                                  <div className="rounded-2xl border border-synod-border bg-white/[0.03] p-3.5">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                      <div>
                                        <div className="text-xs font-semibold text-white">
                                          Allocation
                                        </div>
                                        <div className="mt-1 text-[10px] text-synod-muted">
                                          Switch between percentage and dollar mode for this wallet.
                                        </div>
                                      </div>

                                      <div className="inline-flex rounded-full border border-synod-border bg-black/60 p-1">
                                        {(["percent", "usd"] as const).map((mode) => (
                                          <button
                                            key={mode}
                                            type="button"
                                            onClick={() =>
                                              updateWalletDraft(wallet.wallet_address, (current) => ({
                                                ...current,
                                                allocationMode: mode,
                                              }))
                                            }
                                            className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors ${
                                              draft.allocationMode === mode
                                                ? "bg-white text-black"
                                                : "text-synod-muted hover:text-white"
                                            }`}
                                          >
                                            {mode === "percent" ? "%" : "$"}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="mt-3 grid gap-3 lg:grid-cols-[140px_minmax(0,1fr)]">
                                      <input
                                        type="number"
                                        min="0"
                                        step={draft.allocationMode === "percent" ? "0.1" : "1"}
                                        value={draft.allocationValue}
                                        onChange={(event) =>
                                          updateWalletDraft(wallet.wallet_address, (current) => ({
                                            ...current,
                                            allocationValue: event.target.value,
                                          }))
                                        }
                                        className="h-10 rounded-xl border border-synod-border bg-black px-3 text-xs text-white outline-none transition-colors focus:border-white"
                                      />

                                      <div
                                        className={`rounded-xl border px-3 py-3 text-xs ${
                                          snapshot.exceeds
                                            ? "border-red-500/20 bg-red-500/10 text-red-200"
                                            : "border-white/8 bg-white/[0.03] text-synod-muted"
                                        }`}
                                      >
                                        <div className="text-white">
                                          {snapshot.allocated.toFixed(0)}% already allocated to other agents.
                                        </div>
                                        {"error" in resolvedAllocation ? (
                                          <div className="mt-2 text-red-200">
                                            {resolvedAllocation.error}
                                          </div>
                                        ) : (
                                          <div className="mt-2">
                                            This draft translates to{" "}
                                            {resolvedAllocation.allocationPct.toFixed(2)}% and{" "}
                                            {formatCurrency(resolvedAllocation.tierLimitUsd)} as the current permit cap.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-synod-border bg-white/[0.03] p-3.5">
                                    <div className="text-xs font-semibold text-white">Rule Summary</div>
                                    <div className="mt-3 space-y-2 text-xs text-synod-muted">
                                      <div>
                                        Remaining headroom:{" "}
                                        <span className="text-white">{snapshot.remaining.toFixed(0)}%</span>
                                      </div>
                                      <div>
                                        Whitelist entries:{" "}
                                        <span className="text-white">{draft.whitelist.length}</span>
                                      </div>
                                      <div>
                                        Blacklist entries:{" "}
                                        <span className="text-white">{draft.blacklist.length}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                                  {(["whitelist", "blacklist"] as const).map((listKey) => {
                                    const inputKey =
                                      listKey === "whitelist"
                                        ? "whitelistInput"
                                        : "blacklistInput";
                                    const title =
                                      listKey === "whitelist" ? "Whitelist" : "Blacklist";
                                    const description =
                                      listKey === "whitelist"
                                        ? "Accounts this agent is explicitly allowed to send to."
                                        : "Accounts this agent must never send to.";

                                    return (
                                      <div
                                        key={listKey}
                                        className="rounded-2xl border border-synod-border bg-white/[0.03] p-3.5"
                                      >
                                        <div className="text-xs font-semibold text-white">
                                          {title}
                                        </div>
                                        <div className="mt-1 text-[10px] text-synod-muted">
                                          {description}
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                          <input
                                            type="text"
                                            value={draft[inputKey]}
                                            onChange={(event) =>
                                              updateWalletDraft(wallet.wallet_address, (current) => ({
                                                ...current,
                                                [inputKey]: event.target.value,
                                              }))
                                            }
                                            onKeyDown={(event) => {
                                              if (event.key === "Enter") {
                                                event.preventDefault();
                                                addAccountToList(wallet.wallet_address, listKey);
                                              }
                                            }}
                                            placeholder="G..."
                                            className="h-10 flex-1 rounded-xl border border-synod-border bg-black px-3 text-xs text-white outline-none transition-colors placeholder:text-synod-muted-dark focus:border-white"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addAccountToList(wallet.wallet_address, listKey)}
                                            className="h-10 border border-synod-border px-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white"
                                          >
                                            Add
                                          </Button>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {draft[listKey].length === 0 ? (
                                            <div className="rounded-full border border-dashed border-synod-border px-3 py-1 text-[10px] text-synod-muted">
                                              No accounts added yet
                                            </div>
                                          ) : (
                                            draft[listKey].map((account) => (
                                              <span
                                                key={account}
                                                className="inline-flex items-center gap-2 rounded-full border border-synod-border bg-black px-3 py-1 text-[10px] text-white"
                                              >
                                                {truncateMiddle(account, 8, 4)}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    removeAccountFromList(
                                                      wallet.wallet_address,
                                                      listKey,
                                                      account,
                                                    )
                                                  }
                                                  className="text-synod-muted transition-colors hover:text-white"
                                                >
                                                  <X size={12} />
                                                </button>
                                              </span>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </section>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-synod-border px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-xs text-synod-muted">
                Selected wallets: <span className="text-white">{selectedWalletCount}</span>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeAgentPolicyModal}
                  className="h-9 border border-synod-border px-4 text-[9px] font-bold uppercase tracking-[0.14em] text-white"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => void saveAgentWalletRules()}
                  disabled={modalSaving}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-[9px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
                >
                  {modalSaving ? "Saving..." : "Save Wallet Rules"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResumeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-synod-border bg-[#07070b] shadow-2xl">
            <div className="border-b border-synod-border px-6 py-5 text-xl font-bold text-white">
              Resume Treasury
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-200" />
                <p className="text-sm leading-6 text-synod-muted">
                  Resume operations and unfreeze capital? This will allow permit issuance to continue under the current constitution.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResumeConfirm(false)}
                className="h-10 border border-synod-border px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => void resumeTreasury()}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-zinc-200 disabled:opacity-60"
              >
                {saving ? "Resuming..." : "Confirm Resume"}
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-synod-border bg-[#07070b] shadow-2xl">
            <div className="border-b border-synod-border px-6 py-5 text-xl font-bold text-white">
              Confirm Access Removal
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
                <p className="text-sm leading-6 text-synod-muted">
                  Remove {revokeTarget.agentName}&apos;s access to {revokeTarget.walletLabel}? This will prevent the agent from requesting any permits against this wallet immediately.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRevokeTarget(null)}
                className="h-10 border border-synod-border px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={() => void revokeAccessRule()}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-500 disabled:opacity-60"
              >
                {saving ? "Removing..." : "Confirm Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
