"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, AlertTriangle, PlusCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  unit: string;
  unitPrice: number;
  expiryDate: string;
  status: string;
}

export default function PharmacistInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [restocking, setRestocking] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pharmacist/inventory").then(r => r.json()).then(d => { setItems(d.data); setLoading(false); });
  }, []);

  const handleReorder = (item: InventoryItem) => {
    setRestocking(item.id);
    setTimeout(() => {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: i.stock + 100, status: "IN_STOCK" } : i));
      setRestocking(null);
      toast.success(`Reorder placed for ${item.name}. Stock updated (+100 units).`);
    }, 800);
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = items.filter(i => i.status === "LOW_STOCK");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Inventory Management</h2>
          <p className="text-muted-foreground mt-1">Monitor drug stock levels and manage reorders.</p>
        </div>
        <Button onClick={() => toast.info("Add New Stock modal coming soon.")} className="bg-primary hover:bg-primary/90 text-white">
          <PlusCircle className="w-4 h-4 mr-2" /> Add Stock Item
        </Button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Low Stock Alert</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
              {lowStockItems.map(i => i.name).join(", ")} are below reorder levels.
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Drug Inventory</CardTitle>
          <CardDescription>All medications in the pharmacy. Stock below reorder level is highlighted.</CardDescription>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or category..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Drug Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className={item.status === "LOW_STOCK" ? "bg-red-500/10/40" : ""}>
                      <TableCell className="font-medium text-[#3A3435]">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.category}</TableCell>
                      <TableCell className={`text-right font-bold ${item.status === "LOW_STOCK" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        {item.stock} {item.unit}s
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.reorderLevel}</TableCell>
                      <TableCell className="text-right font-medium">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={item.status === "LOW_STOCK" ? "bg-red-500/10 text-red-600 dark:text-red-400 gap-1" : "bg-green-500/10 text-green-600 dark:text-green-400"}>
                          {item.status === "LOW_STOCK" && <AlertTriangle className="w-3 h-3" />}
                          {item.status === "LOW_STOCK" ? "Low Stock" : "In Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === "LOW_STOCK" && (
                          <Button size="sm" variant="outline" disabled={restocking === item.id} onClick={() => handleReorder(item)}>
                            {restocking === item.id ? "Ordering..." : "Reorder"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
