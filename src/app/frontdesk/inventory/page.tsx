"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Search, ArrowLeft, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCallback } from "react";

export default function FrontDeskInventoryPage() {
  const { token } = useAuth();
  
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      cache: "no-store",
      headers: {
        ...options.headers,
        "Cache-Control": "no-cache",
        Authorization: `Bearer ${token}`
      }
    });
  }, [token]);

  const [medicines, setMedicines] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  
  // Restock form state
  const [batchNo, setBatchNo] = useState("");
  const [qty, setQty] = useState("100");
  const [price, setPrice] = useState("10.00");
  const [expiry, setExpiry] = useState("");
  const [isRestocking, setIsRestocking] = useState(false);

  const router = useRouter();

  const fetchMedicines = () => {
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/medicines`)
      .then(r => r.json())
      .then(data => {
        const meds = data.data || data;
        const mappedItems = (Array.isArray(meds) ? meds : []).map((med: any) => {
          const totalStock = med.stockBatches?.reduce((sum: number, batch: any) => sum + batch.currentQuantity, 0) || 0;
          return {
            id: med.id,
            name: med.name,
            barcode: med.barcode,
            category: med.category,
            totalStock,
            reorderLevel: med.reorderLevel,
            status: totalStock === 0 ? "Out of Stock" : totalStock <= med.reorderLevel ? "Low Stock" : "In Stock",
            price: med.stockBatches?.[0]?.unitPrice || 0,
          };
        });
        setMedicines(mappedItems);
      })
      .catch(e => console.error(e));
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const openRestock = (med: any) => {
    setSelectedMed(med);
    setBatchNo(`BATCH-${Date.now().toString().slice(-6)}`);
    setQty("100");
    setPrice(med.price ? med.price.toString() : "10.00");
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setExpiry(nextYear.toISOString().split('T')[0]);
    
    setIsRestockOpen(true);
  };

  const handleRestock = async () => {
    if (!selectedMed) return;
    
    try {
      setIsRestocking(true);
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: selectedMed.id,
          batchNumber: batchNo,
          expiryDate: expiry,
          initialQuantity: parseInt(qty),
          unitPrice: parseFloat(price)
        })
      });
      
      if (res.ok) {
        fetchMedicines();
        setIsRestockOpen(false);
      } else {
        console.error("Failed to restock");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRestocking(false);
    }
  };


  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.barcode?.includes(searchTerm)
  );

  return (
    <div className="flex-1 p-8 h-[calc(100vh-56px)] overflow-y-auto animate-in fade-in bg-muted/10">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/frontdesk')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="w-8 h-8 text-primary" />
              Store Inventory
            </h1>
            <p className="text-muted-foreground mt-1">Live stock levels for Front Desk and POS</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or scan barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Medicine Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock Level</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedicines.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.barcode || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      LKR {item.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{item.totalStock}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={item.status === "In Stock" ? "default" : item.status === "Out of Stock" ? "destructive" : "secondary"}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openRestock(item)}>
                        <Plus className="w-4 h-4 mr-1" /> Restock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMedicines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No medicines found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Restock {selectedMed?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="batch" className="text-right">Batch No</Label>
              <Input id="batch" value={batchNo} onChange={e => setBatchNo(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="qty" className="text-right">Quantity</Label>
              <Input id="qty" type="number" value={qty} onChange={e => setQty(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">Unit Price (LKR)</Label>
              <Input id="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expiry" className="text-right">Expiry Date</Label>
              <Input id="expiry" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestockOpen(false)}>Cancel</Button>
            <Button onClick={handleRestock} isLoading={isRestocking}>Add Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
