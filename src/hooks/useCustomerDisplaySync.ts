import { useState, useEffect, useMemo } from "react";
import {
  CUSTOMER_DISPLAY_CHANNEL,
  CustomerDisplayState,
} from "@/services/hardware.service";
import type { SyncState } from "@/app/frontdesk/hooks/useCartSync";

export function useCustomerDisplaySync(socketState: SyncState) {
  const [broadcastState, setBroadcastState] = useState<CustomerDisplayState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data && typeof event.data === "object") {
        setBroadcastState(event.data as CustomerDisplayState);
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const mergedState = useMemo<SyncState>(() => {
    if (!broadcastState) return socketState;

    // Preserve socket QR/Bank overlay when active, otherwise enhance with BroadcastChannel state
    const hasLocalItems = Array.isArray(broadcastState.items) && broadcastState.items.length > 0;
    const preferLocalCart =
      broadcastState.status === "SCANNING" ||
      broadcastState.status === "PAYMENT" ||
      (broadcastState.status === "COMPLETED" && hasLocalItems) ||
      (broadcastState.status === "IDLE" && socketState.cart.length === 0);

    const checkoutStatus =
      socketState.checkout?.status === "PAYING"
        ? socketState.checkout
        : broadcastState.status === "PAYMENT" &&
          (broadcastState.paymentMethod === "QR" || broadcastState.paymentMethod === "BANK")
        ? { method: broadcastState.paymentMethod, status: "PAYING" as const }
        : socketState.checkout;

    return {
      cart:
        preferLocalCart && broadcastState.items
          ? broadcastState.items.map((item, idx) => ({
              id: item.id || `bc-${idx}`,
              name: item.name,
              qty: item.qty,
              price: item.price,
            }))
          : socketState.cart,
      subtotal: preferLocalCart ? broadcastState.subtotalLkr : socketState.subtotal,
      discountAmount: preferLocalCart ? broadcastState.discountLkr : socketState.discountAmount,
      discountLabel: broadcastState.discountLabel ?? socketState.discountLabel,
      total: preferLocalCart ? broadcastState.totalLkr : socketState.total,
      checkout: checkoutStatus,
    };
  }, [broadcastState, socketState]);

  return { state: mergedState, broadcastState };
}

