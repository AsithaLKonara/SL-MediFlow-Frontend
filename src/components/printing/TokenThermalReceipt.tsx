import React from "react";
import Barcode from "react-barcode";
import { get10DigitBarcode } from "@/lib/barcode";

export interface ThermalTokenItem {
  id?: string;
  tokenNumber: string | number;
  department?: "OPD" | "DOCTOR" | "LAB" | "EXTRA_SERVICE" | string;
  doctorName?: string;
  roomNumber?: string | number;
  patientName?: string;
  patientAge?: string | number;
  patientPhone?: string;
  appointmentDate?: string | Date;
  refNo?: string;
  bookingReference?: string;
}

export interface TokenThermalReceiptProps {
  tokens: ThermalTokenItem | ThermalTokenItem[] | null;
  masterBarcode?: string;
  date?: string | Date;
  forceVisible?: boolean;
}

export const TokenThermalReceipt = React.forwardRef<HTMLDivElement, TokenThermalReceiptProps>(
  ({ tokens, masterBarcode, date, forceVisible = false }, ref) => {
    if (!tokens) return null;

    const tokenList: ThermalTokenItem[] = Array.isArray(tokens) ? tokens : [tokens];
    if (tokenList.length === 0) return null;

    const formattedDate = (d?: string | Date) => {
      const dt = d ? new Date(d) : date ? new Date(date) : new Date();
      return dt.toLocaleDateString([], {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };

    return (
      <div className={forceVisible ? "block" : "hidden"}>
        <div ref={ref} id="thermal-token-receipt-root" className="w-[290px] mx-auto box-border text-black font-sans leading-tight">
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              @page {
                size: 80mm auto;
                margin: 1.5mm 2mm 6mm 2mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background: #ffffff;
                margin: 0;
              }
            }
          `,
            }}
          />

          {tokenList.map((token, index) => {
            const rawTokenStr = String(token.tokenNumber || "");
            const displayToken = /[a-zA-Z]/.test(rawTokenStr)
              ? rawTokenStr
              : String(rawTokenStr.replace(/\D/g, "")).padStart(2, "0");

            const isLast = index === tokenList.length - 1;

            const barcodeVal =
              token.bookingReference ||
              token.refNo ||
              masterBarcode ||
              (token.id ? get10DigitBarcode(token.id) : null);

            const deptLabel =
              token.department === "LAB"
                ? "Laboratory Queue Token"
                : token.department === "EXTRA_SERVICE"
                ? "Extra Service Token"
                : "Doctor Consultation Token";

            const roomText = token.roomNumber
              ? String(token.roomNumber).toUpperCase().startsWith("ROOM")
                ? String(token.roomNumber).toUpperCase()
                : `ROOM ${token.roomNumber}`
              : null;

            return (
              <div
                key={token.id || index}
                className={`w-[290px] mx-auto box-border bg-white text-black px-3.5 pt-1.5 pb-6 print:w-[290px] print:px-3.5 print:pt-1 print:pb-12 ${
                  !isLast ? "border-b-2 border-dashed border-black mb-6 print:break-after-page" : ""
                }`}
              >
                {/* Header */}
                <div className="text-center mb-3">
                  <div className="flex justify-center mb-1">
                    <img
                      src="/logo.png"
                      alt="SL MediFlow Logo"
                      className="w-[170px] h-auto object-contain mx-auto print:grayscale print:contrast-150"
                    />
                  </div>
                  <p className="text-[10px] text-black font-medium">0112345678 | slmediflow.lk</p>
                  <div className="mt-1.5 border-t-2 border-b-2 border-black py-1">
                    <p className="text-xs font-bold uppercase tracking-wide">{deptLabel}</p>
                  </div>
                </div>

                {/* Token Number */}
                <div className="text-center mb-4 space-y-1">
                  <p className="text-xs uppercase font-medium text-black/80">Your Token Number</p>
                  <h2 className="text-7xl font-black tracking-tighter text-black">{displayToken}</h2>
                </div>

                {/* Room Routing Box */}
                {roomText && (
                  <div className="text-center mb-4 border-2 border-black py-2 bg-white text-black">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-black">Proceed To</p>
                    <h3 className="text-2xl font-black text-black">{roomText}</h3>
                  </div>
                )}

                {/* Patient & Doctor Details */}
                <div className="space-y-1.5 border-t-2 border-dashed border-black pt-3 text-xs">
                  {token.doctorName && (
                    <div className="flex justify-between items-start">
                      <span className="font-bold">
                        {token.department === "LAB" || token.department === "EXTRA_SERVICE"
                          ? "Service:"
                          : "Doctor:"}
                      </span>
                      <span className="text-right max-w-[170px] font-semibold break-words">
                        {token.department === "LAB" || token.department === "EXTRA_SERVICE"
                          ? token.doctorName
                          : token.doctorName.startsWith("Dr.")
                          ? token.doctorName
                          : `Dr. ${token.doctorName}`}
                      </span>
                    </div>
                  )}

                  {token.patientName && (
                    <div className="flex justify-between items-start">
                      <span className="font-bold">Patient:</span>
                      <span className="text-right max-w-[170px] truncate">
                        {token.patientName}
                        {token.patientAge ? ` (${token.patientAge}y)` : ""}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="font-bold">Date:</span>
                    <span suppressHydrationWarning>{formattedDate(token.appointmentDate)}</span>
                  </div>
                </div>

                {/* Workstation Barcode for Doctor / Lab scan */}
                <div className="mt-5 text-center border-t-2 border-black pt-3 flex flex-col items-center">
                  {barcodeVal ? (
                    <div className="mb-2 w-full flex justify-center overflow-hidden">
                      <Barcode
                        value={barcodeVal}
                        width={1.1}
                        height={38}
                        fontSize={10}
                        margin={0}
                        displayValue={true}
                      />
                    </div>
                  ) : (
                    <div className="w-3/4 h-10 border border-black mb-2 flex items-center justify-center text-[10px]">
                      No Barcode Data
                    </div>
                  )}
                  <p className="text-xs font-bold uppercase mt-0.5">Please wait for your number</p>
                  <p className="text-[9px] text-gray-600 mt-0.5">Generated by SL MediFlow System</p>
                </div>

                {/* Cutter safety feed margin */}
                <div className="h-6 print:h-12 w-full" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

TokenThermalReceipt.displayName = "TokenThermalReceipt";

