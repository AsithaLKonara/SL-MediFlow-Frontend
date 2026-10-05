"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, ScanLine, CreditCard, Trash2, Banknote, QrCode, Building, Wallet, Loader2 } from "lucide-react";
import { useCartSync, useRxToPOS, CartItem } from "../hooks/useCartSync";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePoleDisplay } from "../../../hooks/usePoleDisplay";
import { usePaymentTerminal } from "../../../hooks/usePaymentTerminal";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { MergedReceiptTemplate } from "../../../components/printing/MergedReceiptTemplate";
import { CheckCircle2, Printer } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useCallback } from "react";

interface Medicine {
  id: string;
  name: string;
  barcode: string;
  stockBatches?: { unitPrice: number; currentQuantity?: number }[];
}

export function POSPane() {
  const { token } = useAuth();
  
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    });
  }, [token]);

  const { updateState, state } = useCartSync(true);
  const { onPrescriptionReceived, notifyRxStatus } = useRxToPOS();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeDrugSearch, setActiveDrugSearch] = useState(false);
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [pendingTokenPayload, setPendingTokenPayload] = useState<any | null>(null);
  const [pendingAppointmentPayload, setPendingAppointmentPayload] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [tokenReceiptData, setTokenReceiptData] = useState<any>(null);
  const [receivedAmountInput, setReceivedAmountInput] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Receipt",
  });

  useEffect(() => {
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/medicines`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load medicines");
        return r.json();
      })
      .then((d) => setAvailableMedicines(d.data || d))
      .catch((e) => {
        console.error("Failed to load medicines", e);
      });
  }, []);

  // Listen for websocket pos_payment_success (e.g. for multi-terminal sync)
  useEffect(() => {
    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace('/api', '');
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("POSPane connected to websocket");
    });

    socket.on("pos_payment_success", (data) => {
      // Optional: React to payments made on other terminals if needed
      console.log("Global payment success event:", data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Listen for prescription items or tokens pushed from the Rx/Token tab
  useEffect(() => {
    onPrescriptionReceived(
      (rxItems, rxId) => {
        setCart((prev) => {
          const updated = [...prev];
          for (const rxItem of rxItems) {
            const idx = updated.findIndex((i) => i.id === rxItem.id);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], qty: updated[idx].qty + rxItem.qty };
            } else {
              updated.push(rxItem);
            }
          }
          return updated;
        });
        setActivePrescriptionId(rxId);
        // Mark prescription as IN_PROGRESS on backend
        apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${rxId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "IN_PROGRESS" }),
        }).catch((e) => console.error("Failed to update Rx status:", e));
        // Broadcast status to TokenPane so it can lock the UI
        notifyRxStatus(rxId, "IN_PROGRESS");
        toast.success(`${rxItems.length} medicine(s) loaded into POS from prescription.`);
      },
      (tokenPayload: any) => {
        if (tokenPayload.isAppointmentCheckout) {
          setPendingAppointmentPayload(tokenPayload);
          toast.success("Appointment checkout loaded into POS.");
        } else {
          setPendingTokenPayload(tokenPayload);
          toast.success("Token details loaded into POS checkout.");
        }
      }
    );
  }, [onPrescriptionReceived, notifyRxStatus]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "BANK" | "QR" | null>(null);
  
  const { showAmount, clearDisplay } = usePoleDisplay(true);
  const { initiateCardPayment, isProcessing: isCardProcessing } = usePaymentTerminal();

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tokenTotal = pendingTokenPayload ? pendingTokenPayload.expectedTotal : 0;
  const appointmentTotal = (pendingAppointmentPayload && pendingAppointmentPayload.isUpfront) ? pendingAppointmentPayload.fee : 0;
  const subtotal = cartSubtotal + tokenTotal + appointmentTotal;
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

  const addToCart = (med: Medicine) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === med.id);
      if (exists) {
        return prev.map(i => i.id === med.id ? { ...i, qty: i.qty + 1 } : i);
      }
      
      const price = med.stockBatches && med.stockBatches.length > 0 
        ? med.stockBatches[med.stockBatches.length - 1].unitPrice 
        : 0;
        
      return [...prev, { id: med.id, name: med.name, qty: 1, price }];
    });
    setSearchInput("");
    setActiveDrugSearch(false);
    
    // Auto-focus the quantity input after it renders
    setTimeout(() => {
      document.getElementById(`qty-input-${med.id}`)?.focus();
    }, 100);
  };

  const processBarcode = async (code: string) => {
    if (!code) return;

    try {
      // Use the unified barcode API
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/${code}`);
      if (!res.ok) {
        toast.error(`No item found for barcode ${code}`);
        return;
      }
      
      const { type, data } = await res.json();

      if (type === "PRESCRIPTION") {
        const rx = data;
        if (rx && rx.items) {
          const cartItems: CartItem[] = rx.items
            .filter((item: any) => item.medicineId && item.medicine)
            .map((item: any) => ({
              id: item.medicine.id,
              name: item.medicine.name,
              qty: item.dispenseQty || 1,
              price: item.medicine.stockBatches?.[0]?.unitPrice ?? 0,
            }));
          
          if (cartItems.length > 0) {
            setCart(prev => {
              const updated = [...prev];
              for (const rxItem of cartItems) {
                const idx = updated.findIndex((i) => i.id === rxItem.id);
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], qty: updated[idx].qty + rxItem.qty };
                } else {
                  updated.push(rxItem);
                }
              }
              return updated;
            });
            setActivePrescriptionId(code);
            if (rx.patientId) setActivePatientId(rx.patientId);
            if (rx.visitId) setActiveVisitId(rx.visitId);
            
            apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${code}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "IN_PROGRESS" }),
            }).catch(console.error);
            notifyRxStatus(code, "IN_PROGRESS");
            toast.success(`Prescription loaded via barcode scan.`);
          }
        }
      } else if (type === "MEDICINE") {
        addToCart(data);
        toast.success(`Added ${data.name}`);
      } else if (type === "EXTRA_SERVICE") {
        setCart(prev => {
          const exists = prev.find(i => i.id === data.id);
          if (exists) {
            return prev.map(i => i.id === data.id ? { ...i, qty: i.qty + 1 } : i);
          }
          return [...prev, { id: data.id, name: data.title, qty: 1, price: data.price }];
        });
        toast.success(`Added ${data.title}`);
      }
    } catch (e) {
      console.error(e);
      toast.error(`Error processing barcode ${code}`);
    }
  };

  useBarcodeScanner((barcode) => {
    processBarcode(barcode);
  });

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processBarcode(searchInput.trim());
    }
  };

  const handlePaymentMethodSelect = (method: "CASH" | "CARD" | "BANK" | "QR") => {
    setPaymentMethod(method);
    if (method === "QR") {
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

  const handleCloseCheckout = (cancelled = false) => {
    // If cancelled and a prescription was in progress, revert it to PENDING
    if (cancelled && activePrescriptionId) {
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${activePrescriptionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      }).catch((e) => console.error("Failed to revert Rx status:", e));
      notifyRxStatus(activePrescriptionId, "PENDING");
      setActivePrescriptionId(null);
    }
    setIsCheckoutOpen(false);
    setPaymentMethod(null);
    setReceiptData(null);
    setTokenReceiptData(null);
    setReceivedAmountInput("");
    setPendingAppointmentPayload(null);
    clearDisplay();
    updateState({
      ...state,
      checkout: { method: null, status: "IDLE" }
    });
  };

  const handleCancelPrescription = () => {
    if (activePrescriptionId) {
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${activePrescriptionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING" }),
      }).catch((e) => console.error("Failed to revert Rx status:", e));
      notifyRxStatus(activePrescriptionId, "PENDING");
      setActivePrescriptionId(null);
    }
    setCart([]);
    toast.info("Prescription cancelled. Cart cleared.");
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0 && !pendingTokenPayload) {
      toast.error("Cart is empty.");
      return;
    }
    setIsCheckoutOpen(true);
    showAmount(total);
  };

  return (
    <div className="flex-1 flex h-full flex-col p-4 gap-4">
      <div className="flex justify-between items-center bg-card p-3 border border-border rounded-lg shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg flex items-center gap-2">
            Point of Sale
            {activePrescriptionId && (
              <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                RX ACTIVE
              </span>
            )}
          </h2>
        </div>
        <div className="flex gap-2">
          {activePrescriptionId && (
            <Button variant="outline" size="sm" onClick={handleCancelPrescription} className="border-destructive text-destructive hover:bg-destructive/10">
              Cancel Rx
            </Button>
          )}
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
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setActiveDrugSearch(true);
          }}
          onFocus={() => setActiveDrugSearch(true)}
          onBlur={() => setTimeout(() => setActiveDrugSearch(false), 200)}
          onKeyDown={handleBarcodeScan}
          autoFocus
        />
        
        {activeDrugSearch && searchInput.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {availableMedicines.filter((m) => m.name.toLowerCase().includes(searchInput.toLowerCase()) || m.barcode?.includes(searchInput)).length > 0 ? (
              availableMedicines.filter((m) => m.name.toLowerCase().includes(searchInput.toLowerCase()) || m.barcode?.includes(searchInput)).map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none flex justify-between items-center border-b last:border-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addToCart(m);
                  }}
                >
                  <div>
                    <div className="font-medium text-foreground">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.barcode ? `Barcode: ${m.barcode}` : 'No barcode'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">LKR {m.stockBatches?.[0]?.unitPrice || 0}</div>
                    <div className="text-xs text-muted-foreground">Stock: {m.stockBatches?.reduce((sum: number, b: { currentQuantity?: number }) => sum + (b.currentQuantity || 0), 0) || 0}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">No medicines found.</div>
            )}
          </div>
        )}
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
                    id={`qty-input-${item.id}`}
                    type="number"
                    value={item.qty}
                    className="w-16 h-8 text-right ml-auto bg-background border-border text-foreground"
                    onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
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
            
            {/* Render Token Payload Itemized */}
            {pendingTokenPayload && (
              <>
                {pendingTokenPayload.isUpfront && pendingTokenPayload.doctorFee && pendingTokenPayload.doctorFee > 0 && (
                  <TableRow className="border-border bg-primary/5">
                    <TableCell className="font-medium text-primary">
                      Consultation - Dr. {pendingTokenPayload.doctorName}
                      <div className="text-xs text-muted-foreground font-normal">
                        Patient: {pendingTokenPayload.patientName || "Walk-in"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">1</TableCell>
                    <TableCell className="text-right">LKR {pendingTokenPayload.doctorFee.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">LKR {pendingTokenPayload.doctorFee.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}

                {pendingTokenPayload.tests.map((test: any, idx: number) => (
                  <TableRow key={`test-${idx}`} className="border-border bg-blue-500/5">
                    <TableCell className="font-medium text-blue-600">
                      {test.name}
                      <div className="text-xs text-muted-foreground font-normal">Lab Test</div>
                    </TableCell>
                    <TableCell className="text-right">1</TableCell>
                    <TableCell className="text-right">LKR {test.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">LKR {test.price.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}

                {pendingTokenPayload.services.map((svc: any, idx: number) => (
                  <TableRow key={`svc-${idx}`} className="border-border bg-orange-500/5">
                    <TableCell className="font-medium text-orange-600">
                      {svc.name}
                      <div className="text-xs text-muted-foreground font-normal">Extra Service</div>
                    </TableCell>
                    <TableCell className="text-right">1</TableCell>
                    <TableCell className="text-right">LKR {svc.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">LKR {svc.price.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}

                <TableRow className="border-border">
                  <TableCell colSpan={4} className="text-right text-xs text-muted-foreground pt-4">
                    <span className="cursor-pointer text-red-500 hover:underline" onClick={() => setPendingTokenPayload(null)}>
                      Remove Token from POS
                    </span>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
            )}

            {/* Render Phone Appointment Checkout Item */}
            {pendingAppointmentPayload && (
              <>
                <TableRow className="border-border bg-purple-500/5">
                  <TableCell className="font-medium text-purple-600">
                    Existing Phone Booking - Token {pendingAppointmentPayload.tokenNumber}
                    <div className="text-xs text-muted-foreground font-normal">
                      Patient: {pendingAppointmentPayload.patientName || "Walk-in"}
                      {pendingAppointmentPayload.doctorName ? ` | Dr. ${pendingAppointmentPayload.doctorName}` : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">1</TableCell>
                  <TableCell className="text-right">
                    {pendingAppointmentPayload.isUpfront ? `LKR ${pendingAppointmentPayload.fee.toFixed(2)}` : "Post Pay"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {pendingAppointmentPayload.isUpfront ? `LKR ${pendingAppointmentPayload.fee.toFixed(2)}` : "LKR 0.00"}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
                <TableRow className="border-border">
                  <TableCell colSpan={4} className="text-right text-xs text-muted-foreground pt-4">
                    <span className="cursor-pointer text-red-500 hover:underline" onClick={() => setPendingAppointmentPayload(null)}>
                      Remove Appointment from POS
                    </span>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
            )}

            {cart.length === 0 && !pendingTokenPayload && (
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
        <Button className="w-full h-12 text-lg" onClick={handleOpenCheckout} disabled={cart.length === 0 && !pendingTokenPayload}>
          <CreditCard className="w-5 h-5 mr-2" />
          Checkout
        </Button>
      </div>

      {/* Checkout Overlay Modal */}
      {isCheckoutOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 rounded-xl">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {receiptData ? (
              <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Payment Successful!</h3>
                <div className="text-muted-foreground w-full p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span>Total Paid</span>
                    <span className="font-bold text-foreground">LKR {receiptData.total.toFixed(2)}</span>
                  </div>
                  {receiptData.change > 0 && (
                    <div className="flex justify-between text-green-500">
                      <span>Change Due</span>
                      <span className="font-bold">LKR {receiptData.change.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between mt-1 text-sm">
                    <span>Method</span>
                    <span>{receiptData.paymentMethod}</span>
                  </div>
                </div>
                <div className="flex w-full gap-3 mt-4">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => handlePrint()}>
                    <Printer className="w-4 h-4 mr-2" /> Print Receipt
                  </Button>
                  <Button className="flex-1 h-12" onClick={() => handleCloseCheckout()}>
                    New Sale
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-border bg-muted flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Checkout</h3>
                  <Button variant="ghost" size="sm" onClick={() => handleCloseCheckout(true)}>Cancel</Button>
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

                </div>
              </div>

              {/* Dynamic Payment Details Input based on selection */}
              {(paymentMethod === "CASH" || paymentMethod === "BANK") && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-sm font-medium">Received Amount (LKR)</label>
                  <Input 
                    type="number" 
                    value={receivedAmountInput} 
                    onChange={(e) => setReceivedAmountInput(e.target.value)}
                    placeholder={total.toString()} 
                    className="text-lg h-12" 
                  />
                </div>
              )}



              <Button 
                className="w-full h-12 text-lg" 
                disabled={!paymentMethod || isProcessing || isCardProcessing}
                onClick={async () => {
                  if (isProcessing) return;
                  setIsProcessing(true);

                  if (paymentMethod === "CARD") {
                    const success = await initiateCardPayment(total);
                    if (!success) {
                      alert("Card payment failed or was cancelled.");
                      setIsProcessing(false);
                      return;
                    }
                  }

                  try {
                    let combinedItems = cart.map(item => ({
                      name: item.name,
                      qty: item.qty,
                      price: item.price,
                      total: item.qty * item.price
                    }));
                    
                    let tokenResultTokens: any[] = [];

                    // 1. Generate Token if payload exists
                    if (pendingTokenPayload) {
                      const resToken = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/token`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(pendingTokenPayload)
                      });
                      if (resToken.ok) {
                        const tokenRes = await resToken.json();
                        tokenResultTokens = tokenRes.data.tokens || [];
                        if (tokenRes.data.invoice) {
                           tokenRes.data.invoice.lineItems.forEach((li: any) => {
                             combinedItems.push({
                               name: li.description,
                               qty: li.quantity,
                               price: li.unitPrice,
                               total: li.total
                             });
                           });
                        }
                      } else {
                         const err = await resToken.json();
                         toast.error(err.error || "Token generation failed");
                         setIsProcessing(false);
                         return;
                      }
                    }

                    // 1.5 Checkout Phone Appointment if payload exists
                    if (pendingAppointmentPayload) {
                      const resAppt = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/checkout-appointment`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(pendingAppointmentPayload)
                      });
                      if (resAppt.ok) {
                        const apptRes = await resAppt.json();
                        // It returns { tokenNumber, department, doctorName, patientName, invoice }
                        tokenResultTokens.push({
                          id: apptRes.data.appointment.id,
                          tokenNumber: apptRes.data.tokenNumber,
                          department: apptRes.data.department,
                          doctorName: apptRes.data.doctorName,
                          patientName: apptRes.data.patientName,
                          status: apptRes.data.appointment.status,
                          appointmentDate: apptRes.data.appointment.appointmentDate
                        });
                        
                        if (apptRes.data.invoice) {
                           apptRes.data.invoice.lineItems.forEach((li: any) => {
                             combinedItems.push({
                               name: li.description,
                               qty: li.quantity,
                               price: li.unitPrice,
                               total: li.total
                             });
                           });
                        }
                      } else {
                         const err = await resAppt.json();
                         toast.error(err.error || "Appointment checkout failed");
                         setIsProcessing(false);
                         return;
                      }
                    }

                    // 2. Process Pharmacy Cart if any
                    let receiptId = `TXN-${Date.now()}`;
                    if (cart.length > 0) {
                      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/sell`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          items: cart, 
                          paymentMethod,
                          prescriptionId: activePrescriptionId,
                          patientId: activePatientId,
                          visitId: activeVisitId
                        })
                      });
                      
                      if (res.ok) {
                        const responseData = await res.json();
                        receiptId = responseData.invoiceId || responseData.id || receiptId;
                      } else {
                        const err = await res.json();
                        toast.error(err.error || "Pharmacy payment failed");
                        setIsProcessing(false);
                        return;
                      }
                    }
                    
                    // 3. Finalize
                    const parsedReceived = parseFloat(receivedAmountInput) || total;
                    setReceiptData({
                      receiptId,
                      date: new Date(),
                      items: combinedItems,
                      subtotal: total,
                      total: total,
                      paymentMethod: paymentMethod,
                      receivedAmount: (paymentMethod === "CASH" || paymentMethod === "BANK") ? parsedReceived : total,
                      change: (paymentMethod === "CASH" || paymentMethod === "BANK") ? Math.max(0, parsedReceived - total) : 0
                    });
                    setTokenReceiptData(tokenResultTokens);

                    // Mark prescription DISPENSED if one was active
                    if (activePrescriptionId) {
                      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${activePrescriptionId}/status`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "DISPENSED" }),
                      }).catch((e) => console.error("Failed to dispense Rx:", e));
                      notifyRxStatus(activePrescriptionId, "DISPENSED");
                      setActivePrescriptionId(null);
                    }
                    setCart([]);
                    setActivePatientId(null);
                    setActiveVisitId(null);
                    setPendingTokenPayload(null);
                    setPendingAppointmentPayload(null);
                    toast.success("Payment completed successfully!");
                    // Notice we do NOT call handleCloseCheckout() here because we want to show the success screen

                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to connect to server");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                {isProcessing || isCardProcessing ? (
                  <span className="flex items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</span>
                ) : (
                  "Complete Payment"
                )}
              </Button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden print template */}
      <MergedReceiptTemplate ref={printRef} receiptData={receiptData} tokens={tokenReceiptData} />
    </div>
  );
}
