"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, ScanLine, CreditCard, Trash2, Banknote, QrCode, Building, Wallet } from "lucide-react";
import { useCartSync, CartItem } from "../hooks/useCartSync";

export function POSPane() {
  const { updateState, state } = useCartSync(true);

  const [cart, setCart] = useState<CartItem[]>([
    { id: "1", name: "Paracetamol 500mg", qty: 2, price: 15.00 },
    { id: "2", name: "Amoxicillin 250mg", qty: 1, price: 45.00 },
  ]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "BANK" | "QR" | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const total = subtotal;

  // Sync to display whenever cart changes, but preserve checkout state
  useEffect(() => {
    updateState({ ...state, cart, subtotal, total });
  }, [cart, subtotal, total]); // Removed updateState from dependency to prevent loop

  const handleQtyChange = (id: string, qty: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
  };

  const handleRemove = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handlePaymentMethodSelect = (method: "CASH" | "CARD" | "BANK" | "QR") => {
    setPaymentMethod(method);
    if (method === "BANK" || method === "QR") {
      updateState({
        ...state,
        checkout: { method, status: "PAYING" }
      });
    } else {
      updateState({
        ...state,
        checkout: { method: null, status: "IDLE" }
      });
    }
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setPaymentMethod(null);
    updateState({
      ...state,
      checkout: { method: null, status: "IDLE" }
    });
  };

  return (
    <div className="flex-1 flex h-full flex-col p-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Point of Sale
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('/customer-display', '_blank', 'width=1024,height=768')}>
            Open Display
          </Button>
        </div>
      </div>

      {/* Barcode/Search Input */}
      <div className="relative shrink-0">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Scan barcode or search medicine..."
          className="pl-9 bg-background border-border"
        />
      </div>

      {/* Cart Table */}
      <div className="flex-1 min-h-0 bg-card border border-border rounded-lg overflow-auto">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow className="border-border">
              <TableHead>Item</TableHead>
              <TableHead className="w-24 text-right">Qty</TableHead>
              <TableHead className="w-32 text-right">Price</TableHead>
              <TableHead className="w-32 text-right">Total</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cart.map((item) => (
              <TableRow key={item.id} className="border-border">
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    value={item.qty}
                    className="w-16 h-8 text-right ml-auto bg-background border-border text-foreground"
                    onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1)}
                  />
                </TableCell>
                <TableCell className="text-right">LKR {item.price.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">LKR {(item.price * item.qty).toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {cart.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                  Cart is empty. Scan an item to begin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals & Checkout */}
      <div className="shrink-0 mt-auto bg-card border border-border rounded-lg p-4 space-y-4 shadow-lg">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>LKR {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-2xl font-bold text-primary">
          <span>Total</span>
          <span>LKR {total.toFixed(2)}</span>
        </div>
        <Button className="w-full h-12 text-lg" onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0}>
          <CreditCard className="w-5 h-5 mr-2" />
          Checkout
        </Button>
      </div>

      {/* Checkout Overlay Modal */}
      {isCheckoutOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 rounded-xl">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border bg-muted flex justify-between items-center">
              <h3 className="font-semibold text-lg">Checkout</h3>
              <Button variant="ghost" size="sm" onClick={handleCloseCheckout}>Cancel</Button>
            </div>
            <div className="p-4 space-y-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                <div className="text-4xl font-bold text-primary">LKR {total.toFixed(2)}</div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePaymentMethodSelect("CASH")}
                  >
                    <Banknote className="w-5 h-5" /> Cash
                  </Button>
                  <Button
                    variant={paymentMethod === "CARD" ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePaymentMethodSelect("CARD")}
                  >
                    <CreditCard className="w-5 h-5" /> Card
                  </Button>
                  <Button
                    variant={paymentMethod === "BANK" ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePaymentMethodSelect("BANK")}
                  >
                    <Building className="w-5 h-5" /> Bank Transfer
                  </Button>
                  <Button
                    variant={paymentMethod === "QR" ? "default" : "outline"}
                    className="h-14 flex flex-col gap-1"
                    onClick={() => handlePaymentMethodSelect("QR")}
                  >
                    <QrCode className="w-5 h-5" /> QR Pay
                  </Button>
                </div>
              </div>

              {/* Dynamic Payment Details Input based on selection */}
              {(paymentMethod === "CASH" || paymentMethod === "CARD") && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-sm font-medium">Received Amount (LKR)</label>
                  <Input type="number" defaultValue={total} className="text-lg h-12" />
                </div>
              )}

              {(paymentMethod === "BANK" || paymentMethod === "QR") && (
                <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-lg text-center animate-in slide-in-from-top-2">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  <p className="font-medium text-sm">Waiting for customer payment...</p>
                  <p className="text-xs opacity-80 mt-1">Details are shown on the Customer Display.</p>
                </div>
              )}

              <Button className="w-full h-12 text-lg" disabled={!paymentMethod}>
                Complete Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
