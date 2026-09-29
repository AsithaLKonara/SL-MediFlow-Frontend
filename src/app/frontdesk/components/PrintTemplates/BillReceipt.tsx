import React, { forwardRef } from 'react';

export interface BillReceiptProps {
  queueNumber: string;
  doctorName?: string;
  patientName: string;
  date: string;
  invoice: {
    id: string;
    subtotal: number;
    totalAmount: number;
    lineItems: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
}

export const BillReceipt = forwardRef<HTMLDivElement, BillReceiptProps>(
  ({ queueNumber, doctorName, patientName, date, invoice }, ref) => {
    return (
      <div ref={ref} className="w-[300px] bg-white text-black p-4 font-sans print:p-0">
        <div className="text-center mb-4">
          <img src="/logo.png" alt="AMAZ Hospital" className="w-48 mx-auto mb-2" />
          <p className="text-xs text-black">0472239090 | www.amazhospital.com</p>
          <p className="text-[10px] text-black">info@amazhospital.com</p>
          <p className="text-[10px] text-black mb-2">debarawewa, Tissamaharama</p>
          <p className="text-sm font-medium border-b-2 border-black pb-2 pt-2 uppercase">Official Receipt</p>
        </div>

        {/* Token Info */}
        <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
          <p className="text-xs uppercase text-black font-bold">Token Number</p>
          <p className="text-4xl font-black">{queueNumber}</p>
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
          <div className="space-y-2">
            {invoice.lineItems.map((item, index) => (
              <div key={index} className="text-xs">
                <div className="flex justify-between font-medium">
                  <span className="pr-2">{item.description}</span>
                  <span>Rs. {(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-gray-600">
                  {item.quantity} x Rs. {item.unitPrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-2 border-t-2 border-black">
            <div className="flex justify-between font-bold text-sm">
              <span>Total Amount</span>
              <span>Rs. {invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center border-t-2 border-black pt-4">
          <p className="text-xs italic mb-2">Please proceed to the respective department.</p>
          <p className="text-xs font-bold uppercase mt-2">Thank you!</p>
        </div>
      </div>
    );
  }
);

BillReceipt.displayName = 'BillReceipt';
