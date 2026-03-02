"use client";

import { loadStripe } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
}

export const getStripe = () => {
  return loadStripe(publishableKey || "");
};
