import React from "react";

export const PrescriptionReceipt = React.forwardRef<HTMLDivElement, {
  patientName: string;
  patientAge: string;
  patientPhone: string;
  doctorName: string;
  medicines: { name: string; dosage: string }[];
  date: string;
}>(({ patientName, patientAge, patientPhone, doctorName, medicines, date }, ref) => {
  return (
    <div ref={ref} className="w-[300px] bg-white text-black p-4 font-sans print:p-0">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-black mb-1">AMAZ HOSPITAL</h1>
        <p className="text-sm font-medium border-b-2 border-black pb-2">Official Prescription</p>
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
        <div className="flex justify-between mt-2 pt-2 border-t border-gray-300">
          <span className="font-bold">Doctor:</span>
          <span>{doctorName}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Date:</span>
          <span>{date}</span>
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

      <div className="mt-12 text-center border-t-2 border-black pt-8">
        <p className="text-xs italic mb-2">(Doctor's Signature / Seal)</p>
        <p className="text-xs font-bold uppercase mt-4">Not valid without certification</p>
      </div>
    </div>
  );
});

PrescriptionReceipt.displayName = "PrescriptionReceipt";
