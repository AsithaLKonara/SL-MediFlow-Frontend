import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { hardwareService, CustomerDisplayState } from '@/services/hardware.service';
import {
  PoleDisplayConfig,
  PriceDisplayIndicator,
  poleDisplayService,
} from '@/services/pole-display.service';

export function useHardware() {
  const [bridgeStatus, setBridgeStatus] = useState<{
    online: boolean;
    printers: string[];
    latencyMs: number;
    checking: boolean;
  }>({
    online: false,
    printers: [],
    latencyMs: 0,
    checking: true,
  });

  const [poleConfig, setPoleConfig] = useState<PoleDisplayConfig>(() =>
    hardwareService.getPoleDisplayConfig()
  );
  const [isPoleSerialConnected, setIsPoleSerialConnected] = useState(() =>
    hardwareService.isPoleDisplaySerialConnected()
  );
  const [availablePorts, setAvailablePorts] = useState<string[]>([
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
  ]);

  const refreshBridge = useCallback(async () => {
    setBridgeStatus((prev) => ({ ...prev, checking: true }));
    const health = await hardwareService.checkBridgeHealth();
    setBridgeStatus({
      online: health.online,
      printers: health.printers,
      latencyMs: health.latencyMs,
      checking: false,
    });
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const health = await hardwareService.checkBridgeHealth();
      if (!active) return;
      setBridgeStatus({
        online: health.online,
        printers: health.printers,
        latencyMs: health.latencyMs,
        checking: false,
      });
    };
    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const broadcastDisplay = useCallback((state: CustomerDisplayState) => {
    hardwareService.updateCustomerDisplay(state);
  }, []);

  const launchCustomerDisplay = useCallback((route?: string) => {
    hardwareService.openCustomerDisplayWindow(route);
  }, []);

  const updatePoleConfig = useCallback((newCfg: Partial<PoleDisplayConfig>) => {
    const updated = hardwareService.savePoleDisplayConfig(newCfg);
    setPoleConfig(updated);
    return updated;
  }, []);

  const reloadPoleConfig = useCallback(() => {
    const loaded = poleDisplayService.loadConfig();
    setPoleConfig(loaded);
    return loaded;
  }, []);

  const refreshSerialPorts = useCallback(async () => {
    const ports = await hardwareService.listSerialPorts();
    if (ports && ports.length > 0) {
      setAvailablePorts(ports);
    }
  }, []);

  const connectPoleSerial = useCallback(async () => {
    try {
      const ok = await hardwareService.connectPoleDisplaySerial(poleConfig.baudRate);
      setIsPoleSerialConnected(ok);
      if (ok) {
        toast.success('WebSerial COM port connected for Pole Display.');
      } else {
        toast.error('WebSerial port selection cancelled or failed to open.');
      }
      return ok;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to pole display port.';
      toast.error(msg);
      setIsPoleSerialConnected(false);
      return false;
    }
  }, [poleConfig.baudRate]);

  const disconnectPoleSerial = useCallback(async () => {
    await hardwareService.disconnectPoleDisplaySerial();
    setIsPoleSerialConnected(false);
    toast.info('WebSerial port disconnected.');
  }, []);

  const sendPoleText = useCallback(async (line1: string, line2: string): Promise<boolean> => {
    return await hardwareService.sendPoleDisplayText(line1, line2);
  }, []);

  const sendPolePrice = useCallback(
    async (
      amount: number | string,
      indicator: PriceDisplayIndicator = 'NONE'
    ): Promise<boolean> => {
      return await hardwareService.sendPolePriceDisplay(amount, indicator);
    },
    []
  );

  const sendDiagnosticTest = useCallback(async (): Promise<boolean> => {
    return await hardwareService.sendPoleDiagnosticTest();
  }, []);

  const clearPole = useCallback(async (): Promise<boolean> => {
    return await hardwareService.clearPoleDisplay();
  }, []);

  const testPoleScreen = useCallback(
    async (mode: 'welcome' | 'item' | 'payment' | 'completed') => {
      if (poleConfig.protocol === 'PRICE_DISPLAY') {
        switch (mode) {
          case 'welcome':
            return await sendPolePrice('8888.88', 'NONE');
          case 'item':
            return await sendPolePrice('750.00', 'PRICE');
          case 'payment':
            return await sendPolePrice('2200.00', 'TOTAL');
          case 'completed':
            return await sendPolePrice('2800.00', 'CHANGE');
        }
      }

      switch (mode) {
        case 'welcome': {
          const welcome = poleDisplayService.formatIdle(
            poleConfig.storeName || 'SL MediFlow',
            poleConfig.welcomeMessage || 'WELCOME! THANK YOU'
          );
          return await sendPoleText(welcome.line1, welcome.line2);
        }
        case 'item': {
          const item = poleDisplayService.formatItem('Paracetamol 500mg', 750.0, 2, 1500.0);
          return await sendPoleText(item.line1, item.line2);
        }
        case 'payment': {
          const pay = poleDisplayService.formatPayment(2450, 2200);
          return await sendPoleText(pay.line1, pay.line2);
        }
        case 'completed': {
          const done = poleDisplayService.formatCompleted(5000, 2800);
          return await sendPoleText(done.line1, done.line2);
        }
      }
    },
    [poleConfig, sendPoleText, sendPolePrice]
  );

  return {
    bridgeStatus,
    refreshBridge,
    broadcastDisplay,
    launchCustomerDisplay,
    poleConfig,
    updatePoleConfig,
    reloadPoleConfig,
    isPoleSerialConnected,
    connectPoleSerial,
    disconnectPoleSerial,
    availablePorts,
    refreshSerialPorts,
    sendPoleText,
    sendPolePrice,
    sendDiagnosticTest,
    clearPole,
    testPoleScreen,
    isWebSerialSupported: hardwareService.isWebSerialSupported(),
  };
}

