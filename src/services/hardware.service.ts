/**
 * SL MediFlow Native Hardware & Customer Display Facade
 * Coordinates BroadcastChannel customer monitor updates, Window Management API multi-screen placement,
 * local node-print Bridge communication, and Pole Display serialization.
 */

import {
  poleDisplayService,
  PoleDisplayConfig,
  PoleDisplayProtocol,
  PriceDisplayIndicator,
  CustomerDisplayState,
} from './pole-display.service';

export type { CustomerDisplayState, PoleDisplayCustomerItem } from './pole-display.service';

export const CUSTOMER_DISPLAY_CHANNEL = 'slmediflow_customer_display';

export interface PrintJobPayload {
  printer?: string;
  type: 'raw' | 'text' | 'escpos';
  data: string; // Base64 payload
}

export interface PoleDisplayBridgePayload {
  port?: string;
  baudRate?: number;
  protocol?: PoleDisplayProtocol;
  line1?: string;
  line2?: string;
  data?: string;
}

export class ThermalPrintBridgeClient {
  private url: string;

  constructor(options: { url?: string } = {}) {
    this.url = (options.url || poleDisplayService.getResolvedBridgeUrl()).replace(/\/+$/, '');
  }

  async listPrinters(): Promise<Array<{ name: string; isDefault?: boolean }>> {
    const res = await fetch(`${this.url}/printers`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`Bridge returned HTTP ${res.status}`);
    const body = await res.json();
    return body.data || body.printers || [];
  }

