import React from "react";
import Barcode from "react-barcode";

export interface ExternalPrescriptionMed {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  qty?: number | string | null;
}

export interface ExternalPrescriptionReceiptProps {
  prescriptionId?: string;
  patientName: string;
  patientAge?: string | number;
  patientPhone?: string;
  doctorName: string;
  diagnosis?: string;
  medicines: ExternalPrescriptionMed[];
  date: string;
  bookingReference?: string | null;
}

export const ExternalPrescriptionReceipt = React.forwardRef<HTMLDivElement, ExternalPrescriptionReceiptProps>(
  ({ prescriptionId, patientName, patientAge, patientPhone, doctorName, diagnosis, medicines, date, bookingReference }, ref) => {
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

        {/* Header */}
        <div className="text-center mb-3 border-b-2 border-black pb-2">
          <img src="/logo.png" alt="AMAZ Hospital" className="w-44 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-black">AMAZ HOSPITAL & MEDICAL SERVICES</p>
          <p className="text-[10px] text-gray-700">0472239090 | info@amazhospital.com</p>
          <p className="text-[10px] text-gray-700 mb-1.5">Debarawewa, Tissamaharama</p>
          <div className="bg-black text-white py-1 px-2 rounded-sm inline-block">
            <p className="text-xs font-bold uppercase tracking-wider">OUTSIDE PHARMACY PRESCRIPTION</p>
          </div>
          <p className="text-[9px] text-gray-600 mt-1 italic">
            For items to be dispensed by external pharmacies
          </p>
        </div>

        {/* Patient & Doctor Context */}
        <div className="space-y-1 mb-3 text-xs border-b border-dashed border-black pb-3">
          <div className="flex justify-between">
            <span className="font-bold">Patient:</span>
            <span className="font-semibold">{patientName}</span>
          </div>
          {patientAge && (
            <div className="flex justify-between">
              <span className="font-bold">Age:</span>
              <span>{patientAge} Yrs</span>
            </div>
          )}
          {patientPhone && (
            <div className="flex justify-between">
              <span className="font-bold">Contact:</span>
              <span>{patientPhone}</span>
            </div>
          )}
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-300">
            <span className="font-bold">Prescribing Doctor:</span>
            <span>{doctorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span suppressHydrationWarning>{date}</span>
          </div>
          {diagnosis && (
            <div className="flex justify-between mt-1 pt-1 border-t border-gray-200">
              <span className="font-bold">Diagnosis:</span>
              <span className="italic">{diagnosis}</span>
            </div>
          )}
        </div>

        {/* Table Style Layout for Rx */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5 border-b-2 border-black pb-1">
            <h3 className="font-bold text-sm uppercase tracking-wide">Rx - External Medicines</h3>
            <span className="text-[10px] font-mono text-gray-600 font-bold">({medicines.length})</span>
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
              {medicines.map((med, idx) => {
                const clinicalParts = [
                  med.dosage,
                  med.frequency,
                  med.duration ? `for ${med.duration}` : null,
                ].filter(Boolean);

                return (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-1.5 pr-1 align-top font-bold text-[11px] text-black">
                      {idx + 1}.
                    </td>
                    <td className="py-1.5 px-1 align-top">
                      <div className="font-bold text-[12px] text-black leading-snug">
                        {med.name}
                      </div>
                      {clinicalParts.length > 0 && (
                        <div className="text-[10px] text-gray-800 font-medium leading-tight mt-0.5">
                          {clinicalParts.join(" • ")}
                        </div>
                      )}
                      {med.instructions && (
                        <div className="text-[10px] italic text-gray-700 leading-tight mt-0.5">
                          Note: {med.instructions}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 pl-1 align-top text-right font-mono font-bold text-[12px] text-black">
                      {med.qty ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {medicines.length === 0 && (
            <div className="text-center italic text-xs py-3 text-gray-500">
              No outside medications prescribed.
            </div>
          )}
        </div>

        {/* Barcode & Doctor Certification */}
        <div className="mt-8 text-center border-t-2 border-black pt-4 flex flex-col items-center">
          {(bookingReference || prescriptionId) && (
            <div className="mb-3 w-full flex flex-col items-center justify-center overflow-hidden">
              <Barcode
                value={(bookingReference || prescriptionId || "").substring(0, 12)}
                width={1.1}
                height={35}
                fontSize={10}
                margin={0}
                displayValue={true}
              />
            </div>
          )}
          <div className="w-44 border-b border-black mt-4 mb-1"></div>
          <p className="text-[11px] italic font-semibold">{doctorName}</p>
          <p className="text-[9px] text-gray-600 uppercase tracking-wider">Doctor's Signature / Stamp</p>
          <p className="text-[8px] text-gray-500 mt-3 uppercase tracking-wider">
            Official AMAZ Hospital Medical Slip • Valid for outside pharmacy dispensing
          </p>
        </div>
        <div className="h-8 print:h-12 w-full" aria-hidden="true" />
      </div>
    );
  }
);

ExternalPrescriptionReceipt.displayName = "ExternalPrescriptionReceipt";
