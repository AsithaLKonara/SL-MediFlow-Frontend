import React from "react";
import Barcode from "react-barcode";

export const PrescriptionReceipt = React.forwardRef<HTMLDivElement, {
  prescriptionId?: string;
  patientName: string;
  patientAge: string;
  patientPhone: string;
  doctorName: string;
  medicines: { name: string; dosage: string }[];
  date: string;
}>(({ prescriptionId, patientName, patientAge, patientPhone, doctorName, medicines, date }, ref) => {
  return (
    <div ref={ref} className="w-[300px] bg-card text-card-foreground text-black p-4 font-sans print:p-0">
      <div className="text-center mb-4">
        <img src="/logo.png" alt="AMAZ Hospital" className="w-48 mx-auto mb-2" />
        <p className="text-xs text-black">0472239090 | www.amazhospital.com</p>
        <p className="text-[10px] text-black">info@amazhospital.com</p>
        <p className="text-[10px] text-black mb-2">debarawewa, Tissamaharama</p>
        <p className="text-sm font-medium border-b-2 border-black pb-2 pt-2">Official Prescription</p>
      </div>

      <div className="space-y-1 mb-4 text-sm border-b-2 border-dashed border-black pb-4">
        <div className="flex justify-between">
          <span className="font-bold">Patient:</span>
          <span>{patientName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Age:</span>
          <span>{patientAge} Yrs</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Phone:</span>
          <span>{patientPhone}</span>
        </div>
        <div className="flex justify-between mt-2 pt-2 border-t border-border/60">
          <span className="font-bold">Doctor:</span>
          <span>{doctorName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Date:</span>
          <span suppressHydrationWarning>{date}</span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-lg mb-2 underline">Rx</h3>
        <div className="space-y-3">
          {medicines.map((med, idx) => (
            <div key={idx} className="text-sm">
              <p className="font-bold">{idx + 1}. {med.name}</p>
              <p className="pl-4 italic text-xs">{med.dosage}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center border-t-2 border-black pt-8 flex flex-col items-center">
        {prescriptionId && (
          <div className="mb-4 w-full flex justify-center overflow-hidden">
            <Barcode value={prescriptionId} width={1} height={40} fontSize={10} margin={0} displayValue={false} />
          </div>
        )}
        <p className="text-xs italic mb-2">(Doctor's Signature / Seal)</p>
        <p className="text-xs font-bold uppercase mt-4">Not valid without certification</p>
      </div>
    </div>
  );
});

PrescriptionReceipt.displayName = "PrescriptionReceipt";
