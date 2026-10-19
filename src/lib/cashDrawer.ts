import { NodePrintClient, NodePrintWebUSBClient } from "@asithakonara/node-print-client";
import { EscPosBuilder } from "@asithakonara/escpos";

export interface CashDrawerOptions {
  url?: string;
  printer?: string;
  route?: string;
  pin?: 2 | 5;
  silent?: boolean;
}

export interface CashDrawerResult {
  success: boolean;
  jobId?: string;
  method?: "bridge" | "webusb";
  message?: string;
}

/**
 * Resolves the bridge URL in order of priority:
 * 1. Explicit options.url
 * 2. NEXT_PUBLIC_NODE_PRINT_URL / NEXT_PUBLIC_BRIDGE_URL
 * 3. localStorage 'node_print_url'
 * 4. Default http://127.0.0.1:18181
 */
export function getBridgeUrl(overrideUrl?: string): string {
  if (overrideUrl) return overrideUrl;
  if (typeof process !== "undefined") {
    if (process.env.NEXT_PUBLIC_NODE_PRINT_URL) return process.env.NEXT_PUBLIC_NODE_PRINT_URL;
    if (process.env.NEXT_PUBLIC_BRIDGE_URL) return process.env.NEXT_PUBLIC_BRIDGE_URL;
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("node_print_url") || localStorage.getItem("bridge_url");
    if (saved) return saved;
  }
  return "http://127.0.0.1:18181";
}

/**
 * Triggers the cash drawer to open via the NodePrint bridge or WebUSB fallback.
 */
export async function openCashDrawer(options?: CashDrawerOptions): Promise<CashDrawerResult> {
  const pin = options?.pin ?? 2;
  const bridgeUrl = getBridgeUrl(options?.url);

  // 1. Try via NodePrint Bridge Service (Standard Architecture)
  try {
    const client = new NodePrintClient({ url: bridgeUrl });

    // Determine target printer or route
    let targetPrinter = options?.printer;
    let targetRoute = options?.route;

    // Check localStorage for saved printer if not provided
    if (!targetPrinter && !targetRoute && typeof window !== "undefined") {
      targetPrinter = localStorage.getItem("node_print_printer") || localStorage.getItem("pos_printer") || undefined;
      targetRoute = localStorage.getItem("node_print_route") || undefined;
    }

    // If still neither is provided, check bridge routes and printers
    if (!targetPrinter && !targetRoute) {
      try {
        const routes = await client.routes.list().catch(() => ({} as Record<string, string>));
        if (routes && (routes.cashDrawer || routes.pos || routes.receipt)) {
          targetRoute = routes.cashDrawer ? "cashDrawer" : routes.pos ? "pos" : "receipt";
        }
      } catch (e) {
        // continue to printer listing
      }
    }

    if (!targetPrinter && !targetRoute) {
      try {
        const printers = await client.printers.list().catch(() => []);
        if (Array.isArray(printers) && printers.length > 0) {
          const defaultPrinter = printers.find(p => p.isDefault) || printers.find(p => p.status === "online") || printers[0];
          targetPrinter = defaultPrinter?.name || defaultPrinter?.id;
        }
      } catch (e) {
        // continue
      }
    }

    // Default route fallback to 'pos' if nothing else resolved
    if (!targetPrinter && !targetRoute) {
      targetRoute = "pos";
    }

    // Trigger cash drawer on the bridge
    const openPayload: { printer?: string; route?: string; pin: 2 | 5 } = { pin };
    if (targetPrinter) openPayload.printer = targetPrinter;
    if (targetRoute) openPayload.route = targetRoute;

    const jobId = await client.cashDrawer.open(openPayload);
    console.log("[CashDrawer] Triggered via NodePrint bridge:", { targetPrinter, targetRoute, jobId });
    return { success: true, jobId, method: "bridge" };

  } catch (bridgeError: any) {
    console.warn("[CashDrawer] NodePrint bridge attempt failed or offline:", bridgeError?.message || bridgeError);

    // 2. Fallback to WebUSB if browser has a paired USB thermal printer
    if (typeof navigator !== "undefined" && "usb" in navigator) {
      try {
        const usbClient = new NodePrintWebUSBClient();
        const pairedDevices = await usbClient.getPairedDevices();
        if (pairedDevices && pairedDevices.length > 0) {
          await usbClient.connect(pairedDevices[0]);
          const builder = new EscPosBuilder();
          builder.init().cashDrawer(pin);
          
          const rawBuffer = builder.build();
          await usbClient.print(rawBuffer);
          await usbClient.disconnect();
          console.log("[CashDrawer] Triggered via WebUSB paired printer");
          return { success: true, method: "webusb" };
        }
      } catch (usbError: any) {
        console.warn("[CashDrawer] WebUSB fallback also failed:", usbError?.message || usbError);
      }
    }

    return {
      success: false,
      message: bridgeError?.message || "Bridge service offline at 127.0.0.1:18181 and no WebUSB printer available"
    };
  }
}
