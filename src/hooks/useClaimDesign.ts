"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function useClaimDesign() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const claimed = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !userId || claimed.current) return;

    const claimToken = localStorage.getItem("claimToken");
    if (!claimToken) return;

    claimed.current = true;

    fetch("/api/decorated-products/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimToken }),
    })
      .then(() => {
        // Remove token regardless — expired/already-claimed tokens are useless
        localStorage.removeItem("claimToken");
      })
      .catch(() => {
        localStorage.removeItem("claimToken");
      });
  }, [status, userId]);
}
