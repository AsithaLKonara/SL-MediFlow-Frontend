import React from "react";
import Barcode from "react-barcode";

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
  commissionType?: string;
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

    const receiptCode = sheet.receiptNumber || `DOC-REC-${sheet.id.slice(0, 8).toUpperCase()}`;

    const formattedPaymentDate = sheet.paidAt
      ? new Date(sheet.paidAt).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        })
      : new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });

    const formattedSheetDate = new Date(sheet.date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const netPayment = sheet.netDoctorPayment !== undefined && sheet.netDoctorPayment !== null
      ? sheet.netDoctorPayment
      : (sheet.doctorPayment || 0);

    return (
      <div className="hidden">
        <div
          ref={ref}
          data-testid="doctor-payment-receipt-80mm"
          className="w-[290px] mx-auto box-border bg-white text-black px-2 pt-1 pb-8 font-sans text-xs leading-tight print:w-[290px] print:px-2 print:pt-1 print:pb-10"
          style={{ boxSizing: "border-box" }}
        >
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: auto;
                  margin: 1.5mm 2mm 6mm 2mm;
                }
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `
          }} />

          {/* Hospital Header */}
          <div className="text-center mb-2 pb-2 border-b-2 border-black">
            <img src="/logo.png" alt="SL MediFlow" className="w-36 mx-auto mb-1 object-contain" />
            <h1 className="text-sm font-black tracking-tight uppercase">SL MEDIFLOW</h1>
            <p className="text-[10px] text-black">No. 123, Healthcare Blvd, Colombo 07</p>
            <p className="text-[10px] text-black">Tel: 0112345678 | slmediflow.lk</p>

            <div className="mt-1.5 border border-black py-0.5 px-2 inline-block bg-black text-white font-bold text-[11px] uppercase tracking-wider">
              DOCTOR PAYMENT VOUCHER
            </div>
            <div className="text-[10px] mt-1 font-semibold">
              STATUS: <span className="uppercase">{sheet.status}</span>
            </div>
          </div>

          {/* Voucher Info */}
          <div className="border-b border-dashed border-black pb-2 mb-2 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="font-bold">Voucher #:</span>
              <span className="font-mono font-bold">{receiptCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Date:</span>
              <span>{formattedPaymentDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Doctor:</span>
              <span className="font-bold text-right truncate max-w-[170px]">
                {sheet.doctor?.fullName || sheet.doctor?.name || "Doctor"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-700">Specialty:</span>
              <span className="text-right">
                {sheet.doctor?.specialty || sheet.doctor?.specialization || "Consultant"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-700">Clinic Date:</span>
              <span>{formattedSheetDate}</span>
            </div>
            {sheet.sessionName && (
              <div className="flex justify-between">
                <span className="text-neutral-700">Session:</span>
                <span>{sheet.sessionName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-700">Method:</span>
              <span className="font-semibold uppercase">
                {sheet.paymentMethod?.replace("_", " ") || (sheet.cashDisbursed ? "CASH DRAWER" : "BANK TRANSFER")}
              </span>
            </div>
            {sheet.disbursedByRole && (
              <div className="flex justify-between">
                <span className="text-neutral-700">Disbursed By:</span>
                <span className="font-semibold uppercase">{sheet.disbursedByRole}</span>
              </div>
            )}
            {sheet.paymentReference && (
              <div className="flex justify-between">
                <span className="text-neutral-700">Ref / Slip:</span>
                <span className="font-mono">{sheet.paymentReference}</span>
              </div>
            )}
            {(sheet.bankDetails?.bankAccountNumber || sheet.doctor?.bankAccountNumber) && (
              <div className="flex justify-between text-[10px] pt-0.5 border-t border-dotted border-neutral-400">
                <span className="text-neutral-700">Bank:</span>
                <span className="text-right truncate max-w-[180px]">
                  {sheet.bankDetails?.bankName || sheet.doctor?.bankName} - {sheet.bankDetails?.bankAccountNumber || sheet.doctor?.bankAccountNumber}
                </span>
              </div>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="border-b border-dashed border-black pb-2 mb-2 text-[11px] space-y-1">
            <div className="font-bold uppercase tracking-wider text-[10px] pb-0.5 border-b border-neutral-300">
              Financial Breakdown
            </div>
            <div className="flex justify-between">
              <span>Consultations:</span>
              <span className="font-bold">{sheet.totalPatients} Patients</span>
            </div>
            <div className="flex justify-between">
              <span>Gross Fee Revenue:</span>
              <span className="font-bold">
                Rs. {sheet.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {(sheet.cashRevenue !== undefined && sheet.cardRevenue !== undefined && (sheet.cashRevenue > 0 || sheet.cardRevenue > 0)) && (
              <div className="bg-neutral-50 p-1 rounded text-[10px] space-y-0.5 my-1 border border-neutral-200">
                <div className="flex justify-between">
                  <span>- Cash (Desk Drawer):</span>
                  <span>Rs. {(sheet.cashRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>- Card / Bank:</span>
                  <span>Rs. {(sheet.cardRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-neutral-800">
              <span>Less: Hospital Share ({sheet.commissionType === "FLAT" ? `Rs. ${sheet.commissionRate} flat` : `${sheet.commissionRate.toFixed(1)}%`}):</span>
              <span className="font-semibold">
                - Rs. {(sheet.hospitalCommission || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {sheet.otherAdjustments !== 0 && (
              <div className="flex justify-between text-neutral-800">
                <span>Other Adjustments:</span>
                <span>
                  - Rs. {(sheet.otherAdjustments || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Net Doctor Disbursement Box */}
          <div className="border-2 border-black p-2 mb-2.5 text-center bg-neutral-50">
            <span className="text-[10px] uppercase font-bold text-neutral-700 block">
              Net Doctor Disbursement
            </span>
            <span className="text-xl font-black text-black">
              Rs. {netPayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            {(sheet.cashDisbursed || sheet.bankDisbursed) ? (
              <div className="text-[9px] text-neutral-600 mt-0.5">
                Paid: Cash Rs. {(sheet.cashDisbursed || 0).toLocaleString()} | Bank Rs. {(sheet.bankDisbursed || 0).toLocaleString()}
              </div>
            ) : null}
          </div>

          {/* Itemized Patient Consultation List */}
          {sheet.patientItems && sheet.patientItems.length > 0 && (
            <div className="border-b border-dashed border-black pb-2 mb-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase pb-1 mb-1 border-b border-neutral-300">
                <span>Consultation Roster</span>
                <span>({sheet.patientItems.length})</span>
              </div>
              <table className="w-full text-[10px] leading-tight">
                <thead>
                  <tr className="border-b border-neutral-300 text-neutral-700">
                    <th className="text-left py-0.5 w-6">#</th>
                    <th className="text-left py-0.5">Patient / Token</th>
                    <th className="text-right py-0.5">Doc Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-neutral-200">
                  {sheet.patientItems.slice(0, 30).map((item, idx) => {
                    const itemDocShare = item.doctorShare !== undefined && item.doctorShare !== null
                      ? item.doctorShare
                      : (sheet.commissionType === "FLAT"
                          ? Math.max(0, item.consultationFee - sheet.commissionRate)
                          : item.consultationFee * (1 - sheet.commissionRate / 100));

                    return (
                      <tr key={item.id || idx}>
                        <td className="py-1 text-neutral-500">{idx + 1}</td>
                        <td className="py-1 pr-1">
                          <div className="font-semibold truncate max-w-[150px]">{item.patientName}</div>
                          <div className="text-[9px] text-neutral-500 font-mono">
                            {item.tokenNumber ? `T-${item.tokenNumber}` : (item.appointmentId?.slice(0, 8) || "")} 
                            {" "}({item.collectionMethod || "CASH"})
                          </div>
                        </td>
                        <td className="py-1 text-right font-bold">
                          {itemDocShare.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sheet.patientItems.length > 30 && (
                <p className="text-[9px] text-center text-neutral-500 italic mt-1">
                  ... +{sheet.patientItems.length - 30} more consultations
                </p>
              )}
            </div>
          )}

          {/* Remarks */}
          {sheet.remarks && (
            <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px]">
              <span className="font-bold">Remarks: </span>
              <span className="italic">{sheet.remarks}</span>
            </div>
          )}

          {/* Barcode */}
          <div className="flex flex-col items-center justify-center my-2">
            <Barcode
              value={receiptCode}
              width={1.2}
              height={35}
              fontSize={10}
              margin={2}
              displayValue={true}
            />
          </div>

          {/* Dual Signatures */}
          <div className="pt-3 pb-1 border-t border-dashed border-black">
            <div className="flex justify-between text-center text-[10px] pt-4">
              <div className="w-[125px]">
                <div className="border-b border-black mb-1"></div>
                <p className="font-bold">Disbursed By</p>
                <p className="text-[8px] text-neutral-600">Fund Office / Cashier</p>
              </div>
              <div className="w-[125px]">
                <div className="border-b border-black mb-1"></div>
                <p className="font-bold">Doctor Acknowledged</p>
                <p className="text-[8px] text-neutral-600">Received & Confirmed</p>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-3 text-center text-[9px] text-neutral-500 border-t border-neutral-300 pt-1.5 leading-normal">
            <p>Computer-generated official disbursement voucher.</p>
            <p>SL MediFlow Accounts & Finance Office, Colombo 07.</p>
          </div>
        </div>
      </div>
    );
  }
);

DoctorPaymentReceiptTemplate.displayName = "DoctorPaymentReceiptTemplate";
