import React from "react";

export const PayslipPrintTemplate = React.forwardRef(({ records, runPeriod }: { records: any[], runPeriod: string }, ref) => {
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="bg-white text-black p-8 hidden print:block">
      {records.map((record, index) => (
        <div key={record.id} className={`w-full max-w-4xl mx-auto ${index !== records.length - 1 ? 'page-break-after-always' : ''}`}>
          
          {/* Company Header */}
          <div className="flex justify-between items-center border-b-2 border-black pb-6 mb-8">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="AMAZ Hospital" className="h-16 w-auto object-contain" />
              <div>
                <p className="text-sm font-medium text-gray-600">Debarawewa, Tissamaharama</p>
                <p className="text-xs text-gray-500">Phone: +94 47 223 9090 | amazhospital.lk | amazhospital88@gmail.com</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800 tracking-wide uppercase">Payslip</h2>
              <p className="text-md text-gray-600 mt-1 font-medium">{runPeriod}</p>
            </div>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Employee Name / ID</p>
              <p className="text-base font-bold text-gray-800">{record.user?.fullName || "Staff Member"} <span className="text-xs text-gray-500 font-mono">({record.user?.id?.slice(0, 8)})</span></p>
              <p className="text-xs text-gray-600 mt-1">Department: <span className="font-semibold">{record.user?.Department?.name || "General Hospital Operations"}</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Designation / Role</p>
              <p className="text-base font-bold text-gray-800">{record.user?.Role?.name || record.user?.role || "Staff"}</p>
              <p className="text-xs text-gray-600 mt-1">Payment Method: <span className="font-semibold">{record.paymentMethod || "Bank Transfer"}</span></p>
            </div>
          </div>

          {/* Salary Details Table */}
          <div className="mb-8">
            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="py-2.5 px-3 text-xs font-bold text-gray-700">Category</th>
                  <th className="py-2.5 px-3 text-xs font-bold text-gray-700">Description</th>
                  <th className="py-2.5 px-3 text-xs font-bold text-gray-700 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {record.lineItems?.map((li: any) => (
                  <tr key={li.id} className="border-b border-gray-200 last:border-b-0">
                    <td className="py-2.5 px-3 text-xs font-semibold text-gray-600 uppercase">{li.category}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-800">{li.description}</td>
                    <td className={`py-2.5 px-3 text-xs font-semibold text-right ${li.category === 'DEDUCTION' || li.category === 'STATUTORY' ? 'text-red-600' : 'text-gray-900'}`}>
                      {li.category === 'DEDUCTION' || li.category === 'STATUTORY' ? '- ' : ''}{li.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-between items-start mb-10">
            <div className="text-xs text-gray-500 space-y-1">
              {record.paymentReference && (
                <p>Transaction Reference: <span className="font-mono font-medium text-gray-800">{record.paymentReference}</span></p>
              )}
              {record.paidAt && (
                <p>Paid Date: <span className="font-medium text-gray-800">{new Date(record.paidAt).toLocaleDateString()}</span></p>
              )}
              <p>Currency: <span className="font-medium text-gray-800">Sri Lankan Rupees (LKR)</span></p>
            </div>
            <div className="w-80">
              <div className="flex justify-between py-1.5 border-b border-gray-200 text-sm">
                <span className="text-gray-600">Gross Earnings:</span>
                <span className="font-bold text-gray-900">LKR {record.totalEarnings?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-200 text-sm">
                <span className="text-gray-600">Total Deductions:</span>
                <span className="font-bold text-red-600">- LKR {record.totalDeductions?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-3 border-b-2 border-black bg-gray-50 px-2 rounded-t mt-2">
                <span className="text-base font-bold text-gray-800">NET SALARY:</span>
                <span className="text-lg font-extrabold text-gray-900">LKR {record.netSalary?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