  async print(payload: PrintJobPayload): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${this.url}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Print failed with HTTP ${res.status}`);
    return await res.json();
  }

  async openDrawer(pin: 2 | 5 = 2): Promise<{ success: boolean }> {
    const res = await fetch(`${this.url}/cash-drawer/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('Cash drawer kick failed');
    return await res.json();
  }

  async sendPoleDisplay(payload: PoleDisplayBridgePayload): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${this.url}/pole-display`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('Pole display command failed');
    return await res.json();
  }

  async listSerialPorts(): Promise<string[]> {
    try {
      const res = await fetch(`${this.url}/serial/ports`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return ['COM1', 'COM2', 'COM3', 'COM4'];
      const body = await res.json();
      const ports = body.ports || body.data;
      if (Array.isArray(ports) && ports.length > 0) {
        return ports.map((p: string | { path?: string; name?: string }) =>
          typeof p === 'string' ? p : p?.path || p?.name || String(p)
        );
      }
      return ['COM1', 'COM2', 'COM3', 'COM4'];
    } catch {
      return ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6'];
    }
  }
}

class HardwareService {
  private displayChannel: BroadcastChannel | null = null;

  private getChannel(): BroadcastChannel | null {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
    if (!this.displayChannel) {
      this.displayChannel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    }
    return this.displayChannel;
  }

  private getClient(): ThermalPrintBridgeClient {
    return new ThermalPrintBridgeClient({ url: this.getBridgeUrl() });
  }

  getBridgeUrl(): string {
    return poleDisplayService.getResolvedBridgeUrl();
  }

  setBridgeUrl(url: string) {
    poleDisplayService.setBridgeUrl(url);
  }

  async checkBridgeHealth(): Promise<{ online: boolean; printers: string[]; latencyMs: number }> {
    const start = Date.now();
    try {
      const printers = await this.getClient().listPrinters();
      return {
        online: true,
        printers: printers.map((p: string | { name?: string }) =>
          typeof p === 'string' ? p : p?.name || 'Thermal Printer'
        ),
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        online: false,
        printers: [],
        latencyMs: Date.now() - start,
      };
    }
  }

  /**
   * Broadcasts POS checkout state to secondary Graphic Customer Display window
   * and synchronizes physical Pole Display (Bridge or WebSerial).
   */
  updateCustomerDisplay(state: CustomerDisplayState) {
    const payload: CustomerDisplayState = {
      ...state,
      updatedAt: state.updatedAt || Date.now(),
    };

    const channel = this.getChannel();
    if (channel) {
      channel.postMessage(payload);
    }

    poleDisplayService.syncWithCustomerDisplayState(payload, this.getBridgeUrl()).catch((err) => {
      console.warn('Customer pole display update notice:', err);
    });
  }

  async sendPoleDisplayText(line1: string, line2: string): Promise<boolean> {
    return await poleDisplayService.sendLines(line1, line2, { bridgeUrl: this.getBridgeUrl() });
  }

  async sendPolePriceDisplay(
    amount: number | string,
    indicator: PriceDisplayIndicator = 'NONE'
  ): Promise<boolean> {
    return await poleDisplayService.sendPriceDisplay(amount, indicator, this.getBridgeUrl());
  }

  async sendPoleDiagnosticTest(): Promise<boolean> {
    return await poleDisplayService.sendDiagnosticTestFrame(this.getBridgeUrl());
  }

  async clearPoleDisplay(): Promise<boolean> {
    return await poleDisplayService.clearDisplay(this.getBridgeUrl());
  }

  getPoleDisplayConfig(): PoleDisplayConfig {
    return poleDisplayService.getConfig();
  }

  savePoleDisplayConfig(config: Partial<PoleDisplayConfig>): PoleDisplayConfig {
    return poleDisplayService.saveConfig(config);
  }

  applySystemDefaults(
    settings: Record<string, string | undefined>,
    options: { force?: boolean } = {}
  ): PoleDisplayConfig {
    return poleDisplayService.applySystemDefaults(settings, options);
  }

  async connectPoleDisplaySerial(baudRate?: number): Promise<boolean> {
    return await poleDisplayService.connectWebSerial(baudRate);
  }

  async disconnectPoleDisplaySerial(): Promise<void> {
    await poleDisplayService.disconnectWebSerial();
  }

  isPoleDisplaySerialConnected(): boolean {
    return poleDisplayService.isWebSerialConnected();
  }

  isWebSerialSupported(): boolean {
    return poleDisplayService.isWebSerialSupported();
  }

  async listSerialPorts(): Promise<string[]> {
    return await this.getClient().listSerialPorts();
  }

  /**
   * Opens / focuses the Customer-Facing Display screen on secondary monitor.
   * Uses the Window Management API (`getScreenDetails`) when available, with coordinate offset fallback.
   */
  async openCustomerDisplayWindow(route: string = '/customer-display') {
    if (typeof window === 'undefined') return;

    let targetLeft = window.screen.availWidth || 1920;
    let targetTop = 0;
    let targetWidth = 1024;
    let targetHeight = 768;

    if ('getScreenDetails' in window) {
      try {
        interface ScreenDetailLike {
          availLeft: number;
          availTop: number;
          availWidth: number;
          availHeight: number;
        }
        const winWithScreens = window as unknown as {
          getScreenDetails?: () => Promise<{
            screens: ScreenDetailLike[];
            currentScreen: ScreenDetailLike;
          }>;
        };
        if (winWithScreens.getScreenDetails) {
          const screenDetails = await winWithScreens.getScreenDetails();
          const secondaryScreen = screenDetails.screens.find(
            (s) => s !== screenDetails.currentScreen
          );
          if (secondaryScreen) {
            targetLeft = secondaryScreen.availLeft;
            targetTop = secondaryScreen.availTop;
            targetWidth = secondaryScreen.availWidth;
            targetHeight = secondaryScreen.availHeight;
          }
        }
      } catch {
        console.info('Window management permission not granted, using secondary screen coordinate fallback.');
      }
    }

    const windowName = route === '/frontdesk/customer-display' ? 'SLMediFlow_Patient_Display' : 'SLMediFlow_Customer_Display';
    const windowFeatures = `left=${targetLeft},top=${targetTop},width=${targetWidth},height=${targetHeight},menubar=no,toolbar=no,location=no,status=no`;
    const win = window.open(route, windowName, windowFeatures);
    if (win) {
      win.focus();
    }
  }
}

export const hardwareService = new HardwareService();

