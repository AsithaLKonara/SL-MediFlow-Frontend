export interface RxQuantityInput {
  dispenseQty?: number | null;
  frequency?: string | null;
  duration?: string | null;
  timesPerDay?: string | number | null;
  tabletsPerTime?: string | number | null;
}

/**
 * Calculates the total dispense quantity for a prescribed medication based on
 * dosage frequency, tablets per time, and duration (e.g. 2x day (2 tab) for 2 days = 8 tablets).
 * If an explicit override quantity (> 1) was specified, that quantity is honored.
 */
export function calculateDispenseQuantity(item: RxQuantityInput): number {
  if (item.dispenseQty && Number(item.dispenseQty) > 1) {
    return parseInt(String(item.dispenseQty), 10);
  }

  let timesPerDay = 1;
  let tabletsPerTime = 1;

  // 1. Direct inputs from form fields
  if (item.timesPerDay) {
    const parsed = parseInt(String(item.timesPerDay), 10);
    if (!isNaN(parsed) && parsed > 0) timesPerDay = parsed;
  }
  if (item.tabletsPerTime) {
    const parsed = parseInt(String(item.tabletsPerTime), 10);
    if (!isNaN(parsed) && parsed > 0) tabletsPerTime = parsed;
  }

  // 2. Parse from frequency string
  const freq = String(item.frequency || "").trim();
  if (freq) {
    if (freq.includes("x day")) {
      const match = freq.match(/(\d+)\s*x\s*day(?:.*?\((\d+)\s*(?:tab|tablets?|caps?|pills?)\))?/i);
      if (match) {
        if (match[1]) timesPerDay = parseInt(match[1], 10) || timesPerDay;
        if (match[2]) tabletsPerTime = parseInt(match[2], 10) || tabletsPerTime;
      }
    } else if (freq.includes("tablets") && freq.includes("times a day")) {
      const parts = freq.split("tablets,");
      tabletsPerTime = parseInt(parts[0]?.trim() || "1", 10) || tabletsPerTime;
      timesPerDay = parseInt(parts[1]?.split("times a day")[0]?.trim() || "1", 10) || timesPerDay;
    } else if (/^\d+$/.test(freq)) {
      timesPerDay = parseInt(freq, 10) || timesPerDay;
    } else if (/\b(qds|qid)\b|four times/i.test(freq)) {
      timesPerDay = 4;
    } else if (/\b(tds|tid)\b|three times/i.test(freq)) {
      timesPerDay = 3;
    } else if (/\b(bd|bid)\b|twice a day/i.test(freq)) {
      timesPerDay = 2;
    }
  }

  // 3. Parse duration
  const durStr = String(item.duration || "1").trim();
  const durMatch = durStr.match(/(\d+)/);
  let durMultiplier = 1;
  if (/month/i.test(durStr)) durMultiplier = 30;
  else if (/week/i.test(durStr)) durMultiplier = 7;
  const duration = (durMatch && durMatch[1] ? parseInt(durMatch[1], 10) : 1) * durMultiplier;

  const autoCalc = timesPerDay * tabletsPerTime * duration;
  if (autoCalc > 0) return autoCalc;
  return item.dispenseQty ? parseInt(String(item.dispenseQty), 10) : 1;
}
