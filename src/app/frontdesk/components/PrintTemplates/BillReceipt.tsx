import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';

export interface BillReceiptProps {
  queueNumber: string;
  doctorName?: string;
  roomNumber?: string;
  patientName: string;
  date: string;
  invoice: {
    id: string;
    subtotal: number;
    discountAmount?: number;
    totalAmount: number;
    lineItems: Array<{
      id?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total?: number;
      department?: string;
      isMedicine?: boolean;
    }>;
  };
}

export const BillReceipt = forwardRef<HTMLDivElement, BillReceiptProps>(
  ({ queueNumber, doctorName, roomNumber, patientName, date, invoice }, ref) => {
    return (
      <div ref={ref} className="w-[290px] mx-auto box-border bg-white text-black px-3.5 pt-1.5 pb-8 font-sans print:w-[290px] print:px-3.5 print:pt-1 print:pb-12 leading-tight">
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
        <div className="text-center mb-4">
          <img src="/logo.png" alt="SL MediFlow" className="w-44 mx-auto mb-2" />
          <p className="text-xs text-black">0112345678 | slmediflow.lk</p>
          <p className="text-[10px] text-black">contact@slmediflow.com</p>
          <p className="text-[10px] text-black mb-2">No. 123, Healthcare Blvd, Colombo 07</p>
          <p className="text-sm font-medium border-b-2 border-black pb-2 pt-2 uppercase">Official Receipt</p>
        </div>

        {/* Token Info */}
        <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
          <p className="text-xs uppercase text-black font-bold">Token Number</p>
          <p className="text-4xl font-black">{queueNumber}</p>
          {roomNumber && (
            <div className="mt-2 border-2 border-black py-1 bg-white text-black">
              <p className="text-[10px] uppercase font-bold tracking-widest text-black">Proceed To</p>
              <h3 className="text-xl font-black text-black">ROOM {roomNumber}</h3>
            </div>
          )}
        </div>

        {/* Patient Info */}
        <div className="space-y-1 mb-4 text-sm border-b-2 border-dashed border-black pb-4">
          <div className="flex justify-between">
            <span className="font-bold">Patient:</span>
            <span>{patientName}</span>
          </div>
          {doctorName && (
            <div className="flex justify-between">
              <span className="font-bold">Doctor:</span>
              <span>{doctorName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-bold">Invoice:</span>
            <span>{invoice.id.split('-')[0].toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span suppressHydrationWarning>{new Date(date).toLocaleString()}</span>
          </div>
        </div>

        {/* Billing Details */}
        <div className="mb-8">
          <h3 className="font-bold text-sm mb-2 underline">Billing Items</h3>
          {(() => {
            const isMedicineItem = (item: any) => {
              if (item.isMedicine !== undefined) return Boolean(item.isMedicine);
              if (item.department === "PHARMACY") return true;
              if (item.department && item.department !== "PHARMACY") return false;
              const desc = (item.description || item.name || "").toLowerCase();
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

            const medItems = invoice.lineItems.filter(isMedicineItem);
            const hasMedicines = medItems.length > 0;
            const totalMedicines = medItems.reduce((acc, item) => acc + (item.total || (item.quantity * item.unitPrice) || 0), 0);

            return (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between border-b border-dashed border-black pb-1 font-bold text-xs">
                    <span className="w-3/4 text-left">Item</span>
                    <span className="w-1/4 text-right">Qty</span>
                  </div>
                  {invoice.lineItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs py-0.5 border-b border-dotted border-black/20 last:border-b-0">
                      <span className="pr-2 break-words leading-tight w-3/4">{item.description}</span>
                      <span className="font-semibold text-right w-1/4">{item.quantity}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-2 border-t-2 border-black space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Subtotal:</span>
                    <span>LKR {(invoice.subtotal ?? invoice.totalAmount ?? 0).toFixed(2)}</span>
                  </div>
                  {hasMedicines && (
                    <div className="flex justify-between text-xs font-semibold text-gray-800">
                      <span>Medicines Total:</span>
                      <span>LKR {totalMedicines.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.discountAmount !== undefined && invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Discount:</span>
                      <span>- LKR {invoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-black">
                    <span>Total:</span>
                    <span>LKR {(invoice.totalAmount ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        <div className="mt-12 text-center border-t-2 border-black pt-4 flex flex-col items-center">
          <div className="mb-2 w-full flex justify-center overflow-hidden">
            <Barcode value={invoice.id} width={1} height={40} fontSize={10} margin={0} displayValue={false} />
          </div>
          <p className="text-xs italic mb-2">Please proceed to the respective department.</p>
          <p className="text-xs font-bold uppercase mt-2">Thank you!</p>
        </div>
        <div className="h-8 print:h-12 w-full" aria-hidden="true" />
      </div>
    );
  }
);

BillReceipt.displayName = 'BillReceipt';
