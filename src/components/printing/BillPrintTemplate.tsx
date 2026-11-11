import React from "react";
import Barcode from "react-barcode";
import { get10DigitBarcode } from "@/lib/barcode";

interface BillItem {
  name: string;
  qty: number;
  price: number;
  total: number;
  department?: string;
  isMedicine?: boolean;
}

interface PrintProps {
  receiptData: {
    receiptId: string;
    date: Date;
    items: BillItem[];
    subtotal: number;
    total: number;
    paymentMethod: string;
    cashierName?: string;
    receivedAmount?: number;
    change?: number;
    masterBarcode?: string;
    bookingReference?: string;
    refNo?: string;
  } | null;
}

export const BillPrintTemplate = React.forwardRef<HTMLDivElement, PrintProps>(
  ({ receiptData }, ref) => {
    if (!receiptData) return null;

    return (
      <div className="hidden">
        {/* The printable area that react-to-print targets */}
        <div ref={ref} className="w-[290px] mx-auto box-border bg-white text-black px-3.5 pt-1.5 pb-8 font-mono text-sm print:w-[290px] print:px-3.5 print:pt-1 print:pb-12 leading-tight">
          <style dangerouslySetInnerHTML={{ __html: `
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
          `}} />
          <div className="text-center mb-4 border-b-2 border-black pb-2">
            {/* Standard HTML img tags are safer for react-to-print than Next/Image */}
            <img src="/logo.png" alt="SL MediFlow" className="w-44 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest mt-1">Pharmacy / POS</p>
            <p className="text-xs mt-1">0112345678 | slmediflow.lk</p>
            <p className="text-[10px]">contact@slmediflow.com</p>
            <p className="text-[10px]">No. 123, Healthcare Blvd, Colombo 07</p>
          </div>

          <div className="mb-4 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">Receipt #:</span>
              <span>{receiptData.receiptId.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Date:</span>
              <span>{receiptData.date.toLocaleString()}</span>
            </div>
            {receiptData.cashierName && (
              <div className="flex justify-between mt-1">
                <span className="font-bold">Cashier:</span>
                <span>{receiptData.cashierName}</span>
              </div>
            )}
          </div>

          {(() => {
            const isMedicineItem = (item: BillItem) => {
              if (item.isMedicine !== undefined) return Boolean(item.isMedicine);
              if (item.department === "PHARMACY") return true;
              if (item.department && item.department !== "PHARMACY") return false;
              const desc = item.name.toLowerCase();
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

            const medItems = receiptData.items.filter(isMedicineItem);
            const hasMedicines = medItems.length > 0;
            const totalMedicines = medItems.reduce((acc, item) => acc + (item.total || (item.price * item.qty) || 0), 0);

            return (
              <>
                <div className="border-t-2 border-black pt-2 mb-2">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-dashed border-black">
                        <th className="py-1 w-3/4 text-left font-bold">Item</th>
                        <th className="py-1 w-1/4 text-right font-bold">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptData.items.map((item, idx) => (
                        <tr key={idx} className="align-top border-b border-dotted border-black/20 last:border-b-0">
                          <td className="py-1 pr-2 break-words leading-tight">{item.name}</td>
                          <td className="py-1 text-right font-semibold">{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t-2 border-black pt-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>LKR {(receiptData.subtotal ?? receiptData.total ?? 0).toFixed(2)}</span>
                  </div>
                  {hasMedicines && (
                    <div className="flex justify-between text-xs font-semibold text-gray-800">
                      <span>Medicines Total:</span>
                      <span>LKR {totalMedicines.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base mt-1">
                    <span>Total:</span>
                    <span>LKR {(receiptData.total ?? 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between mt-3 text-xs">
                    <span>Pay Method:</span>
                    <span>{receiptData.paymentMethod}</span>
                  </div>
                  
                  {receiptData.receivedAmount !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span>Received:</span>
                      <span>LKR {receiptData.receivedAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {receiptData.change !== undefined && (
                    <div className="flex justify-between font-bold text-xs">
                      <span>Change:</span>
                      <span>LKR {receiptData.change.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          <div className="text-center mt-6 pt-2 border-t border-dashed border-black flex flex-col items-center">
            {(() => {
              const masterBarcode = 
                receiptData.masterBarcode || 
                receiptData.bookingReference || 
                receiptData.refNo || 
                (receiptData.receiptId ? get10DigitBarcode(receiptData.receiptId) : null);

              if (!masterBarcode) return null;

              return (
                <div className="mb-2 w-full flex flex-col items-center justify-center overflow-hidden">
                  <Barcode value={masterBarcode} width={1.2} height={45} fontSize={11} margin={0} displayValue={true} />
                </div>
              );
            })()}
            <p className="text-xs font-bold">Thank you for your business!</p>
            <p className="text-[10px] mt-1">Wishing you good health.</p>
          </div>
          <div className="h-8 print:h-12 w-full" aria-hidden="true" />
        </div>
      </div>
    );
  }
);

BillPrintTemplate.displayName = "BillPrintTemplate";
