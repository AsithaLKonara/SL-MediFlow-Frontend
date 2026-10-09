import { Metadata } from "next";
import PublicReportViewer from "./PublicReportViewer";

export const metadata: Metadata = {
  title: "Lab Report | AMAZ Hospital",
  description: "View your confidential lab report from AMAZ Hospital, Tissamaharama.",
};

export default async function ReportPage({ params }: { params: Promise<{ referenceNo: string }> }) {
  const { referenceNo } = await params;
  return <PublicReportViewer referenceNo={referenceNo} />;
}
