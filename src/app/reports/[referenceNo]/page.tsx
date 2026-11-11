import { Metadata } from "next";
import PublicReportViewer from "./PublicReportViewer";

export const metadata: Metadata = {
  title: "Lab Report | SL MediFlow",
  description: "View your confidential lab report from SL MediFlow Healthcare.",
};

export default async function ReportPage({ params }: { params: Promise<{ referenceNo: string }> }) {
  const { referenceNo } = await params;
  return <PublicReportViewer referenceNo={referenceNo} />;
}
