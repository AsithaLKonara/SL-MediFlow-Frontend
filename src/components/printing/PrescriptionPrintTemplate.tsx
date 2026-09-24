import React from "react";

interface PrintProps {
  prescription: any;
}

export const PrescriptionPrintTemplate = React.forwardRef<HTMLDivElement, PrintProps>(
  ({ prescription }, ref) => {
    if (!prescription) return null;

    return (
      <div className="hidden">
        {/* The printable area that react-to-print targets */}
        <div ref={ref} className="w-[300px] p-2 bg-white text-black font-mono text-sm leading-tight">
          <div className="text-center mb-4 border-b-2 border-black pb-2">
            <img src="/logo.png" alt="AMAZ Hospital" className="w-48 mx-auto mb-2" />
            <p className="text-xs">0472239090 | www.amazhospital.com</p>
            <p className="text-[10px]">info@amazhospital.com</p>
            <p className="text-[10px]">debarawewa, Tissamaharama</p>
          </div>

          <div className="mb-4 text-xs">
            <div className="flex justify-between">
              <span className="font-bold">RX ID:</span>
              <span>{prescription.id?.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Date:</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-bold">Patient:</span>
              <span>{prescription.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Doctor:</span>
              <span>{prescription.doctorName}</span>
            </div>
          </div>

          <div className="border-t-2 border-black pt-2 mb-4">
            <h2 className="font-bold uppercase text-center mb-2">Rx - Medications</h2>
            {prescription.items?.map((item: any, idx: number) => (
              <div key={idx} className="mb-3">
                <div className="font-bold text-base flex justify-between">
                  <span>{idx + 1}. {item.drugName}</span>
                </div>
                <div className="text-xs pl-4 flex flex-col">
                  <span>{item.dosage} - {item.frequency}</span>
                  {item.duration && <span>For {item.duration}</span>}
                  {item.instructions && <span className="italic">{item.instructions}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6 pt-2 border-t border-dashed border-black">
            <p className="text-xs italic">Wishing you a speedy recovery!</p>
            <p className="text-[10px] mt-1">Generated electronically.</p>
          </div>
        </div>
      </div>
    );
  }
);

PrescriptionPrintTemplate.displayName = "PrescriptionPrintTemplate";
