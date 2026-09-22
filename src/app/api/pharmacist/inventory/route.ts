import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/medicines`, {
      cache: "no-store"
    });
    const backendData = await res.json();
    
    const data = (Array.isArray(backendData) ? backendData : []).map((med: any) => {
      const stock = (med.stockBatches || []).reduce((acc: number, batch: any) => acc + batch.currentQuantity, 0);
      const reorderLevel = med.reorderLevel || 0;
      
      let status = "OUT_OF_STOCK";
      if (stock > reorderLevel) status = "IN_STOCK";
      else if (stock > 0) status = "LOW_STOCK";

      const firstBatch = med.stockBatches && med.stockBatches.length > 0 ? med.stockBatches[0] : null;

      return {
        id: med.id,
        name: med.name,
        category: med.category || "General",
        stock,
        reorderLevel,
        unit: med.unit || "Unit",
        unitPrice: firstBatch ? firstBatch.unitPrice : 0,
        expiryDate: firstBatch ? firstBatch.expiryDate.split("T")[0] : null,
        status
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
