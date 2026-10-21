import { NextRequest, NextResponse } from "next/server";
import net from "net";

/**
 * Native Node.js Cash Drawer Trigger API.
 * Connects directly via TCP socket to raw printer port 9100 on LAN/Ethernet thermal printers.
 * Emits standard ESC/POS drawer kick sequences (Pin 2 + Pin 5 + Real-time pulse).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const host = body.host || body.ip || process.env.PRINTER_LAN_IP || "127.0.0.1";
    const port = Number(body.port) || 9100;
    const timeoutMs = Number(body.timeout) || 3000;
    const pin = body.pin === 5 ? 5 : 2;

    // Standard ESC/POS Cash Drawer sequence:
    // 1. ESC @ (0x1B, 0x40) - Initialize
    // 2. ESC p 0 50 250 (0x1B, 0x70, 0x00, 0x32, 0xFA) - Pin 2 kick
    // 3. ESC p 1 50 250 (0x1B, 0x70, 0x01, 0x32, 0xFA) - Pin 5 kick
    // 4. DLE DC4 1 0 5  (0x10, 0x14, 0x01, 0x00, 0x05) - Real-time pulse
    const pulsePin = pin === 5 ? 0x01 : 0x00;
    const drawerCommand = Buffer.from([
      0x1b, 0x40,                         // ESC @ (Init)
      0x1b, 0x70, pulsePin, 0x32, 0xfa,   // ESC p pin 50 250 (Standard pulse)
      0x1b, 0x70, 0x00, 0x32, 0xfa,       // Also pulse pin 2 for maximum hardware compatibility
      0x10, 0x14, 0x01, pulsePin, 0x05    // DLE DC4 1 m t (Real-time pulse)
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

      socket.on("connect", () => {
        socket.write(drawerCommand, (err) => {
          if (err) {
            finish(false, "Failed to write drawer command: " + err.message);
          } else {
            // Allow bytes to transmit
            setTimeout(() => {
              finish(true, `Cash drawer kick sent to ${host}:${port}`);
            }, 100);
          }
        });
      });

      socket.on("timeout", () => {
        finish(false, `Connection timed out connecting to printer at ${host}:${port}`);
      });

      socket.on("error", (err) => {
        finish(false, `Socket error connecting to printer at ${host}:${port}: ${err.message}`);
      });

      try {
        socket.connect(port, host);
      } catch (err: any) {
        finish(false, "Connect failed: " + (err?.message || "unknown"));
      }
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
