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
const RX_TO_POS_CHANNEL = "AMAZ_RX_TO_POS";

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

/**
 * Hook used by TokenPane to push a prescription's medicines into the POSPane cart.
 * Also supports POSPane broadcasting status updates back to TokenPane.
 */
export type RxStatusUpdate = { rxId: string; status: "IN_PROGRESS" | "DISPENSED" | "PENDING" };

export type TokenPayload = {
  patientName: string;
  patientPhone: string;
  ageFallback?: number;
  doctorId: string | null;
  doctorName?: string;
  doctorFee?: number;
  doctorTokenNumber?: number;
  isUpfront?: boolean;
  tests: { id: string; name: string; price: number }[];
  testIds: string[];
  customLabPrices: Record<string, number>;
  labTokenNumber?: number;
  services: { id: string; name: string; price: number }[];
  serviceIds: string[];
  customServicePrices: Record<string, number>;
  serviceTokenNumber?: number;
  expectedTotal: number;
};

export type AppointmentPayload = {
  appointmentId: string;
  doctorName?: string;
  patientName?: string;
  tokenNumber: string;
  fee: number;
  isUpfront: boolean;
};

export function useRxToPOS() {
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bc = new BroadcastChannel(RX_TO_POS_CHANNEL);
    setChannel(bc);
    return () => bc.close();
  }, []);

  /** TokenPane → POSPane: send prescription items */
  const sendToPOS = useCallback(
    (items: CartItem[], rxId: string) => {
      channel?.postMessage({ type: "RX_ITEMS", items, rxId });
    },
    [channel]
  );

  /** TokenPane → POSPane: send Token checkout data */
  const sendTokenToPOS = useCallback(
    (tokenData: TokenPayload) => {
      channel?.postMessage({ type: "TOKEN_CHECKOUT", payload: tokenData });
    },
    [channel]
  );

  /** PhoneBookingPane → POSPane: send existing appointment for checkout */
  const sendAppointmentToPOS = useCallback(
    (appointmentData: AppointmentPayload) => {
      channel?.postMessage({ type: "APPOINTMENT_CHECKOUT", payload: appointmentData });
    },
    [channel]
  );

  /** POSPane listens for incoming prescription or token */
  const onPrescriptionReceived = useCallback(
    (
      rxHandler: (items: CartItem[], rxId: string) => void,
      tokenHandler?: (payload: TokenPayload) => void
    ) => {
      if (!channel) return;
      channel.onmessage = (e) => {
        if (e.data?.type === "RX_ITEMS") {
          rxHandler(e.data.items as CartItem[], e.data.rxId as string);
        } else if (e.data?.type === "TOKEN_CHECKOUT" && tokenHandler) {
          tokenHandler(e.data.payload);
        } else if (e.data?.type === "APPOINTMENT_CHECKOUT" && tokenHandler) {
          tokenHandler({ ...e.data.payload, isAppointmentCheckout: true });
        } else if (e.data?.type === "RX_STATUS") {
          // Ignore status messages on the POSPane side
        }
      };
    },
    [channel]
  );

  /** POSPane → TokenPane: broadcast a status update */
  const notifyRxStatus = useCallback(
    (rxId: string, status: RxStatusUpdate["status"]) => {
      channel?.postMessage({ type: "RX_STATUS", rxId, status });
    },
    [channel]
  );

  /** TokenPane listens for status updates from POSPane */
  const onRxStatusUpdate = useCallback(
    (handler: (update: RxStatusUpdate) => void) => {
      if (!channel) return;
      channel.onmessage = (e) => {
        if (e.data?.type === "RX_STATUS") {
          handler({ rxId: e.data.rxId, status: e.data.status });
        }
      };
    },
    [channel]
  );

  return { sendToPOS, sendTokenToPOS, sendAppointmentToPOS, onPrescriptionReceived, notifyRxStatus, onRxStatusUpdate };
}


