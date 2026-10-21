/**
 * Native ESC/POS Command Builder for Thermal Printers (Xprinter XP-80T, Epson, Star).
 * Zero external dependencies - pure Node.js / Browser compatible Uint8Array/Buffer implementation.
 */

export class EscPosBuilder {
  private chunks: Uint8Array[] = [];

  constructor() {
    this.init();
  }

  /**
   * Initializes printer (clears print buffer, resets modes to default).
   * ESC @ (0x1B 0x40)
   */
  public init(): this {
    this.chunks.push(new Uint8Array([0x1b, 0x40]));
    return this;
  }

  /**
   * Sets text alignment: 'left', 'center', or 'right'.
   * ESC a n (0x1B 0x61 n)
   */
  public align(alignment: "left" | "center" | "right"): this {
    const val = alignment === "center" ? 1 : alignment === "right" ? 2 : 0;
    this.chunks.push(new Uint8Array([0x1b, 0x61, val]));
    return this;
  }

  /**
   * Toggles bold text.
   * ESC E n (0x1B 0x45 n)
   */
  public bold(enable: boolean = true): this {
    this.chunks.push(new Uint8Array([0x1b, 0x45, enable ? 1 : 0]));
    return this;
  }

  /**
   * Sets text width and height scaling (1 or 2).
   * GS ! n (0x1D 0x21 n)
   */
  public size(width: 1 | 2 = 1, height: 1 | 2 = 1): this {
    const w = Math.max(1, Math.min(2, width)) - 1;
    const h = Math.max(1, Math.min(2, height)) - 1;
    const n = (w << 4) | h;
    this.chunks.push(new Uint8Array([0x1d, 0x21, n]));
    return this;
  }

  /**
   * Appends raw text (ASCII / UTF-8 safe).
   */
  public text(str: string): this {
    if (typeof window !== "undefined" && typeof TextEncoder !== "undefined") {
      this.chunks.push(new TextEncoder().encode(str));
    } else {
      this.chunks.push(Buffer.from(str, "utf8"));
    }
    return this;
  }

  /**
   * Appends text followed by a newline.
   */
  public textLine(str: string = ""): this {
    return this.text(str + "\n");
  }

  /**
   * Feeds n paper lines.
   * ESC d n (0x1B 0x64 n)
   */
  public feed(lines: number = 1): this {
    const n = Math.max(1, Math.min(255, lines));
    this.chunks.push(new Uint8Array([0x1b, 0x64, n]));
    return this;
  }

  /**
   * Triggers the paper cutter (partial or full cut).
   * GS V m n (0x1D 0x56 66 0 for partial cut; 65 0 for full cut)
   */
  public cut(mode: "partial" | "full" = "partial"): this {
    const m = mode === "full" ? 65 : 66;
    this.chunks.push(new Uint8Array([0x1d, 0x56, m, 0x00]));
    return this;
  }

  /**
   * Generates pulse to open connected cash drawer.
   * Standard ESC p m t1 t2 + Real-time DLE DC4 pulse.
   */
  public cashDrawer(pin: 2 | 5 = 2): this {
    const m = pin === 5 ? 1 : 0;
    // Standard pulse: ESC p m t1 t2 (m: pin, t1: 50 * 2ms = 100ms on, t2: 250 * 2ms = 500ms off)
    this.chunks.push(new Uint8Array([0x1b, 0x70, m, 50, 250]));
    // Real-time pulse fallback (DLE DC4 1 m t): kicks drawer immediately
    this.chunks.push(new Uint8Array([0x10, 0x14, 0x01, m, 0x05]));
    return this;
  }

  /**
   * Compiles all commands into a single Node.js Buffer (or Uint8Array in browser).
   */
  public build(): Buffer {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.length;
    }
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return Buffer.from(combined.buffer);
  }

  /**
   * Returns base64 encoded payload.
   */
  public toBase64(): string {
    return this.build().toString("base64");
  }

  /**
   * Returns raw Uint8Array.
   */
  public toUint8Array(): Uint8Array {
    let totalLength = 0;
    for (const chunk of this.chunks) {
      totalLength += chunk.length;
    }
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }
}
