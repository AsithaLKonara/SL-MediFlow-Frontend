import React, { forwardRef } from "react";

export interface DoctorPaymentItem {
  doctorId: string;
  doctorName: string;
  specialty: string;
  patientCount: number;
  totalFee: number;
  commissionRate: number;
  hospitalCommission: number;
  netDoctorPayment: number;
  cashDisbursed?: number;
}

export interface ShiftSummaryData {
  shiftId: string;
  shiftRef: string;
  cashierId: string;
  cashierName: string;
  cashierRole: string;
  openedAt: string | Date;
  closedAt: string | Date;
  durationMinutes?: number;
  durationFormatted: string;
  printedAt?: string | Date;

  totalInvoices: number;
  totalTransactions?: number;
  systemCashTotal: number;
  systemCardTotal: number;
  systemBankTotal?: number;
  systemQrTotal?: number;
  nonCashTotal?: number;
  grossSales: number;
  totalSales?: number;
  cashRefundsTotal: number;
  totalRefunds?: number;
  netSales: number;
  todayHospitalTotalSales?: number;
  departmentSales?: {
    consultations: number;
    pharmacy: number;
    lab: number;
    extraServices: number;
    other: number;
  };

  startingFloat: number;
  cashCollected?: number;
  cashRefunds?: number;
  doctorCashDisbursed?: number;
  expectedCash: number;
  declaredCash: number;
  actualCash?: number;
  variance: number;
  varianceStatus?: "BALANCED" | "SURPLUS" | "SHORTAGE" | string;

  doctorPayments?: DoctorPaymentItem[];
  totalDoctorPayments?: {
    totalDoctors: number;
    totalConsultations: number;
    totalFee: number;
    hospitalCommission: number;
    netDoctorPayment: number;
    totalDoctorNetPayment?: number;
    totalDoctorCashDisbursed?: number;
  };
  doctorDisbursementsList?: Array<{
    id: string;
    doctorName: string;
    specialty?: string;
    cashDisbursed: number;
    disbursedAt: string | Date;
  }>;
}

export interface ShiftSummaryReceiptProps {
  summary: ShiftSummaryData | null;
  user?: {
    fullName?: string;
    role?: string;
    email?: string;
  } | null;
}

