import { stripe } from "./index";

/**
 * Create a Stripe Connect Express account for a seller.
 * Returns the account ID to store on the user record.
 */
export async function createConnectAccount(email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  return account.id;
}

/**
 * Generate an onboarding link for a Connect account.
 * Redirect the seller here to complete their Stripe setup.
 */
export async function createOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return link.url;
}

/**
 * Check if a Connect account has completed onboarding.
 */
export async function isAccountReady(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return account.charges_enabled && account.payouts_enabled;
}

/**
 * Create a transfer to a connected account (seller payout).
 * Call this after a store purchase is completed.
 */
export async function createTransfer(
  amount: number,
  currency: string,
  destinationAccountId: string,
  metadata?: Record<string, string>
) {
  const transfer = await stripe.transfers.create({
    amount,
    currency,
    destination: destinationAccountId,
    metadata,
  });

  return transfer;
}

/**
 * Create a login link so sellers can access their Stripe Express dashboard.
 */
export async function createDashboardLink(accountId: string) {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
