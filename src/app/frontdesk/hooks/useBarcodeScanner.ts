import { useEffect, useRef } from "react";

export function useBarcodeScanner(onScan: (barcode: string) => void, isActive: boolean = true) {
  const buffer = useRef("");
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      
      if (timeDiff > 50) {
        // Human typing is slower than 50ms per keystroke usually.
        buffer.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        if (buffer.current.length > 3) {
          // It's a scan!
          onScan(buffer.current);
          buffer.current = "";
          
          if (timeDiff <= 50) {
             e.preventDefault();
             e.stopPropagation();
          }
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onScan, isActive]);
}