function formatCurrency(amount: number | undefined | null): string {
  const num = Number(amount) || 0;
  return `LKR ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "N/A";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export const ShiftSummaryReceipt = forwardRef<HTMLDivElement, ShiftSummaryReceiptProps>(
  ({ summary, user }, ref) => {
    if (!summary) return null;

    const cashierName = summary.cashierName || user?.fullName || "Cashier";
    const cashierRole = summary.cashierRole || user?.role || "Front Desk";
    const nonCash = summary.nonCashTotal ?? (summary.systemCardTotal + (summary.systemBankTotal || 0) + (summary.systemQrTotal || 0));
    const grossSales = summary.grossSales ?? (summary.systemCashTotal + nonCash);
    const netSales = summary.netSales ?? (grossSales - (summary.cashRefundsTotal || 0));
    const variance = summary.variance ?? (summary.declaredCash - summary.expectedCash);
    const varianceStatus = summary.varianceStatus ?? (Math.abs(variance) < 0.01 ? "BALANCED" : variance > 0 ? "SURPLUS" : "SHORTAGE");

    return (
      <div
        ref={ref}
        className="w-[290px] mx-auto box-border bg-white text-black px-3.5 py-3 font-mono text-[11px] leading-tight print:w-[290px] print:px-3 print:py-2 select-text"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: auto;
                  margin: 2mm 2mm;
                }
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            `,
          }}
        />

        {/* 1. Hospital Header */}
        <div className="text-center mb-2 pb-2 border-b-2 border-black">
          <img src="/logo.png" alt="AMAZ Hospital" className="w-36 mx-auto mb-1.5 grayscale brightness-0 object-contain" />
          <h2 className="text-xs font-bold uppercase tracking-wider">AMAZ Hospital</h2>
          <p className="text-[10px] text-gray-700">Debarawewa, Tissamaharama</p>
          <p className="text-[10px] text-gray-700">Tel: 0472239090 | info@amazhospital.com</p>
          <div className="mt-1.5 py-0.5 border-y border-dashed border-black">
            <p className="text-[11px] font-black uppercase tracking-wide">SHIFT CLOSE & SALES SETTLEMENT</p>
          </div>
        </div>

        {/* 2. Cashier & Front Desk Details */}
        <div className="mb-2 pb-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between">
            <span className="text-gray-600">Shift Ref:</span>
            <span className="font-bold">{summary.shiftRef || `SH-${summary.shiftId?.slice(0, 8).toUpperCase()}`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cashier:</span>
            <span className="font-bold">{cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Station / Role:</span>
            <span>{cashierRole}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shift Started:</span>
            <span>{formatDateTime(summary.openedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shift Closed:</span>
            <span>{formatDateTime(summary.closedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-semibold">{summary.durationFormatted || "N/A"}</span>
          </div>
        </div>

        {/* 3. Day Sale & Shift Sales Breakdown */}
        <div className="mb-2 pb-2 border-b border-dashed border-black">
          <p className="font-bold uppercase tracking-wider mb-1 text-[11px]">Day Sale & Revenue</p>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Total Transactions:</span>
              <span className="font-semibold">{summary.totalInvoices || summary.totalTransactions || 0}</span>
            </div>

            {summary.departmentSales && (
              <>
                <div className="flex justify-between text-gray-700">
                  <span>- Consultations / OPD:</span>
                  <span>{formatCurrency(summary.departmentSales.consultations)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>- Pharmacy:</span>
                  <span>{formatCurrency(summary.departmentSales.pharmacy)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>- Laboratory:</span>
                  <span>{formatCurrency(summary.departmentSales.lab)}</span>
                </div>
                {summary.departmentSales.extraServices > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>- Extra Services:</span>
                    <span>{formatCurrency(summary.departmentSales.extraServices)}</span>
                  </div>
                )}
              </>
            )}

            <div className="border-t border-dotted border-gray-300 my-1"></div>

            <div className="flex justify-between">
              <span>Cash Sales:</span>
              <span>{formatCurrency(summary.systemCashTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Card / Bank / QR:</span>
              <span>{formatCurrency(nonCash)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-dotted border-black pt-0.5">
              <span>Gross Shift Sales:</span>
              <span>{formatCurrency(grossSales)}</span>
            </div>
            {summary.cashRefundsTotal > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>(-) Cash Refunds:</span>
                <span>-{formatCurrency(summary.cashRefundsTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-[12px] border-t border-black pt-1">
              <span>NET SHIFT SALES:</span>
              <span>{formatCurrency(netSales)}</span>
            </div>
            {summary.todayHospitalTotalSales !== undefined && summary.todayHospitalTotalSales > 0 && (
              <div className="flex justify-between text-[10px] text-gray-600 pt-0.5">
                <span>Hospital Today (All):</span>
                <span>{formatCurrency(summary.todayHospitalTotalSales)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Cash Drawer Reconciliation (Cash Balance) */}
        <div className="mb-2 pb-2 border-b border-dashed border-black">
          <p className="font-bold uppercase tracking-wider mb-1 text-[11px]">Cash Balance & Drawer</p>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Starting / Float:</span>
              <span>{formatCurrency(summary.startingFloat)}</span>
            </div>
            <div className="flex justify-between">
              <span>(+) Cash Collected:</span>
              <span>+{formatCurrency(summary.systemCashTotal)}</span>
            </div>
            {summary.cashRefundsTotal > 0 && (
              <div className="flex justify-between">
                <span>(-) Cash Refunds:</span>
                <span>-{formatCurrency(summary.cashRefundsTotal)}</span>
              </div>
            )}
            {(summary.doctorCashDisbursed ?? 0) > 0 && (
              <div className="flex justify-between text-amber-900">
                <span>(-) Doctor Payouts:</span>
                <span>-{formatCurrency(summary.doctorCashDisbursed)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-dotted border-black pt-0.5">
              <span>Expected in Drawer:</span>
              <span>{formatCurrency(summary.expectedCash)}</span>
            </div>
            <div className="flex justify-between font-bold text-[12px]">
              <span>Declared Cash:</span>
              <span>{formatCurrency(summary.declaredCash)}</span>
            </div>
            <div
              className={`flex justify-between font-black text-[11px] border-t border-black pt-1 ${
                varianceStatus === "SHORTAGE" ? "text-red-600 font-extrabold" : varianceStatus === "SURPLUS" ? "text-blue-700 font-extrabold" : ""
              }`}
            >
              <span>Variance ({varianceStatus}):</span>
              <span>{formatCurrency(variance)}</span>
            </div>
          </div>
        </div>

        {/* 5. Doctor Payments Breakdown */}
        <div className="mb-2 pb-2 border-b border-dashed border-black">
          <p className="font-bold uppercase tracking-wider mb-1 text-[11px]">Doctor Payments</p>
          {summary.doctorPayments && summary.doctorPayments.length > 0 ? (
            <div className="space-y-1.5">
              {summary.doctorPayments.map((doc, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 p-1.5 rounded text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span className="truncate pr-1">{doc.doctorName}</span>
                    <span className="shrink-0">{doc.patientCount} pt(s)</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Specialty:</span>
                    <span>{doc.specialty}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Gross Fee:</span>
                    <span>{formatCurrency(doc.totalFee)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Hosp. Comm ({doc.commissionRate}%):</span>
                    <span>{formatCurrency(doc.hospitalCommission)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-dashed border-gray-300 pt-0.5 text-black">
                    <span>Net Doctor Share:</span>
                    <span>{formatCurrency(doc.netDoctorPayment)}</span>
                  </div>
                </div>
              ))}

              {summary.totalDoctorPayments && (
                <div className="pt-1 border-t border-dotted border-black space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Total Doctors:</span>
                    <span className="font-semibold">{summary.totalDoctorPayments.totalDoctors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Consultations:</span>
                    <span className="font-semibold">{summary.totalDoctorPayments.totalConsultations}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total Doctor Shares:</span>
                    <span>{formatCurrency(summary.totalDoctorPayments.netDoctorPayment)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 italic py-1">No doctor consultations during this shift.</p>
          )}

          {/* Doctor Cash Disbursements (if any direct payouts occurred at desk) */}
          {summary.doctorDisbursementsList && summary.doctorDisbursementsList.length > 0 && (
            <div className="mt-2 pt-1 border-t border-dotted border-gray-400">
              <p className="font-bold text-[10px] uppercase text-amber-900 mb-0.5">Doctor Cash Payouts Disbursed:</p>
              {summary.doctorDisbursementsList.map((dp, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="truncate">{dp.doctorName}:</span>
                  <span className="font-bold">-{formatCurrency(dp.cashDisbursed)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Signatures & Verification */}
        <div className="pt-2 text-center text-[10px] space-y-4">
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="flex flex-col items-center">
              <div className="border-t border-black w-24 mb-1"></div>
              <span>Cashier Signature</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="border-t border-black w-24 mb-1"></div>
              <span>Supervisor / Auditor</span>
            </div>
          </div>

          <div className="pt-1 text-[9px] text-gray-600 border-t border-dashed border-gray-400">
            <p>Printed: {formatDateTime(summary.printedAt || new Date())}</p>
            <p className="font-bold uppercase mt-0.5">End of Shift Settlement Report</p>
            <p>AMAZ Hospital Enterprise Management System</p>
          </div>
        </div>
      </div>
    );
  }
);

ShiftSummaryReceipt.displayName = "ShiftSummaryReceipt";
