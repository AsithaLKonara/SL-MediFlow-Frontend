"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, CreditCard, SendToBack, Printer, ShoppingCart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InventoryItem {
  id: string;
  name: string;
  unitPrice: number;
  stock: number;
  category: string;
  itemType: string;
  barcode: string;
}

interface CartItem extends InventoryItem {
  qty: number;
}

let billCounter = 1001;

export default function PharmacistPOSPage() {
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [generatedBill, setGeneratedBill] = useState<{ id: string; items: CartItem[]; total: number; patientName: string; patientId: string; issuedAt: string, status: string } | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus search input on mount for barcode scanners
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    // Fetch live inventory for POS
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/medicines`)
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((med: any) => {
          const stock = med.stockBatches?.reduce((sum: number, b: any) => sum + b.currentQuantity, 0) || 0;
          const unitPrice = med.stockBatches?.length > 0 ? med.stockBatches[med.stockBatches.length - 1].unitPrice : 0;
          return {
            id: med.id,
            name: med.name,
            barcode: med.barcode || "N/A",
            unitPrice,
            stock,
            category: med.category,
            itemType: med.itemType || "MEDICINE"
          };
        });
        setInventory(mapped);
      })
      .catch(err => console.error("Failed to load inventory for POS", err));
  }, []);

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setSearchQuery(""); // Clear search after adding
    searchInputRef.current?.focus(); // Refocus for next scan
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    // Exact match for barcode, or partial match for text
    const match = inventory.find(i => 
      i.barcode === searchQuery || 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.id === searchQuery
    );

    if (match) {
      addToCart(match);
    } else {
      toast.error("Item not found");
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const total = cart.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
  const filteredCatalog = inventory.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.barcode.includes(searchQuery)
  );

  const processBill = (action: "SETTLE" | "CASHIER") => {
    if (!patientId || !patientName) { toast.error("Enter patient ID and name."); return; }
    if (cart.length === 0) { toast.error("Cart is empty."); return; }
    
    setGenerating(true);
    setTimeout(() => {
      const bill = {
        id: `BILL-${billCounter++}`,
        items: [...cart],
        total,
        patientName,
        patientId,
        issuedAt: new Date().toISOString(),
        status: action === "SETTLE" ? "PAID" : "PENDING_CASHIER"
      };
      
      // If sending to cashier, normally we'd POST to the API here.
      if (action === "CASHIER") {
        fetch("/api/cashier/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            patientName,
            source: "Pharmacy",
            amount: total,
            description: `Pharmacy Bill ${bill.id}`
          })
        }).catch(err => console.error(err));
      }

      setGeneratedBill(bill);
      setGenerating(false);
      
      if (action === "SETTLE") {
        toast.success(`Bill settled. Total: LKR ${total.toFixed(2)}`);
      } else {
        toast.success(`Bill routed to Cashier queue.`);
      }
    }, 600);
  };

  if (generatedBill) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Pharmacy POS</h2>
          <p className="text-muted-foreground mt-1">Transaction Complete</p>
        </div>
        <Card className="shadow-sm max-w-2xl border-2 border-primary/20">
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{generatedBill.id}</p>
                <CardTitle className="mt-1">Pharmacy Invoice — {generatedBill.patientName}</CardTitle>
                <CardDescription>Patient ID: {generatedBill.patientId} · {new Date(generatedBill.issuedAt).toLocaleString()}</CardDescription>
              </div>
              <Badge variant={generatedBill.status === "PAID" ? "default" : "secondary"} 
                     className={generatedBill.status === "PAID" ? "bg-green-600 hover:bg-green-700" : "bg-amber-500/10 text-amber-800"}>
                {generatedBill.status === "PAID" ? "PAID" : "SENT TO CASHIER"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b pb-2">
                  <th className="pb-3">Drug</th>
                  <th className="pb-3 text-right">Qty</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {generatedBill.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium">{item.name}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{item.qty}</td>
                    <td className="py-2.5 text-right text-muted-foreground">LKR {item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-semibold">LKR {(item.qty * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2">
                  <td colSpan={3} className="pt-3 text-right font-bold text-lg">Total</td>
                  <td className="pt-3 text-right font-bold text-xl text-primary">LKR {generatedBill.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="flex gap-3">
              <Button onClick={() => toast.info("Printing receipt...")} variant="outline" className="gap-2"><Printer className="w-4 h-4" /> Print Receipt</Button>
              <Button onClick={() => { setGeneratedBill(null); setCart([]); setPatientId(""); setPatientName(""); }} className="bg-primary hover:bg-primary/90 text-white">New Transaction</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Pharmacy POS</h2>
        <p className="text-muted-foreground mt-1">Rapid entry point-of-sale terminal for medication dispensing.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT PANE: CART & CHECKOUT */}
        <Card className="lg:col-span-7 flex flex-col shadow-sm border-t-4 border-t-primary h-full">
          <CardHeader className="pb-4 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient ID *</label>
                <Input placeholder="Scan or enter ID" value={patientId} onChange={e => setPatientId(e.target.value)} className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patient Name *</label>
                <Input placeholder="Full name" value={patientName} onChange={e => setPatientName(e.target.value)} className="bg-muted/30" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-4 text-border" />
                <p>Cart is empty. Scan barcode or click items to add.</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{item.name}</p>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {item.itemType === 'MEDICINE' ? '💊' : item.itemType === 'CONSUMABLE' ? '📦' : '🔧'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">LKR {item.unitPrice.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 border rounded-md">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-l-md text-muted-foreground hover:bg-muted/50" onClick={() => updateQty(item.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <div className="w-10 text-center text-sm font-medium">
                            {item.qty}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none rounded-r-md text-muted-foreground hover:bg-muted/50" onClick={() => updateQty(item.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="w-20 text-right font-bold text-sm">LKR {(item.qty * item.unitPrice).toFixed(2)}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-500/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {/* TOTALS & ACTIONS */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex justify-between items-end mb-4">
                <div className="text-muted-foreground">
                  <p className="text-sm">Items: {cart.reduce((a,b)=>a+b.qty,0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Grand Total</p>
                  <p className="text-4xl font-bold text-primary">LKR {total.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => processBill("CASHIER")}
                  disabled={generating || cart.length === 0}
                  variant="outline" 
                  className="h-14 font-semibold text-base border-primary/20 hover:bg-primary/5 hover:text-primary"
                >
                  <SendToBack className="w-5 h-5 mr-2" /> Send to Cashier
                </Button>
                <Button 
                  onClick={() => processBill("SETTLE")}
                  disabled={generating || cart.length === 0}
                  className="h-14 font-semibold text-base bg-green-600 hover:bg-green-700 text-white"
                >
                  <CreditCard className="w-5 h-5 mr-2" /> Settle Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANE: CATALOG & SCANNER */}
        <Card className="lg:col-span-5 flex flex-col shadow-sm h-full overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Scan barcode or search drugs..." 
                className="pl-9 h-12 text-base border-primary/30 focus-visible:ring-primary shadow-sm"
              />
            </form>
          </CardHeader>
          <ScrollArea className="flex-1 p-4 bg-muted/30/50">
            <div className="grid grid-cols-2 gap-3">
              {filteredCatalog.length > 0 ? (
                filteredCatalog.map(item => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-auto py-3 px-4 flex flex-col items-start text-left justify-start gap-1 border-border hover:border-primary hover:bg-primary/5 transition-all bg-card text-card-foreground shadow-sm"
                    onClick={() => addToCart(item)}
                  >
                    <div className="w-full flex justify-between items-start">
                      <span className="font-semibold text-sm line-clamp-1" title={item.name}>{item.name}</span>
                      <span className="text-[10px] font-bold">
                        {item.itemType === 'MEDICINE' ? '💊' : item.itemType === 'CONSUMABLE' ? '📦' : '🔧'}
                      </span>
                    </div>
                    <div className="w-full flex justify-between items-center text-xs text-muted-foreground mt-1">
                      <span>Stock: {item.stock}</span>
                      <span className="font-bold text-primary">LKR {item.unitPrice.toFixed(2)}</span>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-muted-foreground">
                  No items found matching "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
