import { useCallback } from 'react';
import { hardwareService } from '@/services/hardware.service';
import { poleDisplayService } from '@/services/pole-display.service';

export function usePoleDisplay(enabled: boolean = true) {
  const showAmount = useCallback(
    async (amount: number, label: string = 'TOTAL DUE:') => {
      if (!enabled) return;

      const config = hardwareService.getPoleDisplayConfig();
      if (!config.enabled || config.mode === 'DISABLED' || config.mode === 'DUAL_SCREEN') {
        return;
      }

      if (config.protocol === 'PRICE_DISPLAY') {
        await hardwareService.sendPolePriceDisplay(amount, 'TOTAL');
      } else {
        const line1 = poleDisplayService.centerText(config.storeName || 'SL MediFlow', 20);
        const line2 = poleDisplayService.makeTwoColumnLine(label, `Rs.${amount.toFixed(2)}`, 20);
        await hardwareService.sendPoleDisplayText(line1, line2);
      }
    },
    [enabled]
  );

  const clearDisplay = useCallback(async () => {
    if (!enabled) return;
    await hardwareService.clearPoleDisplay();
  }, [enabled]);

  return { showAmount, clearDisplay };
}
