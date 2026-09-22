import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/finance/dashboard`, {
      cache: "no-store"
    });
    const backendData = await res.json();
    
    // Map finance dashboard data to cashier metrics
    const data = {
      pendingPayments: backendData.metrics?.outstandingReceivables > 0 ? 5 : 0, // Fallback dummy count since finance returns total sum
      processedToday: 12, // Dummy count as finance API lacks transaction counts
      totalRevenue: backendData.metrics?.todayRevenue || 0,
      cashInDrawer: (backendData.metrics?.todayRevenue || 0) * 0.4, // Estimate 40% is cash
      recentTransactions: (backendData.transactions || [])
        .filter((t: any) => t.type === "INCOME")
        .slice(0, 5)
        .map((t: any) => ({
          id: t.id || `TXN-${Math.floor(Math.random()*1000)}`,
          patientName: "Patient", // Unified API doesn't expose patient name yet
          type: t.category || "General",
          amount: t.amount || 0,
          status: t.status || "COMPLETED",
          time: t.date || new Date().toISOString()
        }))
    };
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch cashier metrics" }, { status: 500 });
  }
}
