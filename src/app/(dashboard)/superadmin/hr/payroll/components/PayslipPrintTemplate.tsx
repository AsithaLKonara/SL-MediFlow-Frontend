import React from "react";

export const PayslipPrintTemplate = React.forwardRef(({ records, runPeriod }: { records: any[], runPeriod: string }, ref) => {
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="bg-white text-black p-8 hidden print:block">
      {records.map((record, index) => (
        <div key={record.id} className={`w-full max-w-4xl mx-auto ${index !== records.length - 1 ? 'page-break-after-always' : ''}`}>
          
          {/* Company Header */}
          <div className="flex justify-between items-center border-b-2 border-black pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-red-600">AMAZ HOSPITAL</h1>
              <p className="text-sm font-medium text-gray-600 mt-1">Debarawewa, Tissamaharama</p>
              <p className="text-sm text-gray-500">Phone: 047-2233445 | Email: hr@amazhospital.lk</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800 tracking-wide uppercase">Payslip</h2>
              <p className="text-md text-gray-600 mt-1 font-medium">{runPeriod}</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Employee Name</p>
              <p className="text-lg font-bold text-gray-800">{record.user?.fullName || "Unknown"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Designation / Role</p>
              <p className="text-lg font-bold text-gray-800">{record.user?.Role?.name || "Staff"}</p>
            </div>
          </div>

          {/* Salary Details Table */}
          <div className="mb-12">
            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="py-3 px-4 text-sm font-bold text-gray-700">Category</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-700">Description</th>
                  <th className="py-3 px-4 text-sm font-bold text-gray-700 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {record.lineItems?.map((li: any) => (
                  <tr key={li.id} className="border-b border-gray-200 last:border-b-0">
                    <td className="py-3 px-4 text-sm font-medium text-gray-600 uppercase">{li.category}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{li.description}</td>
                    <td className={`py-3 px-4 text-sm font-medium text-right ${li.category === 'DEDUCTION' ? 'text-red-600' : 'text-gray-900'}`}>
                      {li.category === 'DEDUCTION' ? '- ' : ''}{li.amount?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-16">
            <div className="w-1/2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Total Earnings</span>
                <span className="font-bold text-gray-900">{record.totalEarnings?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Total Deductions</span>
                <span className="font-bold text-red-600">- {record.totalDeductions?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-4 border-b-2 border-black bg-gray-50 px-2 rounded-t mt-2">
                <span className="text-lg font-bold text-gray-800">NET SALARY</span>
                <span className="text-xl font-extrabold text-gray-900">LKR {record.netSalary?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="flex justify-between items-end mt-24">
            <div className="text-center w-48">
              <div className="border-b border-black mb-2 h-8"></div>
              <p className="text-sm font-medium text-gray-600">Employee Signature</p>
            </div>

            <div className="text-center w-48 relative">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 border-4 border-dashed border-gray-300 rounded-full flex items-center justify-center opacity-40 rotate-12">
                <span className="text-xs font-bold text-gray-400">COMPANY<br/>SEAL</span>
              </div>
            </div>

            <div className="text-center w-48">
              <div className="border-b border-black mb-2 h-8"></div>
              <p className="text-sm font-medium text-gray-600">Authorized Signature</p>
            </div>
          </div>
          
        </div>
      ))}
    </div>
  );
});

PayslipPrintTemplate.displayName = "PayslipPrintTemplate";
