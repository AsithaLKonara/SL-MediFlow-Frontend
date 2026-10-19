export interface RxQuantityInput {
  dispenseQty?: number | null;
  quantity?: number | null;
  frequency?: string | null;
  duration?: string | null;
  dosageAmount?: string | number | null;
  timesPerDay?: string | number | null;
  tabletsPerTime?: string | number | null;
}

/**
 * Calculates the total dispense quantity for a prescribed medication based on
 * dosage frequency, dose per administration, and duration.
 *
 * Safety & Clinical Rules:
 * - If clinician specified an explicit quantity / dispenseQty (>= 1), honor it directly.
 * - STAT is an immediate, single one-time dose: quantity = dose per administration (not multiplied by days).
 * - EOD (Every other day) = alternate days schedule (Math.ceil(days / 2) * dose per admin).
 * - OD = 1x/day, BD = 2x/day, TDS = 3x/day, QDS/QID = 4x/day.
 */
export function calculateDispenseQuantity(item: RxQuantityInput): number {
  if (item.quantity != null && Number(item.quantity) >= 1) {
    return Math.ceil(Number(item.quantity));
  }
  if (item.dispenseQty != null && Number(item.dispenseQty) >= 1) {
    return Math.ceil(Number(item.dispenseQty));
  }

  // Parse dosage units per administration (e.g. 0.5 tablet, 1 tablet, 2 tablets)
  let unitsPerAdmin = 1;
  if (item.dosageAmount) {
    const parsed = parseFloat(String(item.dosageAmount));
    if (!isNaN(parsed) && parsed > 0) unitsPerAdmin = parsed;
  } else if (item.tabletsPerTime) {
    const parsed = parseFloat(String(item.tabletsPerTime));
    if (!isNaN(parsed) && parsed > 0) unitsPerAdmin = parsed;
  }

  const freq = String(item.frequency || "").trim().toUpperCase();

  // STAT is an immediate, single one-time dose. Duration does not multiply STAT.
  if (freq === "STAT" || freq.startsWith("STAT")) {
    return Math.max(1, Math.ceil(unitsPerAdmin));
  }

  // Parse duration in days
  const durStr = String(item.duration || "1").trim();
  const durMatch = durStr.match(/(\d+)/);
  let durMultiplier = 1;
  if (/month/i.test(durStr)) durMultiplier = 30;
  else if (/week/i.test(durStr)) durMultiplier = 7;
  const days = Math.max(1, (durMatch && durMatch[1] ? parseInt(durMatch[1], 10) : 1) * durMultiplier);

  // EOD (Every other day) - administered alternate days
  if (freq === "EOD" || freq.includes("EVERY OTHER DAY")) {
    const doses = Math.ceil(days / 2);
    return Math.max(1, Math.ceil(doses * unitsPerAdmin));
  }

  let timesPerDay = 1;
  if (item.timesPerDay) {
    const parsed = parseInt(String(item.timesPerDay), 10);
    if (!isNaN(parsed) && parsed > 0) timesPerDay = parsed;
  }

  if (freq === "OD" || freq === "ONCE DAILY") {
    timesPerDay = 1;
  } else if (freq === "BD" || freq === "BID" || freq === "TWICE DAILY") {
    timesPerDay = 2;
  } else if (freq === "TDS" || freq === "TID" || freq === "THREE TIMES DAILY") {
    timesPerDay = 3;
  } else if (freq === "QDS" || freq === "QID" || freq === "FOUR TIMES DAILY") {
    timesPerDay = 4;
  } else if (freq.includes("X DAY")) {
    const match = freq.match(/(\d+)\s*X\s*DAY(?:.*?\((\d+)\s*(?:TAB|TABLETS?|CAPS?|PILLS?)\))?/i);
    if (match) {
      if (match[1]) timesPerDay = parseInt(match[1], 10) || timesPerDay;
      if (match[2]) unitsPerAdmin = parseFloat(match[2]) || unitsPerAdmin;
    }
  } else if (freq.includes("TABLETS") && freq.includes("TIMES A DAY")) {
    const parts = freq.split("TABLETS,");
    unitsPerAdmin = parseFloat(parts[0]?.trim() || "1") || unitsPerAdmin;
    timesPerDay = parseInt(parts[1]?.split("TIMES A DAY")[0]?.trim() || "1", 10) || timesPerDay;
  } else if (/^\d+$/.test(freq)) {
    timesPerDay = parseInt(freq, 10) || timesPerDay;
  }

  const autoCalc = Math.ceil(timesPerDay * unitsPerAdmin * days);
  return autoCalc > 0 ? autoCalc : 1;
}
