/**
 * Native, bulletproof Cash Drawer Integration.
 * Zero external/proprietary dependencies.
 *
 * Support Channels:
 * 1. Native Next.js TCP Socket API (/api/printer/drawer) to port 9100 on LAN/Ethernet printer.
 * 2. Native Browser WebUSB / Web Serial direct raw byte transmission for USB printers.
 * 3. Generic Local Print Server / Bridge fallback (e.g. 127.0.0.1:18181) if present.
 */

export interface CashDrawerOptions {
  host?: string;
  ip?: string;
  port?: number;
  pin?: 2 | 5;
  bridgeUrl?: string;
  silent?: boolean;
}

export interface CashDrawerResult {
  success: boolean;
  channel?: "socket_api" | "webusb" | "webserial" | "bridge";
  message?: string;
}

/**
 * Resolves the configured printer IP or host from localStorage or environment.
 */
export function getPrinterLanIp(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("printer_lan_ip") || localStorage.getItem("pos_printer_ip");
    if (saved && saved.trim()) return saved.trim();
  }
  return "";
}

/**
 * Triggers the cash drawer connected to the receipt printer DK port.
 * Non-blocking, completely fail-safe: never interrupts POS checkout if printer is disconnected.
 */
export async function openCashDrawer(options?: CashDrawerOptions): Promise<CashDrawerResult> {
  const pin = options?.pin ?? 2;
  const targetIp = options?.host || options?.ip || getPrinterLanIp();

  // Channel 1: Native Next.js Socket API (Port 9100 direct LAN connection)
  try {
    const payload: { host?: string; pin: number } = { pin };
    if (targetIp) payload.host = targetIp;

    const res = await fetch("/api/printer/drawer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      console.log("[CashDrawer] Opened successfully via socket API:", data);
      return { success: true, channel: "socket_api", message: data.message };
    }
  } catch (socketErr) {
    // Socket API not reachable or offline; proceed to fallback channels
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

        // Standard ESC/POS drawer pulse bytes
        const pulsePin = pin === 5 ? 0x01 : 0x00;
        const drawerBytes = new Uint8Array([
          0x1b, 0x40,                         // ESC @ (Init)
          0x1b, 0x70, pulsePin, 0x32, 0xfa,   // ESC p pin 50 250
          0x10, 0x14, 0x01, pulsePin, 0x05    // DLE DC4 1 m t (Real-time pulse)
        ]);

        const endpoints = device.configuration.interfaces[0]?.alternate?.endpoints || [];
        const outEndpoint = endpoints.find((e: any) => e.direction === "out");
        const endpointNumber = outEndpoint ? outEndpoint.endpointNumber : 1;

        await device.transferOut(endpointNumber, drawerBytes);
        await device.close();
        console.log("[CashDrawer] Opened successfully via native WebUSB");
        return { success: true, channel: "webusb", message: "Cash drawer opened via WebUSB" };
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

    const res = await fetch(`${bridgeUrl}/cashdrawer/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeout);

    if (res && res.ok) {
      console.log("[CashDrawer] Opened successfully via local bridge fallback");
      return { success: true, channel: "bridge", message: "Cash drawer opened via bridge" };
    }
  } catch (_) {}

  // If all direct programmatic hardware channels were silent (e.g. printer managed by OS driver),
  // return a graceful message. The printer driver itself can also trigger drawer kick on print.
  return {
    success: false,
    message: "No active printer connection found on LAN or USB. If using Windows Driver, configure 'Open Cash Drawer' in Printer Properties."
  };
}
