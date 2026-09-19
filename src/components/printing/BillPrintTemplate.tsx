import React from "react";

interface BillItem {
  name: string;
  qty: number;
  price: number;
  total: number;
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
  } | null;
}

export const BillPrintTemplate = React.forwardRef<HTMLDivElement, PrintProps>(
  ({ receiptData }, ref) => {
    if (!receiptData) return null;

    return (
      <div className="hidden">
        {/* The printable area that react-to-print targets */}
        <div ref={ref} className="w-[300px] p-2 bg-white text-black font-mono text-sm leading-tight">
          <div className="text-center mb-4 border-b-2 border-black pb-2">
            {/* Standard HTML img tags are safer for react-to-print than Next/Image */}
            <img src="/logo.png" alt="AMAZ Hospital" className="w-48 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest mt-1">Pharmacy / POS</p>
            <p className="text-xs mt-1">0472239090 | www.amazhospital.com</p>
            <p className="text-[10px]">info@amazhospital.com</p>
            <p className="text-[10px]">debarawewa, Tissamaharama</p>
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

          <div className="border-t-2 border-black pt-2 mb-2">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-dashed border-black">
                  <th className="py-1 w-1/2">Item</th>
                  <th className="py-1 w-1/4 text-center">Qty</th>
                  <th className="py-1 w-1/4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {receiptData.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1 pr-1 truncate max-w-[140px]">{item.name}</td>
                    <td className="py-1 text-center">{item.qty}</td>
                    <td className="py-1 text-right">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t-2 border-black pt-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>LKR {receiptData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base mt-1">
              <span>Total:</span>
              <span>LKR {receiptData.total.toFixed(2)}</span>
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

          <div className="text-center mt-6 pt-2 border-t border-dashed border-black">
            <p className="text-xs font-bold">Thank you for your business!</p>
            <p className="text-[10px] mt-1">Wishing you good health.</p>
          </div>
        </div>
      </div>
    );
  }
);

BillPrintTemplate.displayName = "BillPrintTemplate";
