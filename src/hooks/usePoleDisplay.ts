import { useEffect, useRef } from 'react';
import { EscPosBuilder } from '@/lib/escpos';

export function usePoleDisplay(enabled: boolean = true) {
  const bridgeUrlRef = useRef<string>('http://127.0.0.1:18181');

  useEffect(() => {
    if (typeof window !== "undefined") {
      bridgeUrlRef.current = localStorage.getItem("node_print_url") || 'http://127.0.0.1:18181';
    }
  }, [enabled]);

  const showAmount = async (amount: number, label: string = "Total") => {
    if (!enabled) return;

    try {
      const builder = new EscPosBuilder();
      builder
        .init()
        .text(`${label}:\n`)
        .text(`LKR ${amount.toFixed(2)}\n`);

      const rawBase64 = builder.toBase64();
      await fetch(`${bridgeUrlRef.current}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'escpos', printer: 'PoleDisplay', data: rawBase64 }),
      }).catch(() => null);
    } catch (error: any) {
      // silently ignore if bridge is offline
    }
  };

  const clearDisplay = async () => {
    if (!enabled) return;

    try {
      const builder = new EscPosBuilder();
      builder.init();
      const rawBase64 = builder.toBase64();
      await fetch(`${bridgeUrlRef.current}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'escpos', printer: 'PoleDisplay', data: rawBase64 }),
      }).catch(() => null);
    } catch (error: any) {
      // silently ignore
    }
  };

  return {
    showAmount,
    clearDisplay,
  };
}
