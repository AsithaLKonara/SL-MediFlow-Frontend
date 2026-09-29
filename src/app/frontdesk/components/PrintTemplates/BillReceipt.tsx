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
      <div ref={ref} className="p-8 max-w-md mx-auto bg-white text-black font-sans print:p-0 print:w-full print:max-w-full">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-1">AMAZ Hospital</h1>
          <p className="text-sm text-gray-600">123 Health Ave, Wellness City</p>
          <p className="text-sm text-gray-600">Tel: 011-2345678</p>
          <h2 className="text-xl font-bold mt-4 uppercase">Payment Receipt & Token</h2>
        </div>

        {/* Token Info */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6 text-center border-2 border-black">
          <p className="text-sm font-semibold uppercase text-gray-500 mb-1">Queue Number</p>
          <p className="text-5xl font-black">{queueNumber}</p>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-500">Patient Name</p>
            <p className="font-semibold">{patientName}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Date & Time</p>
            <p className="font-semibold">{new Date(date).toLocaleString()}</p>
          </div>
          {doctorName && (
            <div className="col-span-2">
              <p className="text-gray-500">Consultant</p>
              <p className="font-semibold">{doctorName}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-gray-500">Invoice No.</p>
            <p className="font-semibold">{invoice.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        {/* Billing Details */}
        <div className="mb-6">
          <h3 className="font-bold border-b border-black pb-2 mb-3">Billing Details</h3>
          <div className="space-y-3">
            {invoice.lineItems.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="flex-1 pr-4 break-words">{item.description}</span>
                <span className="w-8 text-right shrink-0">x{item.quantity}</span>
                <span className="w-24 text-right shrink-0">Rs. {(item.quantity * item.unitPrice).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-3 border-t-2 border-black">
            <div className="flex justify-between font-bold text-lg">
              <span>Total Amount</span>
              <span>Rs. {invoice.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>Please proceed to the respective department.</p>
          <p>Thank you for choosing AMAZ Hospital.</p>
        </div>
      </div>
    );
  }
);

BillReceipt.displayName = 'BillReceipt';
