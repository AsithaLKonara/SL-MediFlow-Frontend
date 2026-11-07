import React from "react";
import Barcode from "react-barcode";
import { get10DigitBarcode } from "@/lib/barcode";

export interface DotMatrixBillItem {
  id?: string;
  name?: string;
  description?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  unitPrice?: number;
  total?: number;
  department?: string;
  isMedicine?: boolean;
}

export interface DotMatrixReceiptData {
  receiptId: string;
  invoiceNo?: string;
  masterBarcode?: string;
  bookingReference?: string;
  refNo?: string;
  date: Date | string;
  patientName?: string;
  patientAge?: string | number;
  patientPhone?: string;
  doctorName?: string;
  cashierName?: string;
  items: DotMatrixBillItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  receivedAmount?: number;
  change?: number;
}

export interface DotMatrixBillReceiptProps {
  receiptData: DotMatrixReceiptData | null;
  cashierName?: string;
  forceVisible?: boolean;
}

export const DotMatrixBillReceipt = React.forwardRef<HTMLDivElement, DotMatrixBillReceiptProps>(
  ({ receiptData, cashierName, forceVisible = false }, ref) => {
    if (!receiptData) return null;

    const invoiceNumber =
      receiptData.invoiceNo ||
      (receiptData.receiptId
        ? receiptData.receiptId.replace(/^inv-/, "").substring(0, 8).toUpperCase()
        : "N/A");

    const effectiveCashier = receiptData.cashierName || cashierName || "Front Desk";
    const formattedDate = new Date(receiptData.date).toLocaleString([], {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isMedicineItem = (item: DotMatrixBillItem) => {
      if (item.isMedicine !== undefined) return Boolean(item.isMedicine);
      if (item.department === "PHARMACY") return true;
      if (item.department && item.department !== "PHARMACY") return false;
      const desc = (item.name || item.description || "").toLowerCase();
      if (
        desc.includes("consultation") ||
        desc.includes("dr.") ||
        desc.includes("doctor") ||
        desc.includes("test") ||
        desc.includes("lab") ||
        desc.includes("service") ||
        desc.includes("fee") ||
        desc.includes("certificate")
      ) {
        return false;
      }
      return true;
    };

    const medItems = (receiptData.items || []).filter(isMedicineItem);
    const hasMedicines = medItems.length > 0;
    const totalMedicines = medItems.reduce(
      (acc, item) =>
        acc +
        (item.total ||
          (item.qty || item.quantity || 1) * (item.price || item.unitPrice || 0) ||
          0),
      0
    );

    const masterBarcode =
      receiptData.bookingReference ||
      receiptData.masterBarcode ||
      receiptData.refNo ||
      (receiptData.receiptId ? get10DigitBarcode(receiptData.receiptId) : null);

    return (
      <div className={forceVisible ? "block h-full" : "hidden"}>
        {/*
          140mm x 140mm Dot Matrix Form Box.
          Total size constrained to 132mm x 132mm to safely fit within 140mm x 140mm paper
          allowing 4mm page margins without triggering unwanted Form-Feed (FF).
        */}
        <div
          ref={ref}
          id="dot-matrix-bill-receipt"
          className="w-[132mm] h-[132mm] max-h-[132mm] mx-auto box-border bg-white text-black p-[3mm] font-mono text-[11px] leading-tight flex flex-col justify-between overflow-hidden print:w-[132mm] print:h-[132mm] print:max-h-[132mm] print:p-[3mm]"
          style={{ boxSizing: "border-box" }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
            @media print {
              @page {
                size: 140mm 140mm;
                margin: 4mm 4mm 4mm 4mm;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
                padding: 0;
                background: #ffffff;
              }
            }
          `,
            }}
          />

          {/* Top Section: Header & Metadata */}
          <div>
            {/* Hospital Header */}
            <div className="text-center border-b-2 border-black pb-1 mb-1">
              <h1 className="text-sm font-black tracking-wider uppercase">AMAZ HOSPITAL</h1>
              <p className="text-[10px] font-semibold">Debarawewa, Tissamaharama | 0472239090</p>
              <div className="flex justify-between items-center text-[9px] mt-0.5 border-t border-dotted border-black/50 pt-0.5">
                <span className="font-bold tracking-widest uppercase">OFFICIAL BILL RECEIPT</span>
                <span>amazhospital.lk</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-x-2 text-[10px] border-b border-black/60 pb-1 mb-1">
              <div className="space-y-0.5">
                <div className="flex">
                  <span className="font-bold w-14">Bill #:</span>
                  <span className="font-bold">{invoiceNumber}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-14">Date:</span>
                  <span suppressHydrationWarning>{formattedDate}</span>
                </div>
                <div className="flex">
                  <span className="font-bold w-14">Cashier:</span>
                  <span className="truncate max-w-[120px]">{effectiveCashier}</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex">
                  <span className="font-bold w-14">Patient:</span>
                  <span className="font-semibold truncate max-w-[120px]">
                    {receiptData.patientName || "Walk-in Patient"}
                  </span>
                </div>
                {receiptData.doctorName && (
                  <div className="flex">
                    <span className="font-bold w-14">Doctor:</span>
                    <span className="truncate max-w-[120px]">
                      {receiptData.doctorName.startsWith("Dr.")
                        ? receiptData.doctorName
                        : `Dr. ${receiptData.doctorName}`}
                    </span>
                  </div>
                )}
                <div className="flex">
                  <span className="font-bold w-14">Pay Mode:</span>
                  <span className="font-bold uppercase">{receiptData.paymentMethod || "CASH"}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="w-full">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-black font-bold text-left">
                    <th className="py-0.5 w-[50%]">Item Description</th>
                    <th className="py-0.5 text-center w-[12%]">Qty</th>
                    <th className="py-0.5 text-right w-[18%]">Price</th>
                    <th className="py-0.5 text-right w-[20%]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(receiptData.items || []).slice(0, 6).map((item, idx) => {
                    const desc = item.name || item.description || "Service/Item";
                    const qty = item.qty ?? item.quantity ?? 1;
                    const price = item.price ?? item.unitPrice ?? 0;
                    const lineTotal = item.total ?? price * qty;

                    return (
                      <tr
                        key={item.id || idx}
                        className="align-top border-b border-dotted border-black/30"
                      >
                        <td className="py-0.5 pr-1 truncate max-w-[160px]">{desc}</td>
                        <td className="py-0.5 text-center font-semibold">{qty}</td>
                        <td className="py-0.5 text-right">{price.toFixed(2)}</td>
                        <td className="py-0.5 text-right font-semibold">{lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* If more than 6 items exist, summarize remaining to prevent page overflow */}
                  {(receiptData.items || []).length > 6 && (
                    <tr className="border-b border-dotted border-black/30 italic text-[9px]">
                      <td colSpan={4} className="py-0.5 text-center">
                        + {(receiptData.items || []).length - 6} additional item(s) (see system record)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Section: Totals, Barcode & Footer */}
          <div className="border-t-2 border-black pt-1">
            <div className="grid grid-cols-2 gap-2 text-[10px] mb-1">
              {/* Left Column: Medicine Breakdown & Tender details */}
              <div className="space-y-0.5">
                {hasMedicines && (
                  <div className="flex justify-between text-[9px] text-gray-700">
                    <span>Medicines Total:</span>
                    <span>LKR {totalMedicines.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.receivedAmount !== undefined && receiptData.total > 0 && (
                  <div className="flex justify-between text-[9px]">
                    <span>Tendered:</span>
                    <span>LKR {receiptData.receivedAmount.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.change !== undefined && receiptData.total > 0 && (
                  <div className="flex justify-between text-[9px] font-bold">
                    <span>Change:</span>
                    <span>LKR {receiptData.change.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Subtotal, Discount & Grand Total */}
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>LKR {(receiptData.subtotal ?? receiptData.total ?? 0).toFixed(2)}</span>
                </div>
                {receiptData.discount !== undefined && receiptData.discount > 0 && (
                  <div className="flex justify-between font-semibold">
                    <span>Discount:</span>
                    <span>- LKR {receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs pt-0.5 border-t border-black">
                  <span>NET TOTAL:</span>
                  <span>LKR {(receiptData.total ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Barcode & Footer Greeting */}
            <div className="text-center pt-1 border-t border-dotted border-black/60 flex flex-col items-center">
              {masterBarcode && (
                <div className="w-full flex justify-center mb-0.5 overflow-hidden">
                  <Barcode
                    value={masterBarcode}
                    width={1.0}
                    height={22}
                    fontSize={8}
                    margin={0}
                    displayValue={true}
                  />
                </div>
              )}
              <p className="text-[9px] font-bold tracking-tight uppercase">
                Thank you! Wishing you good health.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DotMatrixBillReceipt.displayName = "DotMatrixBillReceipt";
