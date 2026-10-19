import React from "react";
import Barcode from "react-barcode";
import { getFrequencyLabel, getRouteLabel } from "@/lib/prescriptionConstants";

interface PrintProps {
  prescription: any;
}

export const PrescriptionPrintTemplate = React.forwardRef<HTMLDivElement, PrintProps>(
  ({ prescription }, ref) => {
    if (!prescription) return null;

    return (
      <div className="hidden">
        {/* The printable area that react-to-print targets */}
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

          <div className="text-center mb-3 border-b-2 border-black pb-2">
            <img src="/logo.png" alt="AMAZ Hospital" className="w-44 mx-auto mb-1.5" />
            <p className="text-xs font-semibold">AMAZ HOSPITAL & MEDICAL SERVICES</p>
            <p className="text-[10px]">0472239090 | www.amazhospital.com</p>
            <p className="text-[10px]">Debarawewa, Tissamaharama</p>
            <div className="border-y border-black py-1 my-1">
              <p className="text-xs font-bold uppercase tracking-wider">Doctor Prescription</p>
            </div>
          </div>

          <div className="mb-3 text-xs space-y-1 border-b border-dashed border-black pb-3">
            <div className="flex justify-between">
              <span className="font-bold">RX ID:</span>
              <span className="font-mono">{prescription.id?.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Date:</span>
              <span>{new Date().toLocaleDateString("en-LK")}</span>
            </div>
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
              <span className="font-bold">Patient:</span>
              <span className="font-semibold">{prescription.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Doctor:</span>
              <span>{prescription.doctorName}</span>
            </div>
          </div>

          {/* Table Style Layout for Rx */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5 border-b-2 border-black pb-1">
              <h2 className="font-bold text-xs uppercase tracking-wide">Rx - Prescribed Medicines</h2>
              <span className="text-[10px] font-mono font-bold text-gray-600">({prescription.items?.length || 0})</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black text-black">
                  <th className="py-1 pr-1 font-bold text-[10px] w-5">#</th>
                  <th className="py-1 px-1 font-bold text-[10px]">Item & Instructions</th>
                  <th className="py-1 pl-1 font-bold text-[10px] text-right w-10">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {prescription.items?.map((item: any, idx: number) => {
                  const doseStr = item.dosageAmount && item.doseUnit 
                    ? `${item.dosageAmount} ${item.doseUnit}` 
                    : item.dosage;
                  const clinicalParts = [
                    item.strength,
                    doseStr,
                    item.route ? getRouteLabel(item.route) : null,
                    item.frequency ? getFrequencyLabel(item.frequency) : null,
                    item.duration ? `for ${item.duration}` : null,
                  ].filter(Boolean);

                  return (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-1.5 pr-1 align-top font-bold text-[11px] text-black">
                        {idx + 1}.
                      </td>
                      <td className="py-1.5 px-1 align-top">
                        <div className="font-bold text-[12px] text-black leading-snug">
                          {item.drugName}
                        </div>
                        {clinicalParts.length > 0 && (
                          <div className="text-[10px] text-gray-800 font-medium leading-tight mt-0.5">
                            {clinicalParts.join(" • ")}
                          </div>
                        )}
                        {item.instructions && (
                          <div className="text-[10px] italic text-gray-700 leading-tight mt-0.5">
                            Note: {item.instructions}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 pl-1 align-top text-right font-mono font-bold text-[12px] text-black">
                        {item.dispenseQty != null && item.dispenseQty > 0 ? item.dispenseQty : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {(!prescription.items || prescription.items.length === 0) && (
              <div className="text-center italic text-xs py-2 text-gray-500">No medications prescribed.</div>
            )}
          </div>

          {prescription.labRequests && prescription.labRequests.length > 0 && (
            <div className="border-t-2 border-black pt-2 mb-4">
              <h2 className="font-bold uppercase text-xs mb-1.5">Lab Orders</h2>
              {prescription.labRequests.map((req: any, reqIdx: number) => (
                <div key={reqIdx} className="mb-1">
                  <div className="text-xs pl-2 flex flex-col space-y-0.5">
                    {req.tests?.map((testName: string, testIdx: number) => (
                      <span key={testIdx} className="font-medium">• {testName}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-6 pt-3 border-t border-dashed border-black flex flex-col items-center">
            {(() => {
              const masterBarcode = 
                prescription.bookingReference || 
                prescription.Visit?.bookingReference || 
                prescription.masterBarcode || 
                (prescription.id ? prescription.id.substring(0, 10) : null);

              if (!masterBarcode) return null;

              return (
                <div className="mb-2 w-full flex flex-col items-center justify-center overflow-hidden">
                  <Barcode value={masterBarcode} width={1.1} height={38} fontSize={10} margin={0} displayValue={true} />
                </div>
              );
            })()}
            <p className="text-xs italic mt-1">Wishing you a speedy recovery!</p>
            <p className="text-[9px] text-gray-500 mt-0.5">Generated electronically.</p>
          </div>
          <div className="h-8 print:h-12 w-full" aria-hidden="true" />
        </div>
      </div>
    );
  }
);

PrescriptionPrintTemplate.displayName = "PrescriptionPrintTemplate";
