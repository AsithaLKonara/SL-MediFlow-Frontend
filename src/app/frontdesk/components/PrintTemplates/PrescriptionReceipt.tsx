import React from "react";
import Barcode from "react-barcode";

export interface PrescriptionReceiptMedItem {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  dispenseQty?: number | null;
}

export const PrescriptionReceipt = React.forwardRef<HTMLDivElement, {
  prescriptionId?: string;
  patientName: string;
  patientAge?: string;
  patientPhone?: string;
  doctorName: string;
  medicines: PrescriptionReceiptMedItem[];
  date: string;
}>(({ prescriptionId, patientName, patientAge, patientPhone, doctorName, medicines, date }, ref) => {
  return (
    <div ref={ref} className="w-[290px] mx-auto box-border bg-white text-black px-3.5 py-3 font-sans print:w-[290px] print:px-3.5 print:py-2 leading-tight">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: auto;
            margin: 3mm 2mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      {/* Header */}
      <div className="text-center mb-3">
        <img src="/logo.png" alt="AMAZ Hospital" className="w-44 mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-black">AMAZ HOSPITAL & MEDICAL SERVICES</p>
        <p className="text-[10px] text-gray-700">0472239090 | info@amazhospital.com</p>
        <p className="text-[10px] text-gray-700 mb-1.5">Debarawewa, Tissamaharama</p>
        <div className="border-y-2 border-black py-1 my-1">
          <p className="text-xs font-bold uppercase tracking-wider">Official Medical Prescription</p>
        </div>
      </div>

      {/* Patient & Doctor Details */}
      <div className="space-y-1 mb-3 text-xs border-b border-dashed border-black pb-3">
        <div className="flex justify-between">
          <span className="font-bold">Patient:</span>
          <span className="font-semibold">{patientName}</span>
        </div>
        {patientAge && patientAge !== "N/A" && (
          <div className="flex justify-between">
            <span className="font-bold">Age:</span>
            <span>{patientAge} Yrs</span>
          </div>
        )}
        {patientPhone && patientPhone !== "N/A" && (
          <div className="flex justify-between">
            <span className="font-bold">Phone:</span>
            <span>{patientPhone}</span>
          </div>
        )}
        <div className="flex justify-between mt-1 pt-1 border-t border-gray-300">
          <span className="font-bold">Doctor:</span>
          <span>{doctorName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Date:</span>
          <span suppressHydrationWarning>{date}</span>
        </div>
      </div>

      {/* Table Style Layout for Rx */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5 border-b-2 border-black pb-1">
          <span className="font-bold text-sm uppercase tracking-wide">Rx - Prescribed Medicines</span>
          <span className="text-[10px] font-mono font-bold text-gray-600">({medicines.length})</span>
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
                    {med.dispenseQty != null && med.dispenseQty > 0 ? med.dispenseQty : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {medicines.length === 0 && (
          <div className="text-center italic text-xs py-3 text-gray-500">
            No medications prescribed.
          </div>
        )}
      </div>

      {/* Signature & Barcode Section */}
      <div className="mt-8 text-center border-t-2 border-black pt-4 flex flex-col items-center">
        {prescriptionId && (
          <div className="mb-3 w-full flex justify-center overflow-hidden">
            <Barcode value={prescriptionId.substring(0, 10)} width={1.1} height={35} fontSize={10} margin={0} displayValue={false} />
          </div>
        )}
        <div className="w-44 border-b border-black mt-4 mb-1"></div>
        <p className="text-[11px] italic font-semibold">{doctorName}</p>
        <p className="text-[9px] text-gray-600 uppercase tracking-wider">Doctor's Signature / Seal</p>
        <p className="text-[8px] font-bold text-gray-500 mt-3 uppercase tracking-wider">
          Official AMAZ Hospital Medical Prescription
        </p>
      </div>
    </div>
  );
});

PrescriptionReceipt.displayName = "PrescriptionReceipt";
