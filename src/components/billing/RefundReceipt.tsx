import React, { forwardRef } from 'react';
import Barcode from 'react-barcode';

export interface RefundReceiptProps {
  refund: {
    id: string;
    refundNumber?: string;
    amount: number;
    reason?: string;
    refundMethod?: string;
    createdAt?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    patientName?: string;
    patientPhone?: string;
    processedBy?: string;
  };
}

export const RefundReceipt = forwardRef<HTMLDivElement, RefundReceiptProps>(
  ({ refund }, ref) => {
    const formattedDate = refund.createdAt 
      ? new Date(refund.createdAt).toLocaleString() 
      : new Date().toLocaleString();

    const voucherId = refund.refundNumber || refund.id.substring(0, 8).toUpperCase();

    return (
      <div 
        ref={ref} 
        className="w-[290px] mx-auto box-border bg-white text-black px-3.5 pt-2 pb-8 font-sans print:w-[290px] print:px-3.5 print:pt-1 print:pb-12 leading-tight"
      >
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

        <div className="text-center mb-3">
          <img src="/logo.png" alt="AMAZ Hospital" className="w-40 mx-auto mb-1" />
          <p className="text-[11px] text-black">0472239090 | www.amazhospital.com</p>
          <p className="text-[10px] text-black">Debarawewa, Tissamaharama</p>
          <div className="mt-2 border-2 border-black py-1 bg-white text-black">
            <p className="text-xs font-black uppercase tracking-wider">OFFICIAL REFUND VOUCHER</p>
          </div>
        </div>

        <div className="border-b border-dashed border-black pb-2 mb-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-bold">Voucher #:</span>
            <span className="font-mono">{voucherId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span>{formattedDate}</span>
          </div>
          {refund.invoiceId && (
            <div className="flex justify-between">
              <span className="font-bold">Original Invoice:</span>
              <span className="font-mono">#{refund.invoiceNumber || refund.invoiceId.substring(0, 8).toUpperCase()}</span>
            </div>
          )}
          {refund.patientName && (
            <div className="flex justify-between">
              <span className="font-bold">Patient:</span>
              <span className="font-semibold">{refund.patientName}</span>
            </div>
          )}
          {refund.patientPhone && (
            <div className="flex justify-between">
              <span className="font-bold">Phone:</span>
              <span>{refund.patientPhone}</span>
            </div>
          )}
          {refund.refundMethod && (
            <div className="flex justify-between">
              <span className="font-bold">Refund Method:</span>
              <span className="uppercase">{refund.refundMethod}</span>
            </div>
          )}
        </div>

        {refund.reason && (
          <div className="border-b border-dashed border-black pb-2 mb-3 text-xs">
            <span className="font-bold block mb-0.5">Reason for Refund:</span>
            <p className="text-gray-800 italic">{refund.reason}</p>
          </div>
        )}

        <div className="border-2 border-black p-3 mb-4 text-center bg-gray-50">
          <span className="text-xs uppercase font-bold text-gray-700 block">Total Refund Amount</span>
          <span className="text-2xl font-black text-black">
            LKR {Number(refund.amount).toFixed(2)}
          </span>
        </div>

        <div className="mt-6 pt-2 text-[11px] space-y-6">
          <div className="flex justify-between items-end pt-4">
            <div className="text-center w-32 border-t border-black pt-1">
              <p className="font-medium text-[10px]">Authorized Cashier</p>
              {refund.processedBy && (
                <p className="text-[9px] text-gray-600 mt-0.5">{refund.processedBy}</p>
              )}
            </div>
            <div className="text-center w-32 border-t border-black pt-1">
              <p className="font-medium text-[10px]">Patient / Recipient</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-4 pt-2 border-t border-dashed border-black flex flex-col items-center">
          <div className="mb-2 w-full flex flex-col items-center justify-center overflow-hidden">
            <Barcode
              value={voucherId}
              width={1.2}
              height={30}
              fontSize={10}
              margin={0}
              displayValue={true}
            />
          </div>
          <p className="text-[9px] text-gray-600">Please retain this voucher for your records.</p>
        </div>
      </div>
    );
  }
);

RefundReceipt.displayName = 'RefundReceipt';
