import { NodePrintClient, NodePrintWebUSBClient } from "@asithakonara/node-print-client";
import { EscPosBuilder } from "@asithakonara/escpos";
import { getBridgeUrl } from "./cashDrawer";

export interface AutoCutOptions {
  feedLines?: number;
  printer?: string;
  route?: string;
  ip?: string;
  port?: number;
}

export interface AutoCutResult {
  success: boolean;
  method?: "bridge" | "lan" | "webusb";
  message?: string;
}

/**
 * Triggers paper auto-cut for Xprinter XP-80T or any ESC/POS thermal printer.
 *
 * Execution Pipeline:
 * 1. NodePrint Local Bridge (USB / CUPS / Spooler) using standard EscPosBuilder.feed().cut()
 * 2. Next.js /api/printer/cut (Node.js default 'net' TCP socket for LAN/Network XP-80T printers on port 9100)
 * 3. WebUSB client (if paired directly via browser)
 */
export async function triggerPrinterAutoCut(options?: AutoCutOptions): Promise<AutoCutResult> {
  const feedLines = options?.feedLines ?? 3;
  const bridgeUrl = getBridgeUrl();

  // 1. Try NodePrint Bridge (USB/Local thermal printer)
  try {
    const client = new NodePrintClient({ url: bridgeUrl });

    let targetPrinter = options?.printer;
    let targetRoute = options?.route;

    if (!targetPrinter && !targetRoute && typeof window !== "undefined") {
      targetPrinter = localStorage.getItem("node_print_printer") || localStorage.getItem("pos_printer") || undefined;
      targetRoute = localStorage.getItem("node_print_route") || undefined;
    }

    if (!targetPrinter && !targetRoute) {
      try {
        const routes = await client.routes.list().catch(() => ({} as Record<string, string>));
        if (routes && (routes.receipt || routes.pos || routes.cashDrawer)) {
          targetRoute = routes.receipt ? "receipt" : routes.pos ? "pos" : "cashDrawer";
        }
      } catch (e) {
        // ignore
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
        // ignore
      }
    }

    if (!targetPrinter && !targetRoute) {
      targetRoute = "receipt";
    }

    // Build ESC/POS cut sequence: feedLines blank feed + GS V 66 0 (partial cut)
    const builder = new EscPosBuilder();
    builder.init().feed(feedLines).cut();
    const cutData = Buffer.from(builder.build()).toString("base64");

    const printPayload: any = {
      type: "escpos",
      data: cutData
    };
    if (targetPrinter) printPayload.printer = targetPrinter;
    if (targetRoute) printPayload.route = targetRoute;

    await client.print(printPayload);
    console.log("[AutoCut] Triggered via NodePrint bridge to", targetPrinter || targetRoute);
    return { success: true, method: "bridge" };

  } catch (bridgeError: any) {
    console.warn("[AutoCut] Bridge attempt skipped/offline:", bridgeError?.message || bridgeError);

    // 2. Try Node.js default 'net' TCP socket API (for LAN / Ethernet Xprinter XP-80T)
    try {
      const savedIp = typeof window !== "undefined" ? localStorage.getItem("printer_lan_ip") || undefined : undefined;
      const lanIp = options?.ip || savedIp;

      if (lanIp || typeof window !== "undefined") {
        const res = await fetch("/api/printer/cut", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: lanIp,
            port: options?.port || 9100,
            feedLines
          })
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          console.log("[AutoCut] Triggered via LAN printer socket:", data.message);
          return { success: true, method: "lan", message: data.message };
        }
      }
    } catch (lanError: any) {
      console.warn("[AutoCut] LAN cut route error:", lanError?.message || lanError);
    }

    // 3. Fallback to WebUSB if paired
    if (typeof navigator !== "undefined" && "usb" in navigator) {
      try {
        const usbClient = new NodePrintWebUSBClient();
        const paired = await usbClient.getPairedDevices();
        if (paired && paired.length > 0) {
          await usbClient.connect(paired[0]);
          const builder = new EscPosBuilder();
          builder.init().feed(feedLines).cut();
          await usbClient.print(builder.build());
          await usbClient.disconnect();
          console.log("[AutoCut] Triggered via WebUSB");
          return { success: true, method: "webusb" };
        }
      } catch (usbErr: any) {
        console.warn("[AutoCut] WebUSB cut error:", usbErr?.message || usbErr);
      }
    }

    return {
      success: false,
      message: "No available printer channel (Bridge offline, no LAN IP, no WebUSB)"
    };
  }
}
