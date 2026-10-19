import { NextResponse } from "next/server";
import net from "net";

/**
 * Direct LAN/Network Thermal Printer Auto-Cut using Node.js default 'net' module.
 * Communicates with Xprinter XP-80T or any ESC/POS printer on TCP port 9100.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = body.ip || process.env.PRINTER_IP || process.env.NEXT_PUBLIC_PRINTER_IP || process.env.NEXT_PUBLIC_POS_IP;
    const port = Number(body.port) || 9100;
    const feedLines = Math.min(Math.max(Number(body.feedLines) || 3, 1), 10);

    if (!ip) {
      return NextResponse.json({
        success: false,
        skipped: true,
        message: "No LAN printer IP configured. Use bridge or provide printer IP."
      });
    }

    // ESC/POS Commands:
    // ESC d <feedLines>: Feed paper (0x1b, 0x64, n)
    // GS V 66 0: Partial cut with feed (0x1d, 0x56, 0x42, 0x00)
    const cutBuffer = Buffer.from([
      0x1b, 0x40,               // Initialize printer (ESC @)
      0x1b, 0x64, feedLines,    // Feed n lines (ESC d n)
      0x1d, 0x56, 0x42, 0x00    // Partial cut (GS V 66 0)
    ]);

    const result = await new Promise<{ success: boolean; message: string }>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.connect(port, ip, () => {
        socket.write(cutBuffer, () => {
          socket.end();
          resolve({ success: true, message: `Auto-cut signal sent to LAN printer at ${ip}:${port}` });
        });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ success: false, message: `Connection timed out to ${ip}:${port}` });
      });

      socket.on("error", (err) => {
        socket.destroy();
        resolve({ success: false, message: `LAN printer error: ${err.message}` });
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
