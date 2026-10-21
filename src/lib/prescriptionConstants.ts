export interface FrequencyOption {
  code: string;
  label: string;
  description: string;
  timesPerDay?: number;
}

export interface RouteOption {
  code: string;
  label: string;
  description: string;
}

export const PRESCRIPTION_FREQUENCIES: FrequencyOption[] = [
  { code: "OD", label: "OD — Once daily", description: "Once every 24 hours", timesPerDay: 1 },
  { code: "BD", label: "BD — Twice daily", description: "Every 12 hours / twice daily", timesPerDay: 2 },
  { code: "TDS", label: "TDS — Three times daily", description: "Every 8 hours / 3 times daily", timesPerDay: 3 },
  { code: "QDS", label: "QDS / QID — Four times daily", description: "Every 6 hours / 4 times daily", timesPerDay: 4 },
  { code: "EOD", label: "EOD — Every other day", description: "Alternate days schedule", timesPerDay: 0.5 },
  { code: "STAT", label: "STAT — Immediately / One-time dose", description: "Single immediate administration", timesPerDay: 0 },
  { code: "CUSTOM", label: "CUSTOM — Custom schedule", description: "Clinician-specified schedule" }
];

export const PRESCRIPTION_ROUTES: RouteOption[] = [
  { code: "ORAL", label: "Oral (PO)", description: "Oral medication taken by mouth" },
  { code: "SUPPOSITORY", label: "Suppository (PR / PV)", description: "Suppository administered through prescribed route" },
  { code: "IM", label: "Intramuscular (IM)", description: "Intramuscular injection" },
  { code: "IV", label: "Intravenous (IV)", description: "Intravenous injection or infusion" },
  { code: "SC", label: "Subcutaneous (SC)", description: "Subcutaneous injection" },
  { code: "OTHER", label: "Other route", description: "Other clinician-specified route" }
];

export const DOSE_UNITS = [
  "tablet(s)",
  "capsule(s)",
  "mg",
  "ml",
  "drops",
  "puff(s)",
  "sachet(s)",
  "unit(s)",
  "patch",
  "application"
] as const;

export function getFrequencyLabel(code?: string | null): string {
  if (!code) return "N/A";
  const upper = code.trim().toUpperCase();
  if (upper === "QID") return "Four times daily (QDS/QID)";
  const found = PRESCRIPTION_FREQUENCIES.find(f => f.code === upper);
  return found ? found.label : code;
}

export function getRouteLabel(code?: string | null): string {
  if (!code) return "Oral (PO)";
  const upper = code.trim().toUpperCase();
  const found = PRESCRIPTION_ROUTES.find(r => r.code === upper);
  return found ? found.label : code;
}

export function getFrequencyBadgeClass(code?: string | null): string {
  if (!code) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const upper = code.trim().toUpperCase();
  switch (upper) {
    case "STAT":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold";
    case "EOD":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    case "OD":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
    case "BD":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    case "TDS":
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800";
    case "QDS":
    case "QID":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
  }
}

export function getRouteBadgeClass(code?: string | null): string {
  if (!code) return "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800";
  const upper = code.trim().toUpperCase();
  switch (upper) {
    case "IV":
      return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800 font-medium";
    case "IM":
      return "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-medium";
    case "SC":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium";
    case "SUPPOSITORY":
      return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-medium";
    case "ORAL":
    default:
      return "bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800";
  }
}
