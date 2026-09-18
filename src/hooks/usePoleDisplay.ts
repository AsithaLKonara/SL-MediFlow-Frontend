import { useEffect, useRef } from 'react';
import { NodePrintClient } from '@asithakonara/node-print-client';
import { EscPosBuilder } from '@asithakonara/escpos';

export function usePoleDisplay(enabled: boolean = true) {
  const clientRef = useRef<NodePrintClient | null>(null);

  useEffect(() => {
    if (enabled && !clientRef.current) {
      // Connect to the local bridge service
      clientRef.current = new NodePrintClient({
        url: 'http://127.0.0.1:18181', // Default bridge port
      });
    }

    return () => {
      // Clean up if needed
    };
  }, [enabled]);

  const showAmount = async (amount: number, label: string = "Total") => {
    if (!clientRef.current || !enabled) return;

    try {
      // Typically pole displays are connected via a COM port, we treat it as a printer.
      // ESC/POS commands can clear the screen and write text.
      // E.g., ESC @ (init), text
      const builder = new EscPosBuilder();
      
      builder
        .init() // Clear/Init
        .text(`${label}:\n`)
        .text(`LKR ${amount.toFixed(2)}\n`);

      // You would configure the bridge with a specific printer name for the pole display
      await clientRef.current.print({ type: 'escpos', printer: 'PoleDisplay', data: Buffer.from(builder.build()).toString('base64') });
    } catch (error) {
      console.error("Pole display error:", error);
    }
  };

  const clearDisplay = async () => {
    if (!clientRef.current || !enabled) return;

    try {
      const builder = new EscPosBuilder();
      builder.init();
      await clientRef.current.print({ type: 'escpos', printer: 'PoleDisplay', data: Buffer.from(builder.build()).toString('base64') });
    } catch (error) {
      console.error("Pole display clear error:", error);
    }
  };

  return { showAmount, clearDisplay };
}
