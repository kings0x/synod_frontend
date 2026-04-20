import { describe, expect, it } from "vitest";

import { planCoordinatorRevocation } from "./stellar-multisig";

type MockAccount = {
  signers: Array<{ key: string; weight: number }>;
  thresholds: {
    low_threshold: number;
    med_threshold: number;
    high_threshold: number;
  };
};

function makeAccount(account: MockAccount) {
  return account as never;
}

describe("planCoordinatorRevocation", () => {
  it("requires an on-chain revoke when Synod is still an active signer", () => {
    const walletAddress = "GWALLET";
    const coordinatorPubkey = "GCOORD";
    const plan = planCoordinatorRevocation(
      makeAccount({
        signers: [
          { key: walletAddress, weight: 1 },
          { key: coordinatorPubkey, weight: 20 },
        ],
        thresholds: {
          low_threshold: 1,
          med_threshold: 21,
          high_threshold: 21,
        },
      }),
      walletAddress,
      coordinatorPubkey,
    );

    expect(plan.shouldRemoveCoordinatorSigner).toBe(true);
    expect(plan.shouldResetThresholds).toBe(true);
    expect(plan.shouldBypassOnChain).toBe(false);
    expect(plan.canAuthorizeThresholdResetAlone).toBe(false);
  });

  it("uses an off-chain cleanup when the wallet is already back to single-sig", () => {
    const walletAddress = "GWALLET";
    const coordinatorPubkey = "GCOORD";
    const plan = planCoordinatorRevocation(
      makeAccount({
        signers: [{ key: walletAddress, weight: 1 }],
        thresholds: {
          low_threshold: 1,
          med_threshold: 1,
          high_threshold: 1,
        },
      }),
      walletAddress,
      coordinatorPubkey,
    );

    expect(plan.shouldRemoveCoordinatorSigner).toBe(false);
    expect(plan.shouldResetThresholds).toBe(false);
    expect(plan.shouldBypassOnChain).toBe(true);
    expect(plan.canAuthorizeThresholdResetAlone).toBe(true);
  });

  it("flags stuck threshold state when Synod is gone but the wallet still needs multisig", () => {
    const walletAddress = "GWALLET";
    const coordinatorPubkey = "GCOORD";
    const plan = planCoordinatorRevocation(
      makeAccount({
        signers: [{ key: walletAddress, weight: 1 }],
        thresholds: {
          low_threshold: 1,
          med_threshold: 21,
          high_threshold: 21,
        },
      }),
      walletAddress,
      coordinatorPubkey,
    );

    expect(plan.shouldRemoveCoordinatorSigner).toBe(false);
    expect(plan.shouldResetThresholds).toBe(true);
    expect(plan.shouldBypassOnChain).toBe(false);
    expect(plan.canAuthorizeThresholdResetAlone).toBe(false);
  });
});
