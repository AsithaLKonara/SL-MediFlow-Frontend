/**
 * SL MediFlow Universal POS Pole Display & Customer Display Engine
 * Supports single-line 8-digit LED/VFD Price Displays (ESC Q A),
 * 2x20 VFD/LCD Character Pole Displays, and Dual-Screen Graphic Monitors.
 * Transports: Local node-print Bridge (with WebSerial fallback) & Direct WebSerial (Chrome/Edge).
 */

export type PoleDisplayProtocol = 'PRICE_DISPLAY' | 'CD5220' | 'ESCPOS' | 'UTC' | 'AEDEX';
export type PoleDisplayTransport = 'BRIDGE' | 'WEBSERIAL';
export type PoleDisplayMode = 'VFD_2X20' | 'DUAL_SCREEN' | 'BOTH' | 'DISABLED';
export type PriceDisplayIndicator = 'NONE' | 'PRICE' | 'TOTAL' | 'COLLECT' | 'CHANGE';

export interface PoleDisplayCustomerItem {
  id?: string;
  name: string;
  qty: number;
  price: number;
}

export interface CustomerDisplayState {
  storeName: string;
  cashier: string;
  lastScannedItem?: {
    name: string;
    qty: number;
    priceLkr: number;
  };
  items?: PoleDisplayCustomerItem[];
  itemCount: number;
  subtotalLkr: number;
  discountLkr: number;
  discountLabel?: string;
  totalLkr: number;
  amountPaidLkr?: number;
  changeDueLkr?: number;
  paymentMethod?: 'CASH' | 'CARD' | 'BANK' | 'QR' | null;
  lankaQrCode?: string;
  status: 'IDLE' | 'SCANNING' | 'PAYMENT' | 'COMPLETED';
  updatedAt?: number;
}

export interface PoleDisplayConfig {
  enabled: boolean;
  mode: PoleDisplayMode;
  transport: PoleDisplayTransport;
  port: string;
  baudRate: number;
  protocol: PoleDisplayProtocol;
  storeName: string;
  welcomeMessage: string;
  changeDisplayTimeoutSeconds: number;
}

export const DEFAULT_POLE_DISPLAY_CONFIG: PoleDisplayConfig = {
  enabled: true,
  mode: 'BOTH',
  transport: 'BRIDGE',
  port: 'COM3',
  baudRate: 9600,
  protocol: 'CD5220',
  storeName: 'SL MediFlow',
  welcomeMessage: 'WELCOME! THANK YOU',
  changeDisplayTimeoutSeconds: 7,
};

export const POLE_DISPLAY_STORAGE_KEY = 'slmediflow_pole_display_config';
export const BRIDGE_URL_STORAGE_KEY = 'node_print_url';
export const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:18181';

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : '';
}

function cleanAscii(text: string): string {
  return (text || '').replace(/[^\x20-\x7E]/g, '').trim();
}

interface WebSerialPortLike {
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    flowControl?: 'none' | 'hardware';
  }): Promise<void>;
  close(): Promise<void>;
  writable: {
    getWriter(): WritableStreamDefaultWriter<Uint8Array>;
  };
}

interface NavigatorSerialLike {
  serial?: {
    requestPort(): Promise<WebSerialPortLike>;
  };
}

export class PoleDisplayService {
  private config: PoleDisplayConfig = { ...DEFAULT_POLE_DISPLAY_CONFIG };
  private serialPort: WebSerialPortLike | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private isConnected = false;
  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private bridgeUrlOverride: string | null = null;

  constructor() {
    this.loadConfig();
  }

  setBridgeUrl(url: string) {
    const trimmed = url.trim().replace(/\/+$/, '');
    this.bridgeUrlOverride = trimmed || null;
  }

  getResolvedBridgeUrl(explicitUrl?: string): string {
    if (explicitUrl) return explicitUrl.trim().replace(/\/+$/, '');
    if (this.bridgeUrlOverride) return this.bridgeUrlOverride;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(BRIDGE_URL_STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    }
    return DEFAULT_BRIDGE_URL;
  }

  loadConfig(): PoleDisplayConfig {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(POLE_DISPLAY_STORAGE_KEY);
        if (stored) {
          this.config = { ...DEFAULT_POLE_DISPLAY_CONFIG, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('Failed to parse stored pole display config:', e);
      }
    }
    return { ...this.config };
  }

  hasLocalConfig(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(POLE_DISPLAY_STORAGE_KEY) !== null;
  }

