import React from "react";

export interface DoctorDailyItem {
  id?: string;
  patientName: string;
  patientId?: string;
  appointmentId?: string;
  tokenNumber?: string;
  consultationFee: number;
  hospitalShare?: number;
  doctorShare?: number;
  collectionMethod?: string; // CASH, CARD, BANK
  time?: string;
  remarks?: string;
}

export interface DoctorDailySheetData {
  id: string;
  date: string;
  sessionName?: string;
  doctorId: string;
  doctor: {
    id: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    specialty?: string;
    specialization?: string;
    commissionRate?: number;
    consultationFee?: number;
    bankName?: string;
    bankBranch?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  totalPatients: number;
  consultationFee: number;
  totalRevenue: number;
  commissionRate: number;
  hospitalCommission: number;
  doctorPayment?: number;
  netDoctorPayment: number;
  otherAdjustments: number;
  cashRevenue?: number;
  cardRevenue?: number;
  cashDoctorShare?: number;
  bankDoctorShare?: number;
  cashDisbursed?: number;
  bankDisbursed?: number;
  disbursedByRole?: string;
  disbursedById?: string;
  bankDetails?: {
    bankName?: string;
    bankBranch?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    slipUrl?: string;
  };
  status: "DRAFT" | "VERIFIED" | "APPROVED" | "PAID" | "CANCELLED";
  paymentMethod?: string;
  paymentReference?: string;
  paymentSlipUrl?: string;
  paidAt?: string;
  receiptNumber?: string;
  verifiedAt?: string;
  verifiedBy?: { name?: string; fullName?: string };
  approvedAt?: string;
  approvedBy?: { name?: string; fullName?: string };
  paidBy?: { name?: string; fullName?: string };
  remarks?: string;
  patientItems?: DoctorDailyItem[];
}

interface DoctorPaymentReceiptProps {
  sheet: DoctorDailySheetData | null;
}

export const DoctorPaymentReceiptTemplate = React.forwardRef<HTMLDivElement, DoctorPaymentReceiptProps>(
  ({ sheet }, ref) => {
    if (!sheet) return null;

    const formattedPaymentDate = sheet.paidAt
      ? new Date(sheet.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const formattedSheetDate = new Date(sheet.date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    return (
      <div className="hidden">
        <div
          ref={ref}
          className="w-[794px] min-h-[1123px] mx-auto p-10 bg-white text-slate-900 font-sans text-sm leading-relaxed"
          style={{ boxSizing: "border-box" }}
        >
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 12mm 15mm;
                }
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `
          }} />

          {/* Hospital Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-5 mb-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="AMAZ Hospital" className="h-16 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">AMAZ HOSPITAL</h1>
                <p className="text-xs text-slate-600 font-medium">Debarawewa, Tissamaharama, Sri Lanka</p>
                <p className="text-xs text-slate-500">Tel: +94 47 223 9090 | Email: fundoffice@amazhospital.com</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md uppercase tracking-wider mb-2">
                Fund Office Disbursement
              </span>
              <p className="text-xs text-slate-500 font-medium">Official Payment Receipt</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {sheet.receiptNumber || `DOC-REC-${sheet.id.slice(0, 8).toUpperCase()}`}
              </p>
            </div>
          </div>

          {/* Voucher Title & Status Banner */}
          <div className="flex justify-between items-center bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</span>
              <h2 className="text-lg font-bold text-slate-800">DOCTOR PAYMENT VOUCHER</h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Status</span>
              <span className="inline-block px-3 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full">
                {sheet.status}
              </span>
            </div>
          </div>

          {/* Doctor & Clinic Session Information */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                Doctor Information
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor Name:</span>
                  <span className="font-bold text-slate-800">{sheet.doctor?.fullName || sheet.doctor?.name || "Doctor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Specialization:</span>
                  <span className="font-medium text-slate-700">{sheet.doctor?.specialty || sheet.doctor?.specialization || "Consultant"}</span>
                </div>
                {sheet.doctor?.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contact:</span>
                    <span className="text-slate-700">{sheet.doctor.phone}</span>
                  </div>
                )}
                {sheet.doctor?.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-700">{sheet.doctor.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                Session & Disbursement Details
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Clinic Date:</span>
                  <span className="font-bold text-slate-800">{formattedSheetDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Session Name:</span>
                  <span className="font-medium text-slate-700">{sheet.sessionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Disbursed Role:</span>
                  <span className="font-bold text-slate-800">{sheet.disbursedByRole || "FRONTDESK"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Date:</span>
                  <span className="font-bold text-emerald-800">{formattedPaymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-800">{sheet.paymentMethod?.replace("_", " ") || "CASH / BANK"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Ref / Voucher:</span>
                  <span className="font-mono font-bold text-slate-800">{sheet.paymentReference || "N/A"}</span>
                </div>
                {(sheet.bankDetails?.bankAccountNumber || sheet.doctor?.bankAccountNumber) && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px]">
                    <span className="text-slate-500">Bank Details:</span>
                    <span className="font-semibold text-slate-700">
                      {sheet.bankDetails?.bankName || sheet.doctor?.bankName} - {sheet.bankDetails?.bankAccountNumber || sheet.doctor?.bankAccountNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Calculation Statement Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Payment Calculation Breakdown
            </h3>
            <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 text-left font-semibold">Description</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Quantity / Breakdown</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-800">Total Patients Treated</span>
                    <p className="text-[11px] text-slate-500">Base consultations during clinic session</p>
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                    {sheet.totalPatients} Patients
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                    {sheet.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {(sheet.cashRevenue !== undefined && sheet.cardRevenue !== undefined && (sheet.cashRevenue > 0 || sheet.cardRevenue > 0)) && (
                  <>
                    <tr className="bg-emerald-50/40 text-[11px]">
                      <td className="py-1.5 px-3 text-emerald-900 font-medium">
                        💵 Cash Collections (Desk Drawer)
                      </td>
                      <td className="py-1.5 px-3 text-center text-emerald-700">
                        Doctor Cash Share: LKR {(sheet.cashDoctorShare || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold text-emerald-900">
                        LKR {(sheet.cashRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/40 text-[11px]">
                      <td className="py-1.5 px-3 text-blue-900 font-medium">
                        💳 Card / Bank Collections
                      </td>
                      <td className="py-1.5 px-3 text-center text-blue-700">
                        Doctor Bank Share: LKR {(sheet.bankDoctorShare || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold text-blue-900">
                        LKR {(sheet.cardRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}

                <tr>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-red-700">Less: Hospital Commission Amount</span>
                    <p className="text-[11px] text-slate-500">Hospital retained operational & facility charges</p>
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium text-red-600">
                    {sheet.commissionRate.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-red-600">
                    - {(sheet.hospitalCommission || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {sheet.otherAdjustments !== 0 && (
                  <tr>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-700">Other Adjustments / Deductions</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500">-</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      - {(sheet.otherAdjustments || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                <tr className="bg-emerald-50 border-t-2 border-emerald-600 text-sm">
                  <td className="py-3 px-3 font-bold text-emerald-950">
                    NET DOCTOR DISBURSEMENT AMOUNT
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-emerald-800 font-semibold">
                    {sheet.cashDisbursed || sheet.bankDisbursed
                      ? `Paid: Cash LKR ${(sheet.cashDisbursed || 0).toLocaleString()} | Bank LKR ${(sheet.bankDisbursed || 0).toLocaleString()}`
                      : "Payable to Doctor"}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-900 text-base">
                    LKR {(sheet.netDoctorPayment || sheet.doctorPayment || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Itemized Patient List (if available and less than 30 items) */}
          {sheet.patientItems && sheet.patientItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Patient Consultation Roster ({sheet.patientItems.length} Records)
              </h3>
              <table className="w-full text-[11px] border border-slate-200 rounded-md overflow-hidden">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="py-1 px-2 text-left">#</th>
                    <th className="py-1 px-2 text-left">Patient Name</th>
                    <th className="py-1 px-2 text-left">Token / Ref</th>
                    <th className="py-1 px-2 text-center">Collection</th>
                    <th className="py-1 px-2 text-right">Fee (LKR)</th>
                    <th className="py-1 px-2 text-right">Doc Share (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sheet.patientItems.slice(0, 25).map((item, idx) => {
                    const isCard = (item.collectionMethod || "CASH") !== "CASH";
                    return (
                      <tr key={item.id || idx}>
                        <td className="py-1 px-2 text-slate-400">{idx + 1}</td>
                        <td className="py-1 px-2 font-medium text-slate-800">{item.patientName}</td>
                        <td className="py-1 px-2 text-slate-500 font-mono text-[10px]">{item.tokenNumber || item.appointmentId || item.patientId || "-"}</td>
                        <td className="py-1 px-2 text-center">
                          <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded ${
                            isCard ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {item.collectionMethod || "CASH"}
                          </span>
                        </td>
                        <td className="py-1 px-2 text-right font-medium text-slate-700">
                          {item.consultationFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right text-[11px] font-semibold text-emerald-700">
                          {(item.doctorShare || (item.consultationFee * (1 - sheet.commissionRate / 100))).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  {sheet.patientItems.length > 25 && (
                    <tr>
                      <td colSpan={6} className="py-1 px-2 text-center text-slate-400 italic">
                        ... and {sheet.patientItems.length - 25} more patient records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Remarks */}
          {sheet.remarks && (
            <div className="mb-6 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">Remarks: </span>
              <span className="text-slate-700">{sheet.remarks}</span>
            </div>
          )}

          {/* Audit Verification Trail */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-[11px] text-slate-600 bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <p className="font-semibold text-slate-800">1. Verification:</p>
              <p>Officer: {sheet.verifiedBy?.name || "Fund Office Officer"}</p>
              <p>Date: {sheet.verifiedAt ? new Date(sheet.verifiedAt).toLocaleDateString() : "Pending"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">2. Approval:</p>
              <p>Approver: {sheet.approvedBy?.name || "Finance Director"}</p>
              <p>Date: {sheet.approvedAt ? new Date(sheet.approvedAt).toLocaleDateString() : "Pending"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">3. Disbursement:</p>
              <p>Disbursed By: {sheet.paidBy?.name || "Cashier / Fund Office"}</p>
              <p>Date: {sheet.paidAt ? new Date(sheet.paidAt).toLocaleDateString() : "Pending"}</p>
            </div>
          </div>

          {/* Authorized Signatures */}
          <div className="grid grid-cols-3 gap-8 pt-8 mt-4 border-t border-slate-300 text-center text-xs">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mx-4 mb-2"></div>
              <p className="font-bold text-slate-800">Fund Office Officer</p>
              <p className="text-[10px] text-slate-500">Prepared & Verified By</p>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mx-4 mb-2"></div>
              <p className="font-bold text-slate-800">Medical / Finance Director</p>
              <p className="text-[10px] text-slate-500">Authorized & Approved By</p>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mx-4 mb-2"></div>
              <p className="font-bold text-slate-800">Doctor's Signature</p>
              <p className="text-[10px] text-slate-500">Received & Acknowledged</p>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            <p>This is a computer-generated voucher issued by the AMAZ Hospital Fund Office. Debarawewa, Tissamaharama.</p>
          </div>
        </div>
      </div>
    );
  }
);

DoctorPaymentReceiptTemplate.displayName = "DoctorPaymentReceiptTemplate";
