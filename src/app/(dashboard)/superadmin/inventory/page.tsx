"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, AlertTriangle, PlusCircle, PackageSearch, PackagePlus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface InventoryItem {
  id: string;
  name: string;
  barcode: string;
  category: string;
  stock: number;
  reorderLevel: number;
  unit: string;
  unitPrice: number;
  expiryDate: string;
  status: string;
}

export default function SuperAdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Restock form state
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<InventoryItem | null>(null);
  const [batchNo, setBatchNo] = useState("");
  const [qty, setQty] = useState("100");
  const [price, setPrice] = useState("10.00");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  // New drug form state
  const [isAddDrugOpen, setIsAddDrugOpen] = useState(false);
  const [newDrug, setNewDrug] = useState({
    name: "",
    barcode: "",
    genericName: "",
    category: "",
    form: "",
    unit: "",
    reorderLevel: "100",
    baseStock: "",
    basePrice: ""
  });
  const [addingDrug, setAddingDrug] = useState(false);

  // Generate a random EAN-like barcode automatically when opening the modal
  const openAddDrugModal = () => {
    const randomBarcode = "AMZ-" + Math.floor(10000000 + Math.random() * 90000000).toString();
    setNewDrug(prev => ({ ...prev, barcode: randomBarcode }));
    setIsAddDrugOpen(true);
  };

  const fetchMedicines = () => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL}`}/pharmacy/medicines`)
      .then(r => r.json())
      .then(data => {
        const mappedItems = data.map((med: any) => {
          const stock = med.stockBatches?.reduce((sum: number, b: any) => sum + b.currentQuantity, 0) || 0;
          const status = stock === 0 ? "OUT_OF_STOCK" : stock <= med.reorderLevel ? "LOW_STOCK" : "IN_STOCK";
          const earliestExpiry = med.stockBatches?.length > 0 ? med.stockBatches[0].expiryDate : new Date().toISOString();
          const latestPrice = med.stockBatches?.length > 0 ? med.stockBatches[med.stockBatches.length - 1].unitPrice : 0;
          
          return {
            id: med.id,
            name: med.name,
            barcode: med.barcode || 'N/A',
            category: med.category,
            stock,
            reorderLevel: med.reorderLevel,
            unit: med.unit,
            unitPrice: latestPrice,
            expiryDate: earliestExpiry,
            status
          };
        });
        setItems(mappedItems);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load inventory", e);
        setLoading(false);
        toast.error("Failed to load live inventory data");
      });
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const openRestock = (item: InventoryItem) => {
    setSelectedMed(item);
    setBatchNo(`BATCH-${Date.now().toString().slice(-6)}`);
    setQty("100");
    setPrice(item.unitPrice ? item.unitPrice.toString() : "10.00");
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setExpiry(nextYear.toISOString().split('T')[0]);
    
    setIsRestockOpen(true);
  };

  const handleRestock = async () => {
    if (!selectedMed) return;
    
    const parsedQty = parseInt(qty);
    const parsedPrice = parseFloat(price);
    
    if (isNaN(parsedQty) || parsedQty <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid unit price.");
      return;
    }
    if (!expiry || !batchNo) {
      toast.error("Batch number and expiry date are required.");
      return;
    }

    setSaving(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL}`}/pharmacy/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: selectedMed.id,
          batchNumber: batchNo,
          expiryDate: expiry,
          initialQuantity: parsedQty,
          unitPrice: parsedPrice
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully restocked ${selectedMed.name}`);
        fetchMedicines();
        setIsRestockOpen(false);
      } else {
        console.error("Restock failed:", data);
        toast.error(data.error || "Failed to process restock");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Network error during restock");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDrug = async () => {
    if (!newDrug.name || !newDrug.category || !newDrug.form || !newDrug.unit) {
      toast.error("Please fill all required fields.");
      return;
    }
    
    const parsedReorder = parseInt(newDrug.reorderLevel);
    if (isNaN(parsedReorder) || parsedReorder < 0) {
      toast.error("Please enter a valid reorder level.");
      return;
    }

    setAddingDrug(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL}`}/pharmacy/medicines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDrug.name,
          barcode: newDrug.barcode || undefined,
          genericName: newDrug.genericName,
          category: newDrug.category,
          form: newDrug.form,
          unit: newDrug.unit,
          reorderLevel: parsedReorder,
          baseStock: newDrug.baseStock ? parseInt(newDrug.baseStock) : undefined,
          basePrice: newDrug.basePrice ? parseFloat(newDrug.basePrice) : undefined
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully added drug master: ${newDrug.name}`);
        fetchMedicines();
        setIsAddDrugOpen(false);
        setNewDrug({ name: "", barcode: "", genericName: "", category: "", form: "", unit: "", reorderLevel: "100", baseStock: "", basePrice: "" });
      } else {
        console.error("Add drug failed:", data);
        toast.error(data.error || "Failed to add new drug master");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Network error during add drug");
    } finally {
      setAddingDrug(false);
    }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()) ||
    i.barcode.includes(search)
  );

  const lowStockItems = items.filter(i => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] flex items-center gap-2">
            <PackageSearch className="w-8 h-8 text-primary" />
            Central Inventory Engine
          </h2>
          <p className="text-muted-foreground mt-1">Super Admin oversight for all hospital medical stock levels and analytics.</p>
        </div>
        <Button onClick={openAddDrugModal} className="bg-primary hover:bg-primary/90 text-white shadow-md">
          <PlusCircle className="w-4 h-4 mr-2" /> Add New Drug Master
        </Button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-red-100 rounded-lg shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-red-900">Critical Stock Alert</p>
            <p className="text-sm text-red-700 mt-1">
              {lowStockItems.length} medications have fallen below their required reorder thresholds. Immediate restocking is advised to prevent fulfillment delays.
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardHeader className="pb-4 bg-muted/20 border-b">
          <CardTitle>Global Drug Inventory</CardTitle>
          <CardDescription>Live sync from Pharmacy and Front Desk operations.</CardDescription>
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, category, or barcode..." className="pl-9 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 flex justify-center flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              <p className="text-muted-foreground animate-pulse">Syncing Global Inventory Engine...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6">Barcode</TableHead>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Live Stock</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right pr-6">Management</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className={item.status !== "IN_STOCK" ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/30"}>
                      <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{item.barcode}</TableCell>
                      <TableCell className="font-semibold text-[#3A3435]">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.category}</TableCell>
                      <TableCell className={`text-right font-bold ${item.status !== "IN_STOCK" ? "text-red-600" : "text-green-600"}`}>
                        {item.stock} {item.unit}s
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.reorderLevel}</TableCell>
                      <TableCell className="text-right font-medium">LKR {item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={item.status === "IN_STOCK" ? "default" : item.status === "OUT_OF_STOCK" ? "destructive" : "secondary"}
                          className={item.status === "LOW_STOCK" ? "bg-amber-500/20 text-amber-700 hover:bg-amber-500/30" : ""}
                        >
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button size="sm" variant="outline" onClick={() => openRestock(item)} className="gap-2">
                          <PackagePlus className="w-4 h-4" /> Receive Batch
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                        No medications found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              Receive New Batch
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add new stock for <span className="font-semibold text-foreground">{selectedMed?.name}</span>. This will immediately reflect across all departments.
            </p>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="batch">Supplier Batch ID</Label>
              <Input id="batch" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="qty">Quantity Received</Label>
                <Input id="qty" type="number" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Unit Price (LKR)</Label>
                <Input id="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiry">Batch Expiry Date</Label>
              <Input id="expiry" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRestockOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleRestock} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? "Confirming..." : "Confirm Stock Arrival"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDrugOpen} onOpenChange={setIsAddDrugOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              Add New Drug Master
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create a new drug master record. Once created, you can receive stock batches for it.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="drugName">Drug Name (Brand)*</Label>
                <Input id="drugName" placeholder="e.g. Panadol 500mg" value={newDrug.name} onChange={e => setNewDrug({...newDrug, name: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="genericName">Generic Name</Label>
                <Input id="genericName" placeholder="e.g. Paracetamol" value={newDrug.genericName} onChange={e => setNewDrug({...newDrug, genericName: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category*</Label>
                <Input id="category" placeholder="e.g. Analgesic" value={newDrug.category} onChange={e => setNewDrug({...newDrug, category: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode (Optional)</Label>
                <Input id="barcode" placeholder="Scan or type..." value={newDrug.barcode} onChange={e => setNewDrug({...newDrug, barcode: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="form">Form*</Label>
                <Input id="form" placeholder="e.g. Tablet, Syrup" value={newDrug.form} onChange={e => setNewDrug({...newDrug, form: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit/Strength*</Label>
                <Input id="unit" placeholder="e.g. mg, ml, pills" value={newDrug.unit} onChange={e => setNewDrug({...newDrug, unit: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reorderLevel">Reorder Level*</Label>
                <Input id="reorderLevel" type="number" value={newDrug.reorderLevel} onChange={e => setNewDrug({...newDrug, reorderLevel: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baseStock" className="text-muted-foreground">Opening Stock</Label>
                <Input id="baseStock" type="number" placeholder="Optional" value={newDrug.baseStock} onChange={e => setNewDrug({...newDrug, baseStock: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="basePrice" className="text-muted-foreground">Unit Price (Rs)</Label>
                <Input id="basePrice" type="number" placeholder="Optional" value={newDrug.basePrice} onChange={e => setNewDrug({...newDrug, basePrice: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddDrugOpen(false)} disabled={addingDrug}>Cancel</Button>
            <Button onClick={handleAddDrug} disabled={addingDrug} className="bg-primary hover:bg-primary/90">
              {addingDrug ? "Creating..." : "Create Drug Master"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