  saveConfig(newConfig: Partial<PoleDisplayConfig>): PoleDisplayConfig {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(POLE_DISPLAY_STORAGE_KEY, JSON.stringify(this.config));
      } catch (e) {
        console.warn('Failed to save pole display config to localStorage:', e);
      }
    }
    return { ...this.config };
  }

  /**
   * Hydrates config from hospital-wide SystemSetting records unless already customized locally
   * (or when force = true).
   */
  applySystemDefaults(
    settings: Record<string, string | undefined>,
    options: { force?: boolean } = {}
  ): PoleDisplayConfig {
    if (typeof window !== 'undefined') {
      const hasBridge = Boolean(localStorage.getItem(BRIDGE_URL_STORAGE_KEY));
      if (settings.hardware_bridge_url && (options.force || !hasBridge)) {
        localStorage.setItem(BRIDGE_URL_STORAGE_KEY, settings.hardware_bridge_url);
        this.setBridgeUrl(settings.hardware_bridge_url);
      }

      if (settings.pole_display_config && (options.force || !this.hasLocalConfig())) {
        try {
          const parsed = JSON.parse(settings.pole_display_config);
          return this.saveConfig(parsed);
        } catch (e) {
          console.warn('Failed to parse system default pole_display_config:', e);
        }
      }
    }
    return this.getConfig();
  }

  getConfig(): PoleDisplayConfig {
    return { ...this.config };
  }

  isWebSerialSupported(): boolean {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  isWebSerialConnected(): boolean {
    return this.isConnected && this.writer !== null;
  }

  /**
   * Connects to a physical or USB-to-Serial COM port via Chrome/Edge WebSerial API.
   */
  async connectWebSerial(customBaudRate?: number): Promise<boolean> {
    if (!this.isWebSerialSupported()) {
      throw new Error('WebSerial API is not supported in this browser. Use Google Chrome or Microsoft Edge.');
    }

    try {
      const baudRate = customBaudRate || this.config.baudRate || 9600;
      const nav = navigator as unknown as NavigatorSerialLike;
      if (!nav.serial) {
        throw new Error('WebSerial API unavailable.');
      }
      const port = await nav.serial.requestPort();
      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });

      this.serialPort = port;
      this.writer = port.writable.getWriter();
      this.isConnected = true;

      if (this.config.protocol === 'PRICE_DISPLAY') {
        await this.sendPriceDisplay('0.00', 'NONE');
      } else {
        const welcome = this.formatIdle(this.config.storeName, this.config.welcomeMessage);
        await this.sendBytes(this.buildBuffer(welcome.line1, welcome.line2), this.config.protocol, {
          line1: welcome.line1,
          line2: welcome.line2,
        });
      }

      return true;
    } catch (err: unknown) {
      this.isConnected = false;
      this.writer = null;
      this.serialPort = null;
      const errName = err instanceof DOMException || err instanceof Error ? err.name : '';
      if (errName !== 'NotFoundError') {
        console.error('WebSerial connection error:', err);
      }
      return false;
    }
  }

  async disconnectWebSerial(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      }
    } catch (e) {
      console.warn('Error closing WebSerial port:', e);
    } finally {
      this.isConnected = false;
    }
  }

  /**
   * Formats text to exact fixed character width (default 20 columns for VFD/LCD).
   */
  formatLine(text: string, width = 20): string {
    const clean = cleanAscii(text);
    if (clean.length > width) {
      return clean.substring(0, width);
    }
    return clean.padEnd(width, ' ');
  }

  centerText(text: string, width = 20): string {
    const clean = cleanAscii(text);
    if (clean.length >= width) return clean.substring(0, width);
    const leftPad = Math.floor((width - clean.length) / 2);
    const rightPad = width - clean.length - leftPad;
    return ' '.repeat(leftPad) + clean + ' '.repeat(rightPad);
  }

  makeTwoColumnLine(left: string, right: string, width = 20): string {
    const cleanRight = cleanAscii(right);
    const availableForLeft = Math.max(0, width - cleanRight.length - 1);
    const cleanLeft = cleanAscii(left).substring(0, availableForLeft);
    const spaces = Math.max(1, width - cleanLeft.length - cleanRight.length);
    return cleanLeft + ' '.repeat(spaces) + cleanRight;
  }

  formatIdle(storeName = 'SL MediFlow', greeting = 'WELCOME! THANK YOU'): { line1: string; line2: string } {
    return {
      line1: this.centerText(storeName, 20),
      line2: this.centerText(greeting, 20),
    };
  }

  formatItem(name: string, price: number, qty = 1, subtotal?: number): { line1: string; line2: string } {
    const priceStr = price.toFixed(2);
    const line1 = this.makeTwoColumnLine(name, priceStr, 20);
    const calcSubtotal = subtotal !== undefined ? subtotal : price * qty;
    const line2 = this.makeTwoColumnLine(`QTY:${qty}`, `SUB:${calcSubtotal.toFixed(0)}`, 20);
    return { line1, line2 };
  }

  formatPayment(subtotal: number, totalDue: number): { line1: string; line2: string } {
    return {
      line1: this.makeTwoColumnLine('SUBTOTAL:', `Rs.${subtotal.toLocaleString()}`, 20),
      line2: this.makeTwoColumnLine('TOTAL DUE:', `Rs.${totalDue.toLocaleString()}`, 20),
    };
  }

  formatCompleted(amountPaid: number, changeDue: number): { line1: string; line2: string } {
    return {
      line1: this.makeTwoColumnLine('PAID CASH:', `Rs.${amountPaid.toLocaleString()}`, 20),
      line2: this.makeTwoColumnLine('CHANGE DUE:', `Rs.${changeDue.toLocaleString()}`, 20),
    };
  }

  /**
   * Generates protocol binary command buffer for LED8 Price Displays and 2x20 VFD/LCD Pole Displays.
   */
  buildBuffer(line1: string, line2: string, protocol?: PoleDisplayProtocol): Uint8Array {
    const proto = protocol || this.config.protocol || 'CD5220';
    const l1 = this.formatLine(line1, 20);
    const l2 = this.formatLine(line2, 20);
    const encoder = new TextEncoder();
    const parts: number[] = [];

    switch (proto) {
      case 'PRICE_DISPLAY': {
        const combined = `${line1} ${line2}`;
        const noCommas = combined.replace(/,/g, '');
        let indicator = 0; // 0=Off, 1=Price, 2=Total, 3=Collect, 4=Change
        let amountStr = '0.00';

        if (/change/i.test(noCommas)) {
          indicator = 4;
          const m = noCommas.match(/\bchange(?:\s+due)?[:\s]+(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i);
          amountStr = (m && m[1]) || noCommas.match(/-?\d+(?:\.\d+)?/)?.[0] || '0.00';
        } else if (/\btotal|subtotal|due/i.test(noCommas)) {
          indicator = 2;
          const m =
            noCommas.match(/\btotal(?:\s+due)?[:\s]+(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i) ||
            noCommas.match(/\bsubtotal[:\s]+(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i);
          amountStr = (m && m[1]) || noCommas.match(/-?\d+(?:\.\d+)?/)?.[0] || '0.00';
        } else if (/paid|cash|collect/i.test(noCommas)) {
          indicator = 3;
          const m = noCommas.match(/\b(?:paid|cash|collect)[:\s]+(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i);
          amountStr = (m && m[1]) || noCommas.match(/-?\d+(?:\.\d+)?/)?.[0] || '0.00';
        } else if (/qty|price|item|\d+\.\d{2}/i.test(noCommas)) {
          indicator = 1;
          const m = noCommas.match(/\b(?:price|sub)?[:\s]+(?:rs\.?\s*)?(\d+(?:\.\d+)?)/i);
          amountStr = (m && m[1]) || noCommas.match(/-?\d+(?:\.\d+)?/)?.[0] || '0.00';
        } else {
          const m = noCommas.match(/-?\d+(?:\.\d+)?/);
          amountStr = (m && m[0]) || '0.00';
        }

        const cleanAmount = amountStr.substring(0, 10);
        parts.push(0x0c);
        parts.push(0x1b, 0x73, 0x30 + indicator);
        parts.push(0x1b, 0x51, 0x41);
        parts.push(...encoder.encode(cleanAmount));
        parts.push(0x0d);
        break;
      }

      case 'CD5220': {
        parts.push(0x1b, 0x40);
        parts.push(0x0c);
        parts.push(0x1b, 0x51, 0x41);
        parts.push(...encoder.encode(l1));
        parts.push(0x0d);
        parts.push(0x1b, 0x51, 0x42);
        parts.push(...encoder.encode(l2));
        parts.push(0x0d);
        break;
      }

      case 'ESCPOS': {
        parts.push(0x1b, 0x40);
        parts.push(0x0c);
        parts.push(0x1f, 0x24, 0x01, 0x01);
        parts.push(...encoder.encode(l1));
        parts.push(0x1f, 0x24, 0x01, 0x02);
        parts.push(...encoder.encode(l2));
        break;
      }

      case 'UTC': {
        parts.push(0x0c);
        parts.push(0x0b);
        parts.push(...encoder.encode(l1));
        parts.push(0x1f, 0x42);
        parts.push(...encoder.encode(l2));
        break;
      }

      case 'AEDEX': {
        parts.push(0x21, 0x23, 0x31);
        parts.push(...encoder.encode(l1));
        parts.push(0x0d);
        parts.push(0x21, 0x23, 0x32);
        parts.push(...encoder.encode(l2));
        parts.push(0x0d);
        break;
      }

      default: {
        parts.push(...encoder.encode(`${l1}\r\n${l2}`));
        break;
      }
    }

    return new Uint8Array(parts);
  }

  /**
   * Builds an exact single-line LED/VFD Price Display packet:
   * CLR (0x0C) + ESC s <indicator> + ESC Q A <amount> CR
   */
  buildPriceDisplayBuffer(
    amount: number | string,
    indicator: PriceDisplayIndicator = 'NONE'
  ): Uint8Array {
    const encoder = new TextEncoder();
    const parts: number[] = [];

    const indicatorMap: Record<PriceDisplayIndicator, number> = {
      NONE: 0x30,
      PRICE: 0x31,
      TOTAL: 0x32,
      COLLECT: 0x33,
      CHANGE: 0x34,
    };

    let numStr = '0.00';
    if (typeof amount === 'number') {
      numStr = amount.toFixed(2);
    } else {
      const match = (amount || '').match(/-?\d+(?:\.\d+)?/);
      numStr = match ? match[0] : '0.00';
    }

    parts.push(0x0c);
    parts.push(0x1b, 0x73, indicatorMap[indicator] ?? 0x30);
    parts.push(0x1b, 0x51, 0x41);
    parts.push(...encoder.encode(numStr.substring(0, 10)));
    parts.push(0x0d);

    return new Uint8Array(parts);
  }

  private async writeDirectWebSerial(bytes: Uint8Array): Promise<boolean> {
    if (!this.writer) return false;
    try {
      await this.writer.write(bytes);
      return true;
    } catch (e) {
      console.warn('Failed to write to WebSerial port:', e);
      return false;
    }
  }

  /**
   * Dispatches encoded bytes via active transport (Local Bridge with WebSerial fallback, or Direct WebSerial).
   */
  private async sendBytes(
    bytes: Uint8Array,
    protocol: PoleDisplayProtocol,
    options: { bridgeUrl?: string; line1?: string; line2?: string } = {}
  ): Promise<boolean> {
    if (!this.config.enabled || this.config.mode === 'DISABLED' || this.config.mode === 'DUAL_SCREEN') {
      return true;
    }

    if (this.config.transport === 'WEBSERIAL') {
      return await this.writeDirectWebSerial(bytes);
    }

    const rawBase64 = uint8ToBase64(bytes);
    const url = this.getResolvedBridgeUrl(options.bridgeUrl);

    try {
      const res = await fetch(`${url}/pole-display`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: this.config.port,
          baudRate: this.config.baudRate,
          protocol,
          line1: options.line1,
          line2: options.line2,
          data: rawBase64,
        }),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      if (this.isWebSerialConnected()) {
        return await this.writeDirectWebSerial(bytes);
      }
      return false;
    }
  }

  async sendLines(
    line1: string,
    line2: string,
    options: { bridgeUrl?: string; customProtocol?: PoleDisplayProtocol } = {}
  ): Promise<boolean> {
    const protocol = options.customProtocol || this.config.protocol;
    const bytes = this.buildBuffer(line1, line2, protocol);
    return await this.sendBytes(bytes, protocol, {
      bridgeUrl: options.bridgeUrl,
      line1,
      line2,
    });
  }

  async sendPriceDisplay(
    amount: number | string,
    indicator: PriceDisplayIndicator = 'NONE',
    bridgeUrl?: string
  ): Promise<boolean> {
    const bytes = this.buildPriceDisplayBuffer(amount, indicator);
    return await this.sendBytes(bytes, 'PRICE_DISPLAY', { bridgeUrl });
  }

  async sendDiagnosticTestFrame(bridgeUrl?: string): Promise<boolean> {
    if (this.config.protocol === 'PRICE_DISPLAY') {
      return await this.sendPriceDisplay('8888.88', 'PRICE', bridgeUrl);
    }
    const welcome = this.formatIdle(this.config.storeName, 'DISPLAY TEST OK');
    return await this.sendLines(welcome.line1, welcome.line2, { bridgeUrl });
  }

  async clearDisplay(bridgeUrl?: string): Promise<boolean> {
    if (this.config.protocol === 'PRICE_DISPLAY') {
      return await this.sendPriceDisplay('0.00', 'NONE', bridgeUrl);
    }
    return await this.sendLines('                    ', '                    ', { bridgeUrl });
  }

  /**
   * Synchronizes the physical pole display with POS checkout lifecycle states
   * (`IDLE`, `SCANNING`, `PAYMENT`, `COMPLETED`) and schedules auto-revert after completion.
   */
  async syncWithCustomerDisplayState(state: CustomerDisplayState, bridgeUrl?: string): Promise<void> {
    if (this.revertTimer) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }

    if (!this.config.enabled || this.config.mode === 'DISABLED' || this.config.mode === 'DUAL_SCREEN') {
      return;
    }

    if (this.config.protocol === 'PRICE_DISPLAY') {
      switch (state.status) {
        case 'IDLE':
          await this.sendPriceDisplay('0.00', 'NONE', bridgeUrl);
          break;
        case 'SCANNING': {
          const price = state.lastScannedItem ? state.lastScannedItem.priceLkr : state.subtotalLkr;
          await this.sendPriceDisplay(price, 'PRICE', bridgeUrl);
          break;
        }
        case 'PAYMENT':
          await this.sendPriceDisplay(state.totalLkr, 'TOTAL', bridgeUrl);
          break;
        case 'COMPLETED': {
          const change = state.changeDueLkr || 0;
          if (change > 0) {
            await this.sendPriceDisplay(change, 'CHANGE', bridgeUrl);
          } else {
            const paid = state.amountPaidLkr || state.totalLkr;
            await this.sendPriceDisplay(paid, 'COLLECT', bridgeUrl);
          }

          const timeoutMs = (this.config.changeDisplayTimeoutSeconds || 7) * 1000;
          this.revertTimer = setTimeout(() => {
            this.sendPriceDisplay('0.00', 'NONE', bridgeUrl).catch(() => {});
          }, timeoutMs);
          break;
        }
      }
      return;
    }

    switch (state.status) {
      case 'IDLE': {
        const idle = this.formatIdle(
          state.storeName || this.config.storeName,
          this.config.welcomeMessage
        );
        await this.sendLines(idle.line1, idle.line2, { bridgeUrl });
        break;
      }
      case 'SCANNING': {
        if (state.lastScannedItem) {
          const item = this.formatItem(
            state.lastScannedItem.name,
            state.lastScannedItem.priceLkr,
            state.lastScannedItem.qty,
            state.subtotalLkr
          );
          await this.sendLines(item.line1, item.line2, { bridgeUrl });
        } else {
          const line1 = this.makeTwoColumnLine('ITEMS IN CART:', `${state.itemCount}`, 20);
          const line2 = this.makeTwoColumnLine('SUBTOTAL:', `Rs.${state.subtotalLkr.toFixed(0)}`, 20);
          await this.sendLines(line1, line2, { bridgeUrl });
        }
        break;
      }
      case 'PAYMENT': {
        const payment = this.formatPayment(state.subtotalLkr, state.totalLkr);
        await this.sendLines(payment.line1, payment.line2, { bridgeUrl });
        break;
      }
      case 'COMPLETED': {
        const completed = this.formatCompleted(
          state.amountPaidLkr || state.totalLkr,
          state.changeDueLkr || 0
        );
        await this.sendLines(completed.line1, completed.line2, { bridgeUrl });

        const timeoutMs = (this.config.changeDisplayTimeoutSeconds || 7) * 1000;
        this.revertTimer = setTimeout(() => {
          const idle = this.formatIdle(
            state.storeName || this.config.storeName,
            this.config.welcomeMessage
          );
          this.sendLines(idle.line1, idle.line2, { bridgeUrl }).catch(() => {});
        }, timeoutMs);
        break;
      }
    }
  }
}

export const poleDisplayService = new PoleDisplayService();

