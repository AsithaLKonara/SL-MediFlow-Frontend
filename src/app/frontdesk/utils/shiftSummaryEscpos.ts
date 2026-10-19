import { EscPosBuilder } from "@/lib/escpos";
import { ShiftSummaryData } from "../components/PrintTemplates/ShiftSummaryReceipt";

export function buildShiftSummaryEscPos(summary: ShiftSummaryData): EscPosBuilder {
  const builder = new EscPosBuilder();
  const formatLKR = (val: number | undefined | null) =>
    `LKR ${Number(val || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const line = "------------------------------------------";
  const dblLine = "==========================================";

  const formatDate = (d: string | Date | undefined | null) => {
    if (!d) return "N/A";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "N/A" : date.toLocaleString("en-LK");
  };

  builder
    .init()
    .align("center")
    .bold(true)
    .size(1, 2)
    .textLine("AMAZ HOSPITAL")
    .size(1, 1)
    .textLine("Healthcare Excellence & Patient Care")
    .textLine("OFFICIAL SHIFT SETTLEMENT RECEIPT")
    .bold(false)
    .textLine(dblLine)
    .align("left")
    .textLine(`Shift Ref   : ${summary.shiftRef || (summary.shiftId ? summary.shiftId.slice(0, 8) : "N/A")}`)
    .textLine(`Cashier     : ${summary.cashierName || "N/A"} (${summary.cashierRole || "Staff"})`)
    .textLine(`Staff ID    : ${summary.cashierId ? summary.cashierId.slice(0, 8) : "N/A"}`)
    .textLine(`Shift Start : ${formatDate(summary.openedAt)}`)
    .textLine(`Shift Close : ${formatDate(summary.closedAt)}`)
    .textLine(`Duration    : ${summary.durationFormatted || "N/A"}`)
    .textLine(line)
    .align("center")
    .bold(true)
    .textLine("DAY & SHIFT SALES BREAKDOWN")
    .bold(false)
    .align("left");

  if (summary.todayHospitalTotalSales !== undefined && summary.todayHospitalTotalSales > 0) {
    builder.textLine(`Today Hospital Total Sales: ${formatLKR(summary.todayHospitalTotalSales)}`);
    builder.textLine(line);
  }

  if (summary.departmentSales) {
    builder
      .textLine(`OPD / Consultation : ${formatLKR(summary.departmentSales.consultations)}`)
      .textLine(`Pharmacy Sales     : ${formatLKR(summary.departmentSales.pharmacy)}`)
      .textLine(`Laboratory Tests   : ${formatLKR(summary.departmentSales.lab)}`)
      .textLine(`Extra Services     : ${formatLKR(summary.departmentSales.extraServices)}`);
    if (summary.departmentSales.other > 0) {
      builder.textLine(`Other Invoices     : ${formatLKR(summary.departmentSales.other)}`);
    }
    builder.textLine(line);
  }

  builder
    .textLine(`Total Invoices/Txns: ${summary.totalInvoices || 0}`)
    .textLine(`Gross Shift Sales  : ${formatLKR(summary.grossSales || summary.totalSales)}`)
    .textLine(`  - Cash Collected : ${formatLKR(summary.systemCashTotal)}`)
    .textLine(`  - Card Payments  : ${formatLKR(summary.systemCardTotal)}`);

  if (summary.systemBankTotal && summary.systemBankTotal > 0) {
    builder.textLine(`  - Bank Transfers : ${formatLKR(summary.systemBankTotal)}`);
  }
  if (summary.systemQrTotal && summary.systemQrTotal > 0) {
    builder.textLine(`  - QR / Online    : ${formatLKR(summary.systemQrTotal)}`);
  }
  if (summary.cashRefundsTotal > 0) {
    builder.textLine(`  - Cash Refunds   : -${formatLKR(summary.cashRefundsTotal)}`);
  }

  builder
    .bold(true)
    .textLine(`Net Shift Revenue  : ${formatLKR(summary.netSales)}`)
    .bold(false)
    .textLine(line)
    .align("center")
    .bold(true)
    .textLine("CASH BALANCE RECONCILIATION")
    .bold(false)
    .align("left")
    .textLine(`Opening Float (+)      : ${formatLKR(summary.startingFloat)}`)
    .textLine(`Cash Collections (+)   : ${formatLKR(summary.systemCashTotal)}`);

  if (summary.cashRefundsTotal > 0) {
    builder.textLine(`Cash Refunds (-)       : -${formatLKR(summary.cashRefundsTotal)}`);
  }
  if (summary.doctorCashDisbursed && summary.doctorCashDisbursed > 0) {
    builder.textLine(`Doctor Cash Payouts(-): -${formatLKR(summary.doctorCashDisbursed)}`);
  }

  builder
    .textLine(line)
    .bold(true)
    .textLine(`Expected in Drawer     : ${formatLKR(summary.expectedCash)}`)
    .textLine(`Counted/Declared Cash  : ${formatLKR(summary.declaredCash)}`)
    .textLine(
      `Variance Balance       : ${formatLKR(summary.variance)} [${summary.varianceStatus || (summary.variance === 0 ? "BALANCED" : summary.variance > 0 ? "SURPLUS" : "SHORTAGE")}]`
    )
    .bold(false);

  // Doctor Payments Section
  if (summary.doctorPayments && summary.doctorPayments.length > 0) {
    builder
      .textLine(line)
      .align("center")
      .bold(true)
      .textLine("DOCTOR PAYMENTS & DISBURSEMENTS")
      .bold(false)
      .align("left");

    for (const doc of summary.doctorPayments) {
      builder
        .textLine(`${doc.doctorName}`)
        .textLine(`  Pts: ${doc.patientCount} | Gross: ${formatLKR(doc.totalFee)} | Net: ${formatLKR(doc.netDoctorPayment)}`);
      if (doc.cashDisbursed && doc.cashDisbursed > 0) {
        builder.textLine(`  Cash Paid from Drawer: ${formatLKR(doc.cashDisbursed)}`);
      }
    }

    if (summary.totalDoctorPayments) {
      builder
        .textLine(line)
        .bold(true)
        .textLine(`Total Doctors Paid     : ${summary.totalDoctorPayments.totalDoctors}`)
        .textLine(`Total Doctor Net Due   : ${formatLKR(summary.totalDoctorPayments.netDoctorPayment ?? summary.totalDoctorPayments.totalDoctorNetPayment)}`)
        .bold(false);
    }
  }

  builder
    .textLine(dblLine)
    .feed(1)
    .textLine("Cashier: ____________________")
    .feed(1)
    .textLine("Supervisor: _________________")
    .feed(1)
    .align("center")
    .textLine(`Printed: ${formatDate(summary.printedAt || new Date())}`)
    .textLine("AMAZ Hospital Management System")
    .feed(3)
    .cut();

  return builder;
}
