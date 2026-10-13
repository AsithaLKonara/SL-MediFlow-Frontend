import React from "react";
import Barcode from "react-barcode";
import { get10DigitBarcode } from "@/lib/barcode";

interface MergedReceiptTemplateProps {
  receiptData: any;
  tokens?: any[];
  cashierName?: string;
}

export const MergedReceiptTemplate = React.forwardRef<HTMLDivElement, MergedReceiptTemplateProps>(
  ({ receiptData, tokens, cashierName }, ref) => {
    return (
      <div className="hidden">
        <div ref={ref} className="w-[300px] p-2 bg-white text-black font-mono text-sm leading-tight">
          
          {/* Header */}
          <div className="text-center mb-4 border-b-2 border-black pb-2">
            <img src="/logo.png" alt="AMAZ Hospital" className="w-48 mx-auto mb-2 grayscale brightness-0" />
            <p className="text-xs font-bold uppercase tracking-widest mt-1">Pharmacy / POS</p>
            <p className="text-xs mt-1">0472239090 | www.amazhospital.com</p>
            <p className="text-[10px]">info@amazhospital.com</p>
            <p className="text-[10px]">debarawewa, Tissamaharama</p>
            {cashierName && (
              <p className="text-[10px] mt-2 font-semibold border-t border-dotted border-black/50 pt-1 inline-block">
                Cashier: {cashierName}
              </p>
            )}
          </div>

          {/* Token Section */}
          {tokens && tokens.length > 0 && tokens.map((tokenData, index) => (
            <div key={tokenData.id || index} className="mb-4 text-center border-b border-dashed border-black pb-4">
              <p className="text-xs font-bold uppercase mb-1">
                {tokenData.department === "LAB" ? "Lab Queue Token" : tokenData.department === "EXTRA_SERVICE" ? "Service Token" : "Queue Token"}
              </p>
              <h1 className="text-5xl font-bold mb-2">
                {String(tokenData.tokenNumber).padStart(2, '0')}
              </h1>
              <p className="text-sm font-semibold">{tokenData.patientName || "Walk-in Patient"}</p>
              {tokenData.doctorName && (
                <p className="text-xs mt-1">
                  {tokenData.department === "LAB" || tokenData.department === "EXTRA_SERVICE"
                    ? tokenData.doctorName 
                    : (tokenData.doctorName.startsWith("Dr.") ? tokenData.doctorName : `Dr. ${tokenData.doctorName}`)}
                </p>
              )}
              {tokenData.roomNumber && (
                <div className="mt-3">
                  <p className="text-xl font-black border-2 border-black inline-block px-4 py-1 uppercase tracking-widest bg-black text-white">
                    {String(tokenData.roomNumber).toUpperCase().startsWith('ROOM') 
                      ? tokenData.roomNumber 
                      : `ROOM ${tokenData.roomNumber}`}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Invoice Section */}
          {receiptData && receiptData.items && receiptData.items.length > 0 && (
            <>
              <div className="mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold">Receipt #:</span>
                  <span>{receiptData.receiptId.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Date:</span>
                  <span>{new Date(receiptData.date).toLocaleString()}</span>
                </div>
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
                    {receiptData.items.map((item: any, idx: number) => (
                      <React.Fragment key={idx}>
                        <tr className="align-top">
                          <td className="pt-1 pr-1 truncate max-w-[140px]">{item.name}</td>
                          <td className="pt-1 text-center">{item.qty}</td>
                          <td className="pt-1 text-right">{(item.total || item.price * item.qty).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="pb-1 text-[10px] text-gray-600">
                            {item.qty} x Rs. {item.price.toFixed(2)}
                          </td>
                        </tr>
                      </React.Fragment>
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
                
                {receiptData.receivedAmount !== undefined && receiptData.total > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Received:</span>
                    <span>LKR {receiptData.receivedAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {receiptData.change !== undefined && receiptData.total > 0 && (
                  <div className="flex justify-between font-bold text-xs">
                    <span>Change:</span>
                    <span>LKR {receiptData.change.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="text-center mt-6 pt-2 border-t border-dashed border-black flex flex-col items-center">
            {((tokens && tokens.length > 0 && (tokens[0].refNo || tokens[0].id)) || receiptData?.receiptId) && (
              <div className="mb-2 w-full flex justify-center overflow-hidden">
                <Barcode 
                  value={tokens?.[0]?.refNo || (tokens?.[0]?.id ? get10DigitBarcode(tokens[0].id) : get10DigitBarcode(receiptData?.receiptId))} 
                  width={1} 
                  height={40} 
                  fontSize={10} 
                  margin={0} 
                  displayValue={true} 
                />
              </div>
            )}
            <p className="text-xs font-bold">Thank you for your business!</p>
            <p className="text-[10px] mt-1">Wishing you good health.</p>
          </div>
        </div>
      </div>
    );
  }
);
MergedReceiptTemplate.displayName = "MergedReceiptTemplate";
