"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export type CartItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

export type SyncState = {
  cart: CartItem[];
  subtotal: number;
  discountAmount?: number;
  discountLabel?: string;
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
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("amaz_token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:3001";
    const s = io(baseUrl, {
      auth: { token }
    });
    setSocket(s);

    const room = "POS_DISPLAY_SYNC";
    s.emit("join", room);

    if (!isSender) {
      s.on("cart_updated", (data: any) => {
        setState(data);
      });
    }

    return () => {
      s.disconnect();
    };
  }, [isSender]);

  const updateState = useCallback(
    (newState: SyncState) => {
      setState(newState);
      if (isSender && socket) {
        socket.emit("sync_cart", { room: "POS_DISPLAY_SYNC", state: newState });
      }
    },
    [isSender, socket]
  );

  return { state, updateState };
}

/**
 * Hook used by TokenPane to push a prescription's medicines into the POSPane cart.
 * Also supports POSPane broadcasting status updates back to TokenPane.
 */
export type RxStatusUpdate = { rxId: string; status: "IN_PROGRESS" | "DISPENSED" | "PENDING" };

export type TokenPayload = {
  patientId?: string;
  isNewPatient?: boolean;
  gender?: string;
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
  date: string;
};

export type AppointmentPayload = {
  appointmentId: string;
  doctorName?: string;
  patientName?: string;
  tokenNumber: string;
  fee: number;
  isUpfront: boolean;
  invoice?: any;
  allAppointments?: any[];
};

let globalBc: BroadcastChannel | null = null;
function getGlobalBc(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!globalBc) {
    try {
      globalBc = new BroadcastChannel(RX_TO_POS_CHANNEL);
    } catch (e) {
      console.warn("BroadcastChannel not supported or failed to initialize:", e);
    }
  }
  return globalBc;
}

const dispatchRxPosMessage = (msg: any) => {
  if (typeof window !== "undefined") {
    // 1. Same-window synchronous event delivery
    window.dispatchEvent(new CustomEvent("frontdesk-rx-pos-event", { detail: msg }));
    // 2. Cross-window / multi-tab BroadcastChannel delivery
    try {
      getGlobalBc()?.postMessage(msg);
    } catch (e) {
      console.warn("Failed to post message to BroadcastChannel:", e);
    }
  }
};

export type RxMetaPayload = {
  doctorName?: string;
  patientName?: string;
  bookingReference?: string;
  consultationFee?: number;
};

export function useRxToPOS() {
  /** TokenPane → POSPane: send prescription items */
  const sendToPOS = useCallback(
    (
      items: CartItem[],
      rxId: string,
      doctor?: any,
      consultationPaid?: boolean,
      visitId?: string,
      patientId?: string,
      meta?: RxMetaPayload
    ) => {
      dispatchRxPosMessage({
        type: "RX_ITEMS",
        items,
        rxId,
        doctor,
        consultationPaid,
        visitId,
        patientId,
        meta,
      });
    },
    []
  );

  /** TokenPane → POSPane: send Token checkout data */
  const sendTokenToPOS = useCallback(
    (tokenData: TokenPayload) => {
      dispatchRxPosMessage({ type: "TOKEN_CHECKOUT", payload: tokenData });
    },
    []
  );

  /** PhoneBookingPane → POSPane: send existing appointment for checkout */
  const sendAppointmentToPOS = useCallback(
    (appointmentData: AppointmentPayload) => {
      dispatchRxPosMessage({ type: "APPOINTMENT_CHECKOUT", payload: appointmentData });
    },
    []
  );

  /** POSPane listens for incoming prescription or token */
  const onPrescriptionReceived = useCallback(
    (
      rxHandler: (
        items: CartItem[],
        rxId: string,
        doctor?: any,
        consultationPaid?: boolean,
        visitId?: string,
        patientId?: string,
        meta?: RxMetaPayload
      ) => void,
      tokenHandler?: (payload: TokenPayload) => void
    ) => {
      if (typeof window === "undefined") return () => {};

      const handleMsg = (data: any) => {
        if (!data) return;
        if (data.type === "RX_ITEMS") {
          rxHandler(
            data.items as CartItem[],
            data.rxId as string,
            data.doctor,
            data.consultationPaid,
            data.visitId,
            data.patientId,
            data.meta
          );
        } else if (data.type === "TOKEN_CHECKOUT" && tokenHandler) {
          tokenHandler(data.payload);
        } else if (data.type === "APPOINTMENT_CHECKOUT" && tokenHandler) {
          tokenHandler({ ...data.payload, isAppointmentCheckout: true });
        }
      };

      const handleCustom = (e: any) => handleMsg(e.detail);
      const handleBc = (e: MessageEvent) => handleMsg(e.data);

      window.addEventListener("frontdesk-rx-pos-event", handleCustom);
      const bc = getGlobalBc();
      bc?.addEventListener("message", handleBc);

      return () => {
        window.removeEventListener("frontdesk-rx-pos-event", handleCustom);
        bc?.removeEventListener("message", handleBc);
      };
    },
    []
  );

  /** POSPane → TokenPane: broadcast a status update */
  const notifyRxStatus = useCallback(
    (rxId: string, status: RxStatusUpdate["status"]) => {
      dispatchRxPosMessage({ type: "RX_STATUS", rxId, status });
    },
    []
  );

  /** TokenPane listens for status updates from POSPane */
  const onRxStatusUpdate = useCallback(
    (handler: (update: RxStatusUpdate) => void) => {
      if (typeof window === "undefined") return () => {};

      const handleMsg = (data: any) => {
        if (data?.type === "RX_STATUS") {
          handler({ rxId: data.rxId, status: data.status });
        }
      };

      const handleCustom = (e: any) => handleMsg(e.detail);
      const handleBc = (e: MessageEvent) => handleMsg(e.data);

      window.addEventListener("frontdesk-rx-pos-event", handleCustom);
      const bc = getGlobalBc();
      bc?.addEventListener("message", handleBc);

      return () => {
        window.removeEventListener("frontdesk-rx-pos-event", handleCustom);
        bc?.removeEventListener("message", handleBc);
      };
    },
    []
  );

  return { sendToPOS, sendTokenToPOS, sendAppointmentToPOS, onPrescriptionReceived, notifyRxStatus, onRxStatusUpdate };
}


