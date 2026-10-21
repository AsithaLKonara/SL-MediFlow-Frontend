import { NextResponse } from "next/server";
import net from "net";

/**
 * Direct LAN/Network Thermal Printer Auto-Cut using Node.js default 'net' module.
 * Communicates with Xprinter XP-80T or any standard ESC/POS printer on TCP port 9100.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const host = body.host || body.ip || process.env.PRINTER_LAN_IP || process.env.NEXT_PUBLIC_PRINTER_IP || "127.0.0.1";
    const port = Number(body.port) || 9100;
    const feedLines = Math.min(Math.max(Number(body.feedLines) || 4, 1), 10);
    const timeoutMs = Number(body.timeout) || 3000;

    // ESC/POS Commands:
    // ESC @: Initialize printer (0x1b, 0x40)
    // ESC d <feedLines>: Feed paper (0x1b, 0x64, n)
    // GS V 66 0: Partial cut (0x1d, 0x56, 0x42, 0x00)
    // Also include standard ESC m (0x1b, 0x6d) for legacy ESC/POS cut
    const cutBuffer = Buffer.from([
      0x1b, 0x40,               // Initialize printer (ESC @)
      0x1b, 0x64, feedLines,    // Feed n lines (ESC d n)
      0x1d, 0x56, 0x42, 0x00    // Partial cut (GS V 66 0)
    ]);

    const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
      const socket = new net.Socket();
      let finished = false;

      const finish = (success: boolean, message: string) => {
        if (finished) return;
        finished = true;
        try { socket.destroy(); } catch (_) {}
        resolve({ success, message });
      };

      socket.setTimeout(timeoutMs);

      socket.connect(port, host, () => {
        socket.write(cutBuffer, (err) => {
          if (err) {
            finish(false, "Write cut command failed: " + err.message);
          } else {
            setTimeout(() => {
              finish(true, `Auto-cut signal sent to printer at ${host}:${port}`);
            }, 100);
          }
        });
      });

      socket.on("timeout", () => {
        finish(false, `Connection timed out to ${host}:${port}`);
      });

      socket.on("error", (err) => {
        finish(false, `LAN printer socket error: ${err.message}`);
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to trigger LAN printer cut" },
      { status: 500 }
    );
  }
}
