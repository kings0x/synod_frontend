import { Horizon } from "@stellar/stellar-sdk";

type LoadedAccount = Awaited<ReturnType<Horizon.Server["loadAccount"]>>;
type StellarSigner = LoadedAccount["signers"][number];

export interface CoordinatorRevocationPlan {
  coordinatorWeight: number;
  masterWeight: number;
  lowThreshold: number;
  medThreshold: number;
  highThreshold: number;
  shouldRemoveCoordinatorSigner: boolean;
  shouldResetThresholds: boolean;
  shouldBypassOnChain: boolean;
  canAuthorizeThresholdResetAlone: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function getAccountSignerWeight(account: LoadedAccount, signerKey: string) {
  return account.signers.find((signer: StellarSigner) => signer.key === signerKey)?.weight ?? 0;
}

export function isCoordinatorMultisigConfigured(
  account: LoadedAccount,
  walletAddress: string,
  coordinatorPubkey: string,
) {
  const coordinatorWeight = getAccountSignerWeight(account, coordinatorPubkey);
  const masterWeight = getAccountSignerWeight(account, walletAddress) || 1;
  const lowThreshold = account.thresholds?.low_threshold ?? 0;
  const medThreshold = account.thresholds?.med_threshold ?? 0;
  const highThreshold = account.thresholds?.high_threshold ?? 0;

  return {
    coordinatorWeight,
    masterWeight,
    lowThreshold,
    medThreshold,
    highThreshold,
    hasSigner: coordinatorWeight >= 20,
    hasThresholds: lowThreshold >= 1 && medThreshold >= 21 && highThreshold >= 21,
  };
}

export function planCoordinatorRevocation(
  account: LoadedAccount,
  walletAddress: string,
  coordinatorPubkey: string,
): CoordinatorRevocationPlan {
  const coordinatorWeight = getAccountSignerWeight(account, coordinatorPubkey);
  const masterWeight = getAccountSignerWeight(account, walletAddress) || 1;
  const lowThreshold = account.thresholds?.low_threshold ?? 0;
  const medThreshold = account.thresholds?.med_threshold ?? 0;
  const highThreshold = account.thresholds?.high_threshold ?? 0;

  const shouldRemoveCoordinatorSigner = coordinatorWeight > 0;
  const shouldResetThresholds =
    lowThreshold !== 1 || medThreshold !== 1 || highThreshold !== 1;
  const shouldBypassOnChain =
    !shouldRemoveCoordinatorSigner && !shouldResetThresholds;

  return {
    coordinatorWeight,
    masterWeight,
    lowThreshold,
    medThreshold,
    highThreshold,
    shouldRemoveCoordinatorSigner,
    shouldResetThresholds,
    shouldBypassOnChain,
    canAuthorizeThresholdResetAlone: highThreshold <= masterWeight,
  };
}

export async function waitForCoordinatorMultisig(
  horizon: Horizon.Server,
  walletAddress: string,
  coordinatorPubkey: string,
  attempts = 8,
  delayMs = 1200,
) {
  let lastError: Error | null = null;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const account = await horizon.loadAccount(walletAddress);
      const state = isCoordinatorMultisigConfigured(account, walletAddress, coordinatorPubkey);

      if (state.hasSigner && state.hasThresholds) {
        return {
          status: "configured" as const,
          account,
          state,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to refresh wallet state.");
    }

    if (index < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    status: lastError ? ("unknown" as const) : ("missing" as const),
    error: lastError,
  };
}
