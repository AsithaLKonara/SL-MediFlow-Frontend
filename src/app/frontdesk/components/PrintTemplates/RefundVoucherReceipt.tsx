import React from "react";
import Barcode from "react-barcode";

export interface RefundVoucherData {
  voucherNumber: string;
  tokenNumber: string;
  bookingReference?: string | null;
  patientName: string;
  patientPhone?: string | null;
  doctorName: string;
  sessionTime?: string | null;
  appointmentDate: string;
  cancellationReason: string;
  originalAmount: number;
  refundAmount: number;
  paymentMethod?: string | null;
  processedBy?: string | null;
  shiftId?: string | null;
  timestamp: string;
}

export const RefundVoucherReceipt = React.forwardRef<HTMLDivElement, { data: RefundVoucherData }>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[290px] mx-auto box-border bg-white text-black px-3.5 pt-1.5 pb-8 font-sans print:w-[290px] print:px-3.5 print:pt-1 print:pb-12 leading-tight"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page {
                size: auto;
                margin: 1.5mm 2mm 6mm 2mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `,
          }}
        />

        {/* Header */}
        <div className="text-center mb-4">
          <img src="/logo.png" alt="AMAZ Hospital" className="w-40 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-black">AMAZ HOSPITAL</p>
          <p className="text-[10px] text-black">0472239090 | amazhospital.lk</p>
          <p className="text-[10px] text-black">amazhospital88@gmail.com</p>
          <p className="text-[10px] text-black mb-1.5">Debarawewa, Tissamaharama</p>
          <div className="border-y-2 border-dashed border-black py-1 my-1">
            <p className="text-xs font-black tracking-wider uppercase">CANCELLATION & REFUND VOUCHER</p>
            <p className="text-[10px] text-black">{data.voucherNumber}</p>
          </div>
        </div>

        {/* Key Info Callout */}
        <div className="text-center mb-4 border-2 border-black py-2 bg-neutral-50">
          <p className="text-[10px] uppercase font-bold tracking-widest text-black">CANCELLED TOKEN</p>
          <h2 className="text-4xl font-black tracking-tight">{data.tokenNumber}</h2>
          <p className="text-[10px] text-black mt-0.5">{data.appointmentDate}</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-1.5 border-t border-black pt-2 text-xs">
          <div className="flex justify-between">
            <span className="font-bold">Patient:</span>
            <span className="max-w-[160px] truncate text-right">{data.patientName}</span>
          </div>
          {data.patientPhone && (
            <div className="flex justify-between">
              <span className="font-bold">Phone:</span>
              <span>{data.patientPhone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-bold">Doctor:</span>
            <span className="max-w-[160px] truncate text-right">{data.doctorName}</span>
          </div>
          {data.sessionTime && (
            <div className="flex justify-between">
              <span className="font-bold">Session:</span>
              <span>{data.sessionTime}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-bold">Reason:</span>
            <span className="max-w-[160px] text-right font-medium">{data.cancellationReason}</span>
          </div>
        </div>

        {/* Financial Settlement */}
        <div className="mt-3 border-t-2 border-black pt-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span>Original Fee:</span>
            <span>Rs. {data.originalAmount.toFixed(2)}</span>
          </div>
          {data.paymentMethod && (
            <div className="flex justify-between text-[11px] text-neutral-600">
              <span>Paid Via:</span>
              <span className="font-semibold">{data.paymentMethod}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black border-t border-dashed border-black pt-1 mt-1">
            <span>REFUNDED:</span>
            <span className="text-base">Rs. {data.refundAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Barcode & Footer */}
        <div className="mt-4 text-center border-t border-black pt-3 flex flex-col items-center">
          {data.bookingReference && (
            <div className="mb-2">
              <Barcode
                value={data.bookingReference}
                width={1.2}
                height={32}
                fontSize={10}
                margin={0}
                displayValue={true}
              />
            </div>
          )}
          <p className="text-[9px] text-neutral-500">Processed by: {data.processedBy || "Front Desk Cashier"}</p>
          <p className="text-[9px] text-neutral-500">{data.timestamp}</p>
          <div className="w-full flex justify-between mt-6 pt-2 border-t border-dashed border-neutral-400 text-[9px]">
            <span className="border-t border-neutral-600 pt-0.5 px-2">Cashier Signature</span>
            <span className="border-t border-neutral-600 pt-0.5 px-2">Patient Signature</span>
          </div>
        </div>
      </div>
    );
  }
);

RefundVoucherReceipt.displayName = "RefundVoucherReceipt";
