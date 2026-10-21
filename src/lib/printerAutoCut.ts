/**
 * Native, bulletproof Thermal Printer Auto-Cut Utility.
 * Zero external/proprietary dependencies.
 *
 * Supports:
 * 1. Native Next.js TCP Socket API (/api/printer/cut) on port 9100 for LAN/Ethernet Xprinter XP-80T.
 * 2. Native Browser WebUSB direct raw command transmission for USB-connected receipt printers.
 * 3. Generic Local Print Server / Bridge fallback (127.0.0.1:18181) if present.
 */

export interface AutoCutOptions {
  feedLines?: number;
  host?: string;
  ip?: string;
  port?: number;
  mode?: "partial" | "full";
  bridgeUrl?: string;
}

export interface AutoCutResult {
  success: boolean;
  channel?: "socket_api" | "webusb" | "bridge";
  message?: string;
}

/**
 * Triggers paper feed and auto-cut on thermal receipt printers.
 * Non-blocking, completely fail-safe: never interrupts browser printing or throws unhandled errors.
 */
export async function triggerPrinterAutoCut(options?: AutoCutOptions): Promise<AutoCutResult> {
  const feedLines = Math.min(Math.max(options?.feedLines || 4, 1), 10);
  const targetIp = options?.host || options?.ip || (typeof window !== "undefined" ? localStorage.getItem("printer_lan_ip") : null) || "";

  // Channel 1: Native Next.js Socket API (Port 9100 direct connection)
  try {
    const payload: { host?: string; feedLines: number } = { feedLines };
    if (targetIp) payload.host = targetIp;

    const res = await fetch("/api/printer/cut", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.log("[AutoCut] Cut sent successfully via socket API:", data);
      return { success: true, channel: "socket_api", message: data.message };
    }
  } catch (socketErr) {
    // Socket API not reachable; proceed to fallbacks
  }

  // Channel 2: Native WebUSB (Chromium direct USB thermal printer)
  if (typeof navigator !== "undefined" && "usb" in navigator) {
    try {
      const usb = (navigator as any).usb;
      const devices = await usb.getDevices();
      if (devices && devices.length > 0) {
        const device = devices[0];
        await device.open();
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
        await device.claimInterface(0);

        // ESC/POS Commands: ESC @ (Init) + ESC d n (Feed) + GS V 66 0 (Partial Cut)
        const cutBytes = new Uint8Array([
          0x1b, 0x40,               // ESC @
          0x1b, 0x64, feedLines,    // ESC d n
          0x1d, 0x56, 0x42, 0x00    // GS V 66 0 (Partial Cut)
        ]);

        const endpoints = device.configuration.interfaces[0]?.alternate?.endpoints || [];
        const outEndpoint = endpoints.find((e: any) => e.direction === "out");
        const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;

        await device.transferOut(endpointNumber, cutBytes);
        await device.close();
        console.log("[AutoCut] Cut sent successfully via native WebUSB");
        return { success: true, channel: "webusb", message: "Cut triggered via WebUSB" };
      }
    } catch (usbErr) {
      // Continue to next fallback
    }
  }

  // Channel 3: Generic Local Bridge HTTP fallback if running on 127.0.0.1:18181
  try {
    const bridgeUrl = options?.bridgeUrl || (typeof window !== "undefined" ? localStorage.getItem("node_print_url") : null) || "http://127.0.0.1:18181";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    // ESC/POS Base64: ESC @ + ESC d 4 + GS V 66 0
    const rawBase64 = Buffer.from([0x1b, 0x40, 0x1b, 0x64, feedLines, 0x1d, 0x56, 0x42, 0x00]).toString("base64");

    const res = await fetch(`${bridgeUrl}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "escpos", data: rawBase64 }),
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeout);

    if (res && res.ok) {
      console.log("[AutoCut] Cut sent successfully via local bridge fallback");
      return { success: true, channel: "bridge", message: "Cut triggered via bridge" };
    }
  } catch (_) {}

  return {
    success: false,
    message: "No direct printer port reachable. If using Windows Driver, configure 'Cutter -> Partial Cut' in Printer Properties."
  };
}
