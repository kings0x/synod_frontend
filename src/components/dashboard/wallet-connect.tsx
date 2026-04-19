"use client"

import { useState, useEffect } from "react"
import { useStellarWallet } from "@/hooks/use-stellar-wallet"
import { CheckCircle2, Loader2, X, Plus, ArrowUpRight } from "lucide-react"
import { apiFetch } from "@/lib/api"
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit'
import { Horizon, TransactionBuilder, Networks, Operation } from '@stellar/stellar-sdk'
import { isCoordinatorMultisigConfigured, waitForCoordinatorMultisig } from "@/lib/stellar-multisig"

type FlowStep = 'connect' | 'verify' | 'multisig' | 'done'

interface WalletConnectProps {
  treasuryId: string;
  token: string | null;
  activeWallets?: Array<{
    wallet_address: string;
    status: string;
    multisig_active: boolean;
  }>;
  onSuccess?: () => void;
}

type FlowError = Error & {
  response?: {
    data?: {
      extras?: {
        result_codes?: unknown;
      };
    };
  };
};

const getApiErrorMessage = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | null;

  return body?.message || body?.error || fallback;
};

const getFlowErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (typeof err === "string" && err.trim()) {
    return err;
  }

  return "Security flow failed";
};

export function WalletConnect({ treasuryId, token, activeWallets = [], onSuccess }: WalletConnectProps) {
  const { connect, sign, disconnect } = useStellarWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<FlowStep>('connect')
  const [statusText, setStatusText] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  // Reset flow when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('connect')
      setError("")
    }
  }, [isOpen])

  const handleUnifiedFlow = async () => {
    if (!token) return
    setError("")
    setLoading(true)

    try {
      // 1. Connection
      setStatusText("Connecting to wallet extension...")
      const addr = await connect()
      if (!addr) {
        setLoading(false)
        return // User cancelled
      }

      const existingWallet = (activeWallets || []).find(w => w.wallet_address === addr)

      if (existingWallet?.multisig_active) {
        setStatusText("Wallet is already fully secured by Synod.")
        setStep('done')
        setTimeout(() => setIsOpen(false), 2500)
        return
      }

      if (existingWallet) {
        setStatusText("Wallet already linked. Completing multisig setup...")
      }

      // 2. Verification check
      setStatusText("Analyzing authentication state...")
      const checkRes = await apiFetch("/wallets/check-verified", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: addr }),
      })

      let isVerified = false
      if (checkRes.ok) {
        const { verified } = await checkRes.json()
        isVerified = verified
      }

      if (!isVerified) {
        setStep('verify')
        setStatusText("Requesting challenge nonce...")
        const nRes = await apiFetch("/wallets/nonce", {
          method: "POST",
          token,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: addr }),
        })
        const nData = await nRes.json()

        setStatusText("Sign the verification message in your wallet...")
        const signature = await sign(nData.nonce, addr)
        if (!signature) {
          throw new Error("Signing rejected")
        }

        setStatusText("Verifying ownership with Synod...")
        const verifyRes = await apiFetch("/wallets/verify-ownership", {
          method: "POST",
          token,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: addr, signature, nonce: nData.nonce }),
        })
        if (!verifyRes.ok) throw new Error("Ownership verification failed")
      }

      // Always ensure linked to this treasury (idempotent on backend)
      const linkRes = await apiFetch(`/treasuries/${treasuryId}/wallets`, {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: addr, label: "Managed Wallet" }),
      })
      if (!linkRes.ok) {
        throw new Error(await getApiErrorMessage(linkRes, "Failed to link wallet to this treasury"))
      }

      // 3. Multisig
      setStep('multisig')

      console.log("Fetching multisig setup for treasury", treasuryId);
      const setupRes = await apiFetch(`/multisig/${treasuryId}/setup`, {
        token,
      })
      if (!setupRes.ok) {
        throw new Error(await getApiErrorMessage(setupRes, "Failed to fetch multisig setup"))
      }
      const { coordinator_pubkey } = await setupRes.json()

      setStatusText("Analyzing security state on-chain...")
      const server = new Horizon.Server("https://horizon-testnet.stellar.org")
      const account = await server.loadAccount(addr)

      const multisigState = isCoordinatorMultisigConfigured(account, addr, coordinator_pubkey)
      const hasSigner = multisigState.hasSigner
      const hasThresholds = multisigState.hasThresholds

      if (hasSigner && hasThresholds) {
        setStatusText("Security architecture verified (already active).")
      } else {
        setStatusText("Preparing SetOptions transaction...")
        const txBuilder = new TransactionBuilder(account, {
          fee: "1000",
          networkPassphrase: Networks.TESTNET
        })

        // Only add the signer if missing
        const setOptionsObj: Parameters<typeof Operation.setOptions>[0] = {
          lowThreshold: 1,
          medThreshold: 21,
          highThreshold: 21
        };

        if (!hasSigner) {
          setOptionsObj.signer = { ed25519PublicKey: coordinator_pubkey, weight: 20 };
        }

        const tx = txBuilder.addOperation(Operation.setOptions(setOptionsObj))
          .setTimeout(30).build()

        setStatusText("Sign SetOptions in your wallet...")
        const result = await StellarWalletsKit.signTransaction(tx.toXDR(), {
          networkPassphrase: Networks.TESTNET,
          address: addr,
        })
        if (!result) throw new Error("Transaction signing rejected")
        if (
          "signerAddress" in result &&
          typeof result.signerAddress === "string" &&
          result.signerAddress !== addr
        ) {
          throw new Error(
            `Wallet signed with ${result.signerAddress.substring(0, 8)}... instead of ${addr.substring(0, 8)}...`,
          )
        }

        setStatusText("Submitting to network...")
        const signedTx = TransactionBuilder.fromXDR(result.signedTxXdr, Networks.TESTNET)
        await server.submitTransaction(signedTx)

        setStatusText("Verifying multisig state on Stellar...")
        const confirmation = await waitForCoordinatorMultisig(server, addr, coordinator_pubkey)
        if (confirmation.status === "missing") {
          throw new Error(
            "Multisig transaction was submitted, but Stellar has not reflected the coordinator signer yet. Please wait a few seconds and try again.",
          )
        }
        if (confirmation.status === "unknown") {
          throw confirmation.error ?? new Error("Unable to verify multisig state on Stellar.")
        }
      }

      setStatusText("Confirming with Synod...")
      const confirmRes = await apiFetch(`/multisig/${treasuryId}/confirm`, {
        method: 'POST',
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: addr }),
      })
      if (!confirmRes.ok) {
        throw new Error(await getApiErrorMessage(confirmRes, "Confirmation failed"))
      }

      setStep('done')
      onSuccess?.()
      setTimeout(() => {
        setIsOpen(false)
      }, 2000)

    } catch (err: unknown) {
      const flowError = err as FlowError
      console.error("Security flow failed:", err);
      if (flowError.response?.data?.extras?.result_codes) {
        console.error("Horizon Result Codes:", flowError.response.data.extras.result_codes);
        setError(`Stellar Error: ${JSON.stringify(flowError.response.data.extras.result_codes)}`)
      } else {
        setError(getFlowErrorMessage(err))
      }
      try { disconnect() } catch { }
    } finally {
      setLoading(false)
      setStatusText("")
    }
  }

  // Persistent Card View
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative bg-synod-card border border-synod-border border-dashed rounded-md p-10 flex flex-col items-center justify-center text-center space-y-6 hover:border-white/40 hover:bg-white/[0.02] transition-all min-h-[250px]"
      >
        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
          <div className="w-8 h-8 text-synod-muted group-hover:text-white transition-colors">
            <Plus size={32} strokeWidth={1} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight uppercase">Connect New Wallet</h2>
          <p className="text-[11px] text-synod-muted-dark font-medium leading-relaxed max-w-[220px]">
            Use a Stellar wallet to link and secure it. <br />
            Multisig will be established automatically.
          </p>
        </div>

        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
            <ArrowUpRight size={14} className="text-black" />
          </div>
        </div>
      </button>

      {/* Connection Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-synod-card border border-synod-border w-full max-w-md p-8 rounded-md relative shadow-2xl">
            <button
              onClick={() => !loading && setIsOpen(false)}
              className="absolute top-4 right-4 text-synod-muted-dark hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">Provisioning Protocol</h3>
                <div className="flex gap-1">
                  {['connect', 'verify', 'multisig', 'done'].map((s, i) => (
                    <div key={s} className={`h-1 flex-1 rounded-full ${['connect', 'verify', 'multisig', 'done'].indexOf(step) >= i ? 'bg-white' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>

              <div className="py-4">
                {step === 'connect' && (
                  <div className="space-y-6">
                    <p className="text-xs text-synod-muted leading-relaxed text-center">
                      This stream-lined process connects your wallet, verifies ownership, and establishes 2-of-2 multisig security.
                      You will be prompted by your wallet extension to sign multiple requests.
                    </p>
                    <button
                      onClick={handleUnifiedFlow}
                      disabled={loading}
                      className="w-full h-14 bg-white text-black font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect & Secure Wallet"}
                    </button>
                    {loading && (
                      <p className="text-[9px] text-synod-muted font-mono uppercase tracking-widest text-center animate-pulse">
                        {statusText || "Awaiting wallet connection..."}
                      </p>
                    )}
                  </div>
                )}

                {(step === 'verify' || step === 'multisig') && (
                  <div className="flex flex-col items-center py-6 space-y-6 animate-in fade-in duration-500">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                    <div className="space-y-1 text-center">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest leading-none">
                        {step === 'verify' ? "Verifying Ownership" : "Securing Wallet"}
                      </h4>
                      <p className="text-[10px] text-synod-muted font-mono uppercase tracking-widest animate-pulse max-w-[200px] mt-2">
                        {statusText || "Waiting for user action..."}
                      </p>
                    </div>
                  </div>
                )}

                {step === 'done' && (
                  <div className="flex flex-col items-center py-8 space-y-4 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-white flex items-center justify-center rounded-full mb-4">
                      <CheckCircle2 size={32} className="text-black" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Protocol Verified</h4>
                      <p className="text-[11px] text-synod-muted">Security architecture established. Returning to dashboard.</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-sm">
                  <p className="text-[10px] text-red-400 font-bold uppercase text-center">System Failure: {error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

