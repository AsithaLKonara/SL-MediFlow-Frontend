"use client";

import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type SyncState = {
  cart: CartItem[];
  subtotal: number;
  total: number;
  tokenCalled?: { number: string; doctor: string };
  checkout?: {
    method: "CASH" | "CARD" | "BANK" | "QR" | null;
    status: "PAYING" | "IDLE";
  };
};

const CHANNEL_NAME = "AMAZ_FRONTDESK_SYNC";

export function useCartSync(isSender = false) {
  const [state, setState] = useState<SyncState>({ cart: [], subtotal: 0, total: 0, checkout: { method: null, status: "IDLE" } });
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    // Only works in browser
    if (typeof window === "undefined") return;

    const bc = new BroadcastChannel(CHANNEL_NAME);
    setChannel(bc);

    if (!isSender) {
      bc.onmessage = (event) => {
        setState(event.data);
      };
    }

    return () => {
      bc.close();
    };
  }, [isSender]);

  const updateState = useCallback(
    (newState: SyncState) => {
      setState(newState);
      if (isSender && channel) {
        channel.postMessage(newState);
      }
    },
    [isSender, channel]
  );

  return { state, updateState };
}
