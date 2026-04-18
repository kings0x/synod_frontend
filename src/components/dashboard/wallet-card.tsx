"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Horizon, TransactionBuilder, Networks, Operation } from "@stellar/stellar-sdk";
import { apiFetch } from "@/lib/api";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";

interface WalletCardProps {
  treasuryId: string;
  token: string | null;
  wallet: {
    wallet_address: string;
    label: string | null;
    multisig_active: boolean;
    status: string;
  };
  onDisconnect?: (address: string) => void;
  onBalanceUpdate?: (address: string, aum: number) => void;
}

interface Balance {
  asset_code: string;
  balance: string;
  usd_value: number;
}

type LoadedAccount = Awaited<ReturnType<Horizon.Server["loadAccount"]>>;
type StellarBalance = LoadedAccount["balances"][number];
type StellarSigner = LoadedAccount["signers"][number];

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getAssetCode(balance: StellarBalance) {
  if (balance.asset_type === "native") {
    return "XLM";
  }

  if ("asset_code" in balance && typeof balance.asset_code === "string") {
    return balance.asset_code;
  }

  return balance.asset_type === "liquidity_pool_shares" ? "LP" : "ASSET";
}

export function WalletCard({
  treasuryId,
  token,
  wallet,
  onDisconnect,
  onBalanceUpdate,
}: WalletCardProps) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [revokeStatus, setRevokeStatus] = useState("");

  useEffect(() => {
    async function fetchBalances() {
      setLoading(true);
      try {
        const account = await horizon.loadAccount(wallet.wallet_address);
        const nextBalances: Balance[] = account.balances.map((balance: StellarBalance) => {
          const assetCode = getAssetCode(balance);
          const amount = Number.parseFloat(balance.balance);
          const usdValue = assetCode === "USDC" ? amount : assetCode === "XLM" ? amount * 0.15 : 0;

          return {
            asset_code: assetCode,
            balance: amount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            usd_value: usdValue,
          };
        });

        setBalances(nextBalances);
        const totalAum = nextBalances.reduce((sum, balance) => sum + balance.usd_value, 0);
        onBalanceUpdate?.(wallet.wallet_address, totalAum);
      } catch (fetchError) {
        console.error("Failed to fetch balance", fetchError);
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    void fetchBalances();
    const interval = window.setInterval(() => {
      void fetchBalances();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [wallet.wallet_address, onBalanceUpdate]);

  const handleSecureDisconnect = async () => {
    if (!token) {
      return;
    }

    setIsDisconnecting(true);
    setError("");

    try {
      setRevokeStatus("Fetching security context...");
      const setupRes = await apiFetch(`/multisig/${treasuryId}/setup`, { token });
      if (!setupRes.ok) {
        throw new Error("Could not fetch co-signer info");
      }

      const { coordinator_pubkey } = (await setupRes.json()) as {
        coordinator_pubkey: string;
      };

      setRevokeStatus("Building revocation transaction...");
      const account = await horizon.loadAccount(wallet.wallet_address);
      const tx = new TransactionBuilder(account, {
        fee: "1000",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.setOptions({
            signer: {
              ed25519PublicKey: coordinator_pubkey,
              weight: 0,
            },
            lowThreshold: 0,
            medThreshold: 0,
            highThreshold: 0,
          }),
        )
        .setTimeout(30)
        .build();

      const onChainAccount = await horizon.loadAccount(wallet.wallet_address);
      const isCoordinatorSigner = onChainAccount.signers.some(
        (signer: StellarSigner) => signer.key === coordinator_pubkey && signer.weight > 0,
      );
      const highThreshold = onChainAccount.thresholds?.high_threshold ?? 0;
      const masterWeight =
        onChainAccount.signers.find(
          (signer: StellarSigner) => signer.key === wallet.wallet_address,
        )?.weight ?? 1;
      const needsCosign = isCoordinatorSigner && highThreshold > masterWeight;

      setRevokeStatus("Sign revocation in your wallet...");
      const result = await StellarWalletsKit.signTransaction(tx.toXDR(), {
        networkPassphrase: Networks.TESTNET,
        address: wallet.wallet_address,
      });
      if (!result) {
        throw new Error("Revocation signing rejected");
      }

      if (
        "signerAddress" in result &&
        typeof result.signerAddress === "string" &&
        result.signerAddress !== wallet.wallet_address
      ) {
        throw new Error(
          `Wallet signed with ${result.signerAddress.substring(0, 8)}... instead of ${wallet.wallet_address.substring(0, 8)}...`,
        );
      }

      if (!needsCosign) {
        setRevokeStatus("Submitting directly to Stellar...");
        const signedTx = TransactionBuilder.fromXDR(result.signedTxXdr, Networks.TESTNET);
        await horizon.submitTransaction(signedTx);

        await apiFetch(`/multisig/${treasuryId}/revoke`, {
          method: "POST",
          token,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xdr: "OFF_CHAIN_BYPASS",
            wallet_address: wallet.wallet_address,
          }),
        });
      } else {
        setRevokeStatus("Finalizing revocation with Synod Security...");
        const res = await apiFetch(`/multisig/${treasuryId}/revoke`, {
          method: "POST",
          token,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            xdr: result.signedTxXdr,
            wallet_address: wallet.wallet_address,
          }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(errData.message?.split("{")[0] || "Revocation failed. Please try again.");
        }
      }

      try {
        StellarWalletsKit.disconnect();
      } catch {}

      onDisconnect?.(wallet.wallet_address);
      setShowConfirm(false);
    } catch (disconnectError: unknown) {
      console.error("Revocation failed:", disconnectError);
      setError(getErrorMessage(disconnectError, "Revocation failed"));
    } finally {
      setIsDisconnecting(false);
      setRevokeStatus("");
    }
  };

  const totalAum = balances.reduce((sum, balance) => sum + balance.usd_value, 0);

  return (
    <div className="group flex flex-col overflow-hidden rounded-md border border-synod-border bg-synod-card transition-all hover:border-white/20">
      <div className="border-b border-synod-border bg-gradient-to-br from-white/[0.02] to-transparent px-6 py-4">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-white/5">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
              <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              {wallet.status === "ACTIVE" ? "ACTIVE" : "SYNCING"}
            </span>
            <button className="text-synod-muted-dark transition-colors hover:text-white">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold tracking-tight text-white">
            {wallet.label || "Unnamed Wallet"}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-synod-muted-dark">
            {wallet.wallet_address.substring(0, 12)}...{wallet.wallet_address.substring(44)}
            <ExternalLink
              size={10}
              className="inline cursor-pointer opacity-50 group-hover:opacity-100"
            />
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-6 py-4">
        {loading && balances.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-synod-muted-dark" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-[10px] font-bold uppercase text-red-400">
            {error}
          </div>
        ) : (
          balances.map((balance) => (
            <div key={balance.asset_code} className="flex items-end justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[8px] font-bold">
                    {balance.asset_code.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-white">{balance.asset_code}</span>
                </div>
                <div className="pl-7 font-mono text-[9px] uppercase tracking-wider text-synod-muted-dark">
                  {balance.asset_code === "XLM" ? "native" : "circle.io"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[13px] font-bold text-white">{balance.balance}</div>
                <div className="mt-0.5 font-mono text-[10px] text-synod-muted-dark">
                  Approx. ${balance.usd_value.toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-synod-border border-t border-synod-border">
        <div className="space-y-1 p-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-synod-muted">
            Pools
          </div>
          <div className="truncate font-mono text-[10px] text-white">trading, ops_reserve</div>
        </div>
        <div className="space-y-1 p-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-synod-muted">
            AUM
          </div>
          <div className="font-mono text-[10px] text-white">${totalAum.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-black/40 bg-gradient-to-t from-white/[0.01] to-transparent px-6 py-3">
        <div className="flex items-center gap-2">
          {wallet.multisig_active ? (
            <>
              <Shield className="h-3.5 w-3.5 text-white/40" />
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-synod-muted-dark">
                2-of-2 multisig active
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-zinc-600" />
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-synod-muted-dark">
                multisig pending
              </span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button className="rounded-sm border border-white/5 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10">
            Details
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isDisconnecting}
            className="flex items-center gap-2 rounded-sm border border-red-400/10 bg-red-400/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-red-400/80 transition-colors hover:bg-red-400/10"
          >
            {isDisconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
          </button>
        </div>
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-md border border-synod-border bg-synod-card p-8 shadow-2xl">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold uppercase tracking-widest text-white">
                  Confirm Revocation
                </h4>
                <p className="text-[11px] leading-relaxed text-synod-muted">
                  This will permanently remove the Synod Coordinator as a co-signer on the
                  network and unlink the wallet from this treasury.
                </p>
              </div>

              {error ? (
                <div className="w-full overflow-hidden rounded-sm border border-red-400/10 bg-red-400/5 p-3 text-[10px] font-bold uppercase text-red-400 text-ellipsis">
                  {error.length > 100 ? `${error.substring(0, 100)}...` : error}
                </div>
              ) : null}

              <div className="flex w-full flex-col gap-3">
                <button
                  onClick={handleSecureDisconnect}
                  disabled={isDisconnecting}
                  className="flex h-12 w-full items-center justify-center gap-2 bg-red-500 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-red-600"
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {revokeStatus || "PROCESSING..."}
                    </>
                  ) : (
                    "SIGN & REVOKE ACCESS"
                  )}
                </button>
                <button
                  onClick={() => {
                    if (!isDisconnecting) {
                      setShowConfirm(false);
                    }
                  }}
                  disabled={isDisconnecting}
                  className="h-12 w-full border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
                >
                  CANCEL
                </button>
              </div>

              <p className="font-mono text-[9px] uppercase tracking-tighter text-synod-muted-dark">
                Dual-signature removal will trigger a network transaction.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
