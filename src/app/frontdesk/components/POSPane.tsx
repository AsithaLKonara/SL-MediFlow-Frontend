"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, ScanLine, CreditCard, Trash2, Banknote, QrCode, Building, Wallet, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartSync, useRxToPOS, CartItem } from "../hooks/useCartSync";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { usePoleDisplay } from "../../../hooks/usePoleDisplay";
import { usePaymentTerminal } from "../../../hooks/usePaymentTerminal";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { MergedReceiptTemplate } from "../../../components/printing/MergedReceiptTemplate";
import { CheckCircle2, Printer } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { POSHistoryModal } from "./POSHistoryModal";
import { calculateDispenseQuantity } from "@/lib/prescriptionUtils";
import { useCallback } from "react";

interface Medicine {
  id: string;
  name: string;
  barcode: string;
  stockBatches?: { unitPrice: number; currentQuantity?: number }[];
}

export function POSPane() {
  const { token, user } = useAuth();
  
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
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [searchingBarcodeCode, setSearchingBarcodeCode] = useState<string | null>(null);
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
    if (!token) return;
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/medicines?limit=1000`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load medicines");
        return r.json();
      })
      .then((d) => setAvailableMedicines(d.data || d))
      .catch((e) => {
        console.error("Failed to load medicines", e);
      });
  }, [token]);

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
    return onPrescriptionReceived(
      async (rxItems, rxId, doctor, consultationPaid, visitId, patientId, meta) => {
        setCart((prev) => {
          const updated = [...prev];
          for (const rxItem of rxItems) {
            const idx = updated.findIndex((i) => i.id === rxItem.id);
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                qty: (updated[idx].qty || 0) + rxItem.qty,
                dosage: rxItem.dosage || updated[idx].dosage,
                frequency: rxItem.frequency || updated[idx].frequency,
                duration: rxItem.duration || updated[idx].duration,
                instructions: rxItem.instructions || updated[idx].instructions,
              };
            } else {
              updated.push(rxItem);
            }
          }
          return updated;
        });
        setActivePrescriptionId(rxId);
        if (visitId) setActiveVisitId(visitId);
        if (patientId) setActivePatientId(patientId);

        let invoiceData: any = null;
        if (visitId) {
          try {
            const invRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices?visitId=${visitId}`);
            if (invRes.ok) {
              const fetchedInv = await invRes.json();
              if (fetchedInv && fetchedInv.status === "DRAFT") {
                if (Array.isArray(fetchedInv.lineItems)) {
                  let seenConsult = false;
                  fetchedInv.lineItems = fetchedInv.lineItems.filter((li: any) => {
                    if (li.department === "CONSULTATION") {
                      if (seenConsult) return false;
                      seenConsult = true;
                    }
                    return true;
                  });
                  const sumItems = fetchedInv.lineItems.reduce((acc: number, item: any) => acc + (Number(item.total) || 0), 0);
                  fetchedInv.subtotal = sumItems;
                  fetchedInv.totalAmount = Math.max(0, sumItems - (fetchedInv.discountAmount || 0));
                }
                invoiceData = fetchedInv;
              }
            }
          } catch (e) {
            console.error("Failed to fetch invoice for visit", e);
          }
        }

        const fee = doctor?.consultationFee ?? meta?.consultationFee ?? 2500;
        const doctorName = doctor?.fullName ?? meta?.doctorName ?? "Doctor";
        const patientName = meta?.patientName ?? "Walk-in";
        const bookingReference = meta?.bookingReference ?? null;
        const isUpfront = doctor?.feeType === "UPFRONT";
        const isPaid = !!consultationPaid;

        setPendingAppointmentPayload({
          appointmentId: visitId,
          tokenNumber: bookingReference || (visitId ? visitId.substring(0, 8) : "RX"),
          bookingReference,
          patientName,
          doctorName,
          doctorId: doctor?.id,
          fee,
          isUpfront,
          invoice: invoiceData,
          consultationPaid: isPaid,
          isAppointmentCheckout: false,
        });

        // Broadcast status to TokenPane so it can lock the UI
        notifyRxStatus(rxId, "IN_PROGRESS");
        toast.success(`${rxItems.length} medicine(s) and consultation details loaded into POS.`);
      },
      (tokenPayload: any) => {
        if (tokenPayload.isAppointmentCheckout) {
          setPendingAppointmentPayload(tokenPayload);
          setPendingTokenPayload(null);
          toast.success("Appointment checkout loaded into POS.");
        } else {
          setPendingTokenPayload(tokenPayload);
          setPendingAppointmentPayload(null);
          toast.success("Token details loaded into POS checkout.");
        }
      }
    );
  }, [onPrescriptionReceived, notifyRxStatus]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "BANK" | "QR" | null>(null);

  // Discount State
  type DiscountType = "NONE" | "PRESET_5" | "PRESET_10" | "PRESET_15" | "PRESET_20" | "CUSTOM_PERCENT" | "CUSTOM_AMOUNT";
  const [discountType, setDiscountType] = useState<DiscountType>("NONE");
  const [customDiscountValue, setCustomDiscountValue] = useState<string>("");
  const [discountReason, setDiscountReason] = useState<string>("");
  
  const { showAmount, clearDisplay } = usePoleDisplay(true);
  const { initiateCardPayment, isProcessing: isCardProcessing } = usePaymentTerminal();

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const tokenTotal = pendingTokenPayload ? pendingTokenPayload.expectedTotal : 0;
  
  const hasConsultInInvoice = pendingAppointmentPayload?.invoice?.lineItems?.some(
    (li: any) => li.department === "CONSULTATION"
  );
  const appointmentTotal = pendingAppointmentPayload 
    ? (
        (pendingAppointmentPayload.invoice ? pendingAppointmentPayload.invoice.totalAmount : 0) +
        ((!hasConsultInInvoice && !pendingAppointmentPayload.consultationPaid) ? (pendingAppointmentPayload.fee || 0) : 0)
      )
    : 0;
    
  const subtotal = cartSubtotal + tokenTotal + appointmentTotal;

  let discountAmount = 0;
  let discountRateValue = 0;
  let discountDbMode: "PRESET_PERCENT" | "CUSTOM_PERCENT" | "CUSTOM_VALUE" | null = null;

  if (discountType === "PRESET_5") {
    discountDbMode = "PRESET_PERCENT";
    discountRateValue = 5;
    discountAmount = subtotal * 0.05;
  } else if (discountType === "PRESET_10") {
    discountDbMode = "PRESET_PERCENT";
    discountRateValue = 10;
    discountAmount = subtotal * 0.10;
  } else if (discountType === "PRESET_15") {
    discountDbMode = "PRESET_PERCENT";
    discountRateValue = 15;
    discountAmount = subtotal * 0.15;
  } else if (discountType === "PRESET_20") {
    discountDbMode = "PRESET_PERCENT";
    discountRateValue = 20;
    discountAmount = subtotal * 0.20;
  } else if (discountType === "CUSTOM_PERCENT") {
    discountDbMode = "CUSTOM_PERCENT";
    const pct = Math.min(100, Math.max(0, parseFloat(customDiscountValue) || 0));
    discountRateValue = pct;
    discountAmount = subtotal * (pct / 100);
  } else if (discountType === "CUSTOM_AMOUNT") {
    discountDbMode = "CUSTOM_VALUE";
    const val = Math.max(0, parseFloat(customDiscountValue) || 0);
    discountRateValue = val;
    discountAmount = Math.min(subtotal, val);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const getCartItemStock = useCallback((item: CartItem) => {
    const med = availableMedicines.find(
      (m) => m.id === item.id || m.name.toLowerCase() === item.name.toLowerCase()
    );
    const available = med
      ? (med.stockBatches?.reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0) ?? 0)
      : ((item as any).stock ?? 0);
    const isOutOfStock = available <= 0;
    const isInsufficient = available < item.qty;
    return { available, isInsufficient, isOutOfStock };
  }, [availableMedicines]);

  const hasInsufficientStock = cart.some((item) => getCartItemStock(item).isInsufficient);

  // Sync to display whenever cart changes, but preserve checkout state
  useEffect(() => {
    let displayCart = [...cart];

    // Convert pendingTokenPayload into displayCart items
    if (pendingTokenPayload) {
      if (pendingTokenPayload.doctorId) {
        displayCart.push({
          id: 'token-consult',
          name: `Consultation${pendingTokenPayload.isUpfront ? ' (Upfront)' : ''} - Dr. ${pendingTokenPayload.doctorName || ''}`,
          qty: 1,
          price: pendingTokenPayload.doctorFee || 0
        });
      }
      pendingTokenPayload.tests?.forEach((t: any) => {
        const p = pendingTokenPayload.customLabPrices?.[t.id] ?? t.price;
        displayCart.push({ id: t.id, name: `Lab Test: ${t.name}`, qty: 1, price: p });
      });
      pendingTokenPayload.services?.forEach((s: any) => {
        const p = pendingTokenPayload.customServicePrices?.[s.id] ?? s.price;
        displayCart.push({ id: s.id, name: `Extra Service: ${s.name}`, qty: 1, price: p });
      });
    }

    // Convert pendingAppointmentPayload into displayCart items
    if (pendingAppointmentPayload) {
      if (pendingAppointmentPayload.invoice?.lineItems?.length > 0) {
        let seenConsult = false;
        pendingAppointmentPayload.invoice.lineItems.forEach((li: any) => {
          if (li.department === "CONSULTATION") {
            if (seenConsult) return;
            seenConsult = true;
          }
          displayCart.push({ id: li.id, name: li.description, qty: li.quantity, price: li.unitPrice });
        });
      }

      const isPaid = !!pendingAppointmentPayload.consultationPaid;
      const fee = pendingAppointmentPayload.fee || 2500;
      const consultDocName = pendingAppointmentPayload.doctorName || "Doctor";
      const alreadyInInvoice = pendingAppointmentPayload.invoice?.lineItems?.some(
        (li: any) => li.department === "CONSULTATION"
      );

      if (!alreadyInInvoice && (pendingAppointmentPayload.doctorName || pendingAppointmentPayload.fee)) {
        displayCart.push({
          id: 'appt-consult',
          name: `Consultation - Dr. ${consultDocName}`,
          qty: 1,
          price: isPaid ? 0 : fee
        });
      }
    }
    const discountLabel = discountAmount > 0
      ? (discountType === "CUSTOM_PERCENT" || discountType.startsWith("PRESET_")
          ? `Discount (${discountRateValue}%)`
          : "Discount")
      : undefined;

    updateState({
      ...state,
      cart: displayCart,
      subtotal,
      discountAmount: discountAmount > 0 ? discountAmount : 0,
      discountLabel,
      total
    });
  }, [cart, subtotal, discountAmount, discountType, discountRateValue, total, pendingTokenPayload, pendingAppointmentPayload]); // Removed updateState from dependency to prevent loop

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
    if (isSearchingBarcode) return; // Guard against concurrent/duplicate barcode scans

    setIsSearchingBarcode(true);
    setSearchingBarcodeCode(code);

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

        if (rx && rx.status === "DISPENSED") {
          toast.error("This prescription has already been dispensed.");
          return;
        }

        if (rx && rx.items) {
          const cartItems: CartItem[] = rx.items
            .filter((item: any) => item.medicineId && item.medicine)
            .map((item: any) => ({
              id: item.medicine.id,
              name: item.medicine.name,
              qty: calculateDispenseQuantity(item),
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
      } else if (type === "APPOINTMENT") {
        const { appointment, allAppointments, invoice, prescriptions, consultationPaid } = data;
        if (appointment.status === "CANCELLED") {
          toast.error("This appointment has been CANCELLED.");
          return;
        }

        const fee = appointment.User?.consultationFee || 2500;
        const isUpfront = appointment.User?.feeType === "UPFRONT";
        const hasUnpaidInvoice = !!(invoice && invoice.lineItems?.length > 0);
        const hasUnpaidPrescriptions = !!(prescriptions && prescriptions.some((p: any) => p.status !== "DISPENSED" && p.items?.length > 0));

        if (consultationPaid && !hasUnpaidInvoice && !hasUnpaidPrescriptions) {
          setSearchInput("");
          toast.info(`Visit ${appointment.bookingReference || appointment.tokenNumber} is already fully paid.`);
          return;
        }

        setPendingAppointmentPayload({
          appointmentId: appointment.id,
          tokenNumber: appointment.tokenNumber,
          bookingReference: appointment.bookingReference,
          patientName: appointment.Patient?.fullName,
          doctorName: appointment.User?.fullName,
          doctorId: appointment.doctorId,
          isUpfront,
          fee,
          invoice,
          allAppointments,
          consultationPaid,
          isAppointmentCheckout: true
        });

        // Auto-load all active prescriptions into the RX cart if available
        if (prescriptions && prescriptions.length > 0) {
          const allCartItems: CartItem[] = [];
          for (const rx of prescriptions) {
            if (rx.status !== "DISPENSED" && rx.items) {
              const items: CartItem[] = rx.items
                .filter((item: any) => item.medicineId && item.medicine)
                .map((item: any) => ({
                  id: item.medicine.id,
                  name: item.medicine.name,
                  qty: calculateDispenseQuantity(item),
                  price: item.medicine.stockBatches?.[0]?.unitPrice ?? 0,
                }));
              allCartItems.push(...items);

              apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/prescriptions/${rx.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "IN_PROGRESS" }),
              }).catch(console.error);
              notifyRxStatus(rx.id, "IN_PROGRESS");
            }
          }

          if (allCartItems.length > 0) {
            setCart(prev => {
              const updated = [...prev];
              for (const rxItem of allCartItems) {
                const idx = updated.findIndex((i) => i.id === rxItem.id);
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], qty: rxItem.qty };
                } else {
                  updated.push(rxItem);
                }
              }
              return updated;
            });
            setActivePrescriptionId(prescriptions[0]?.id);
            if (prescriptions[0]?.patientId) setActivePatientId(prescriptions[0].patientId);
            if (prescriptions[0]?.visitId) setActiveVisitId(prescriptions[0].visitId);
          }
        }

        setSearchInput("");
        toast.success(`Visit ${appointment.bookingReference || appointment.tokenNumber} loaded for checkout.`);
      }
    } catch (e) {
      console.error(e);
      toast.error(`Error processing barcode ${code}`);
    } finally {
      setIsSearchingBarcode(false);
      setSearchingBarcodeCode(null);
    }
  };

  useBarcodeScanner((barcode) => {
    if (!isSearchingBarcode) {
      processBarcode(barcode);
    }
  });

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isSearchingBarcode) return;
      const code = searchInput.trim();
      setSearchInput("");
      processBarcode(code);
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

  const handleCloseCheckout = (_cancelled = false) => {
    // Closing the checkout modal does NOT cancel the active prescription
    // Preserves activePrescriptionId and cart so cashier can adjust items and re-checkout
    setIsCheckoutOpen(false);
    setPaymentMethod(null);
    setReceiptData(null);
    setTokenReceiptData(null);
    setReceivedAmountInput("");
    setDiscountType("NONE");
    setCustomDiscountValue("");
    setDiscountReason("");
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
    setPendingAppointmentPayload(null);
    setPendingTokenPayload(null);
    toast.info("Prescription cancelled. Cart cleared.");
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0 && !pendingTokenPayload && !pendingAppointmentPayload) {
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
          <POSHistoryModal />
          <Button variant="outline" size="sm" onClick={() => window.open('/customer-display', '_blank', 'width=1024,height=768')}>
            Open Display
          </Button>
        </div>
      </div>

      {/* Barcode Searching Status Banner */}
      {isSearchingBarcode && (
        <div className="bg-primary/5 border border-primary/20 text-primary px-3 py-2 rounded-lg flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-1 shrink-0">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <span>Resolving barcode <strong className="font-mono text-foreground font-semibold">{searchingBarcodeCode}</strong> across visits, prescriptions, and services...</span>
          </div>
          <span className="text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded border border-border">Searching Manifest</span>
        </div>
      )}

      {/* Barcode/Search Input */}
      <div className="relative shrink-0">
        {isSearchingBarcode ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        ) : (
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <Input
          placeholder={isSearchingBarcode ? `Searching visit manifest for ${searchingBarcodeCode}...` : "Scan barcode or search medicine..."}
          className={cn(
            "pl-9 bg-background border-border transition-all",
            isSearchingBarcode && "border-primary/50 ring-2 ring-primary/20 bg-primary/[0.02]"
          )}
          value={searchInput}
          disabled={isSearchingBarcode}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setActiveDrugSearch(true);
          }}
          onFocus={() => setActiveDrugSearch(true)}
          onBlur={() => setTimeout(() => setActiveDrugSearch(false), 200)}
          onKeyDown={handleBarcodeScan}
          autoFocus
        />

        {isSearchingBarcode && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold animate-pulse shadow-sm">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Searching...</span>
          </div>
        )}
        
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
            {cart.map((item) => {
              const stockInfo = getCartItemStock(item);
              const isInsufficient = stockInfo.isInsufficient;

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    "border-border transition-colors",
                    isInsufficient && "bg-red-500/10 border-red-500/30"
                  )}
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span className={cn(isInsufficient && "text-red-700 dark:text-red-400 font-bold")}>
                        {item.name}
                      </span>
                      {isInsufficient && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                          {stockInfo.isOutOfStock ? "Out of Stock" : "Insufficient Stock"}
                        </span>
                      )}
                    </div>
                    {(item.dosage || item.frequency || item.duration || item.instructions) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        {item.dosage && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[11px]">
                            {item.dosage}
                          </span>
                        )}
                        {item.frequency && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium text-[11px]">
                            {item.frequency}
                          </span>
                        )}
                        {item.duration && (
                          <span className="text-[11px] text-muted-foreground font-normal">
                            • {item.duration}
                          </span>
                        )}
                        {item.instructions && (
                          <div className="w-full text-[11px] italic text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/50 mt-0.5">
                            {item.instructions}
                          </div>
                        )}
                      </div>
                    )}
                    {isInsufficient && (
                      <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>
                          {stockInfo.isOutOfStock
                            ? "0 units available in pharmacy"
                            : `Only ${stockInfo.available} in stock (requested: ${item.qty})`}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      id={`qty-input-${item.id}`}
                      type="number"
                      value={item.qty}
                      className={cn(
                        "w-16 h-8 text-right ml-auto bg-background border-border text-foreground",
                        isInsufficient && "border-red-500 focus-visible:ring-red-500 text-red-600 font-bold"
                      )}
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
                      title="Remove Item from POS"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            

            {/* Render Token Payload Itemized */}
            {pendingTokenPayload && (
              <>
                {pendingTokenPayload.doctorId && (
                  <TableRow className="border-border bg-primary/5">
                    <TableCell className="font-medium text-primary">
                      Consultation - Dr. {pendingTokenPayload.doctorName}
                      <div className="text-xs text-muted-foreground font-normal">
                        Patient: {pendingTokenPayload.patientName || "Walk-in"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">1</TableCell>
                    <TableCell className="text-right">
                      {pendingTokenPayload.isUpfront ? `LKR ${(pendingTokenPayload.doctorFee || 0).toFixed(2)}` : "Post Pay"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {pendingTokenPayload.isUpfront ? `LKR ${(pendingTokenPayload.doctorFee || 0).toFixed(2)}` : "LKR 0.00"}
                    </TableCell>
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
                {pendingAppointmentPayload.invoice && pendingAppointmentPayload.invoice.lineItems?.length > 0 && (() => {
                  let seenConsultation = false;
                  const filteredItems = pendingAppointmentPayload.invoice.lineItems.filter((li: any) => {
                    if (li.department === "CONSULTATION") {
                      if (seenConsultation) return false;
                      seenConsultation = true;
                    }
                    return true;
                  });

                  return filteredItems.map((li: any, idx: number) => {
                    let bgClass = "bg-purple-500/5";
                    let textClass = "text-purple-600";
                    let subText = `Phone Booking - Token ${pendingAppointmentPayload.tokenNumber}`;

                    if (li.department === "CONSULTATION") {
                      bgClass = "bg-primary/5";
                      textClass = "text-primary";
                      subText = `Patient: ${pendingAppointmentPayload.patientName || "Walk-in"}`;
                    } else if (li.department === "LAB") {
                      bgClass = "bg-blue-500/5";
                      textClass = "text-blue-600";
                      subText = "Lab Test";
                    } else if (li.department === "SERVICE" || li.department === "EXTRA_SERVICE") {
                      bgClass = "bg-orange-500/5";
                      textClass = "text-orange-600";
                      subText = "Extra Service";
                    }

                    return (
                      <TableRow key={`appt-item-${idx}`} className={`border-border ${bgClass}`}>
                        <TableCell className={`font-medium ${textClass}`}>
                          {li.description}
                          <div className="text-xs text-muted-foreground font-normal">
                            {subText}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{li.quantity}</TableCell>
                        <TableCell className="text-right">LKR {li.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">LKR {li.total.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    );
                  });
                })()}
                
                {/* Render Consultations (Upfront or Post Pay) */}
                {pendingAppointmentPayload.allAppointments?.filter((appt: any) => appt.department === "CONSULTATION").map((appt: any, idx: number) => {
                  const isUpfront = appt.User?.feeType === "UPFRONT";
                  const fee = appt.User?.consultationFee || 2500;
                  const docName = appt.User?.fullName || appt.doctorName || "Doctor";
                  const isPaid = !!pendingAppointmentPayload.consultationPaid;
                  
                  // If we have an invoice with a CONSULTATION line item, do not render a duplicate consultation row
                  if (pendingAppointmentPayload.invoice?.lineItems?.some((li: any) => li.department === "CONSULTATION")) {
                     return null;
                  }

                  return (
                    <TableRow key={`postpay-consult-${idx}`} className="border-border bg-primary/5">
                      <TableCell className="font-medium text-primary">
                        Consultation - Dr. {docName}
                        <div className="text-xs text-muted-foreground font-normal">
                          Patient: {pendingAppointmentPayload.patientName || "Walk-in"}
                          {isPaid ? " | Paid" : (!isUpfront ? " | Post Pay" : "")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">1</TableCell>
                      <TableCell className="text-right">
                        LKR {fee.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {isPaid ? "PAID" : `LKR ${fee.toFixed(2)}`}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  );
                })}

                {/* If allAppointments didn't have CONSULTATION but doctorName/fee is on pendingAppointmentPayload */}
                {!pendingAppointmentPayload.invoice?.lineItems?.some((li: any) => li.department === "CONSULTATION") && (!pendingAppointmentPayload.allAppointments || !pendingAppointmentPayload.allAppointments.some((a: any) => a.department === "CONSULTATION")) && (pendingAppointmentPayload.doctorName || pendingAppointmentPayload.fee) && (
                  <TableRow key="fallback-consult" className="border-border bg-primary/5">
                    <TableCell className="font-medium text-primary">
                      Consultation - Dr. {pendingAppointmentPayload.doctorName || "Doctor"}
                      <div className="text-xs text-muted-foreground font-normal">
                        Patient: {pendingAppointmentPayload.patientName || "Walk-in"}
                        {pendingAppointmentPayload.consultationPaid ? " | Paid" : (!pendingAppointmentPayload.isUpfront ? " | Post Pay" : "")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">1</TableCell>
                    <TableCell className="text-right">
                      LKR {(pendingAppointmentPayload.fee || 2500).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {pendingAppointmentPayload.consultationPaid ? "PAID" : `LKR ${(pendingAppointmentPayload.fee || 2500).toFixed(2)}`}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
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

            {cart.length === 0 && !pendingTokenPayload && !pendingAppointmentPayload && (
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
      <div className="shrink-0 mt-auto bg-card border border-border rounded-lg p-4 space-y-3 shadow-lg">
        <div className="flex justify-between text-muted-foreground text-sm">
          <span>Subtotal</span>
          <span>LKR {subtotal.toFixed(2)}</span>
        </div>

        {/* Discount Selector */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-muted-foreground">Discount</span>
            {discountAmount > 0 && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                - LKR {discountAmount.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {(["NONE", "PRESET_5", "PRESET_10", "PRESET_15", "PRESET_20", "CUSTOM_PERCENT", "CUSTOM_AMOUNT"] as const).map((t) => {
              const label = t === "NONE" ? "0%" : t === "PRESET_5" ? "5%" : t === "PRESET_10" ? "10%" : t === "PRESET_15" ? "15%" : t === "PRESET_20" ? "20%" : t === "CUSTOM_PERCENT" ? "Custom %" : "Custom LKR";
              const isActive = discountType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setDiscountType(t);
                    if (t === "NONE") setCustomDiscountValue("");
                  }}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {(discountType === "CUSTOM_PERCENT" || discountType === "CUSTOM_AMOUNT") && (
            <div className="pt-1 flex gap-2">
              <Input
                type="number"
                value={customDiscountValue}
                onChange={(e) => setCustomDiscountValue(e.target.value)}
                placeholder={discountType === "CUSTOM_PERCENT" ? "Enter % (e.g. 8)" : "Enter LKR (e.g. 500)"}
                className="h-8 text-xs bg-background"
              />
            </div>
          )}
        </div>

        <div className="flex justify-between text-2xl font-bold text-primary pt-1 border-t border-border">
          <span>Total</span>
          <span>LKR {total.toFixed(2)}</span>
        </div>

        {hasInsufficientStock && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-xs font-semibold text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider">Cannot Checkout:</span>{" "}
              <span>One or more prescription items have insufficient stock in the pharmacy. Please remove the out-of-stock item(s) to proceed with checkout.</span>
            </div>
          </div>
        )}

        <Button
          className={cn(
            "w-full h-12 text-lg",
            hasInsufficientStock && "opacity-60 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
          )}
          onClick={handleOpenCheckout}
          disabled={hasInsufficientStock || (cart.length === 0 && !pendingTokenPayload && !pendingAppointmentPayload)}
        >
          <CreditCard className="w-5 h-5 mr-2" />
          {hasInsufficientStock ? "Insufficient Stock — Remove Item" : "Checkout"}
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
                <div className="text-muted-foreground w-full p-4 bg-muted rounded-lg text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Subtotal</span>
                    <span>LKR {(receiptData.subtotal || receiptData.total).toFixed(2)}</span>
                  </div>
                  {receiptData.discount !== undefined && receiptData.discount > 0 && (
                    <div className="flex justify-between mb-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Discount</span>
                      <span>- LKR {receiptData.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-1 text-base font-bold text-foreground pt-1 border-t border-border">
                    <span>Total Paid</span>
                    <span>LKR {receiptData.total.toFixed(2)}</span>
                  </div>
                  {receiptData.change > 0 && (
                    <div className="flex justify-between text-green-500 mt-1">
                      <span>Change Due</span>
                      <span className="font-bold">LKR {receiptData.change.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between mt-2 pt-1 border-t border-border text-xs">
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
            <div className="p-4 space-y-5">
              <div className="text-center p-3 bg-muted/40 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  Subtotal: LKR {subtotal.toFixed(2)}
                  {discountAmount > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-2">
                      (- LKR {discountAmount.toFixed(2)})
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold text-primary">LKR {total.toFixed(2)}</div>
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
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-medium">Received Amount (LKR)</label>
                    {receivedAmountInput && (parseFloat(receivedAmountInput) - total >= 0) ? (
                      <div className="text-sm font-bold text-green-600 dark:text-green-500">
                        Balance: LKR {(parseFloat(receivedAmountInput) - total).toFixed(2)}
                      </div>
                    ) : receivedAmountInput && (parseFloat(receivedAmountInput) - total < 0) ? (
                      <div className="text-sm font-bold text-red-600 dark:text-red-400 animate-pulse">
                        Short by: LKR {(total - parseFloat(receivedAmountInput)).toFixed(2)}
                      </div>
                    ) : null}
                  </div>
                  <Input 
                    type="number" 
                    value={receivedAmountInput} 
                    onChange={(e) => setReceivedAmountInput(e.target.value)}
                    placeholder={total.toString()} 
                    className={cn(
                      "text-lg h-12",
                      receivedAmountInput && (parseFloat(receivedAmountInput) - total < 0) && "border-red-500 focus-visible:ring-red-500 bg-red-50/20 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                    )}
                  />
                  {receivedAmountInput && (parseFloat(receivedAmountInput) - total < 0) && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      ⚠️ Insufficient amount. Total is LKR {total.toFixed(2)}, but received LKR {parseFloat(receivedAmountInput).toFixed(2)}. Payment cannot proceed until full payment is received.
                    </p>
                  )}
                </div>
              )}



              <Button 
                className="w-full h-12 text-lg" 
                disabled={(total > 0 && !paymentMethod) || (Boolean(receivedAmountInput) && parseFloat(receivedAmountInput) < total)}
                isLoading={isProcessing || isCardProcessing}
                loadingText="Processing..."
                onClick={async () => {
                  if (isProcessing) return;
                  setIsProcessing(true);

                  if (total > 0 && !paymentMethod) {
                     toast.error("Please select a payment method.");
                     setIsProcessing(false);
                     return;
                  }

                  const activePaymentMethod = paymentMethod || "CASH";

                  // Enforce strict check on received amount for cash / bank payments
                  if ((activePaymentMethod === "CASH" || activePaymentMethod === "BANK") && total > 0) {
                    const parsedReceivedVal = receivedAmountInput.trim() !== "" ? parseFloat(receivedAmountInput) : total;
                    if (isNaN(parsedReceivedVal) || parsedReceivedVal < total) {
                      const shortage = total - (isNaN(parsedReceivedVal) ? 0 : parsedReceivedVal);
                      toast.error(`Insufficient amount received! Total is LKR ${total.toFixed(2)}, but received LKR ${(isNaN(parsedReceivedVal) ? 0 : parsedReceivedVal).toFixed(2)}. Short by LKR ${shortage.toFixed(2)}.`);
                      setIsProcessing(false);
                      return;
                    }
                  }

                  if (activePaymentMethod === "CARD" && total > 0) {
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

                    let createdInvoiceId: string | null = null;

                    const discountPayload = discountAmount > 0 ? {
                      type: discountDbMode,
                      value: discountRateValue,
                      amount: discountAmount,
                      reason: discountReason || undefined
                    } : undefined;

                    // 1. Generate Token if payload exists
                    if (pendingTokenPayload) {
                      const resToken = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/token`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          ...pendingTokenPayload, 
                          paymentMethod: activePaymentMethod,
                          discount: discountPayload
                        })
                      });
                      if (resToken.ok) {
                        const tokenRes = await resToken.json();
                        tokenResultTokens = tokenRes.data.tokens || [];
                        if (tokenRes.data.invoice) {
                           createdInvoiceId = tokenRes.data.invoice.id;
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

                    // 1.5 Checkout Appointment if payload exists
                    if (pendingAppointmentPayload && pendingAppointmentPayload.isAppointmentCheckout) {
                      const resAppt = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/checkout-appointment`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          appointmentId: pendingAppointmentPayload.appointmentId,
                          fee: pendingAppointmentPayload.consultationPaid ? 0 : pendingAppointmentPayload.fee,
                          isUpfront: pendingAppointmentPayload.isUpfront,
                          paymentMethod: activePaymentMethod,
                          discount: discountPayload
                        })
                      });
                      if (resAppt.ok) {
                        const apptRes = await resAppt.json();
                        // It returns { tokenNumber, department, doctorName, patientName, invoice, tokens }
                        if (apptRes.data.tokens && apptRes.data.tokens.length > 0) {
                          apptRes.data.tokens.forEach((t: any) => {
                            tokenResultTokens.push({
                              id: t.id,
                              refNo: t.bookingReference || t.refNo,
                              tokenNumber: t.tokenNumber,
                              department: t.department,
                              doctorName: t.User?.fullName || apptRes.data.doctorName || "General",
                              patientName: t.Patient?.fullName || apptRes.data.patientName || "Walk-in",
                              status: t.status,
                              appointmentDate: t.appointmentDate,
                              roomNumber: t.roomNumber || t.User?.roomNumber || null
                            });
                          });
                        } else {
                          tokenResultTokens.push({
                            id: apptRes.data.appointment?.id || pendingAppointmentPayload.appointmentId,
                            refNo: apptRes.data.appointment?.bookingReference || pendingAppointmentPayload.bookingReference,
                            tokenNumber: apptRes.data.tokenNumber || pendingAppointmentPayload.tokenNumber,
                            department: apptRes.data.department || "CONSULTATION",
                            doctorName: apptRes.data.doctorName || pendingAppointmentPayload.doctorName,
                            patientName: apptRes.data.patientName || pendingAppointmentPayload.patientName,
                            status: apptRes.data.appointment?.status || "WAITING",
                            appointmentDate: apptRes.data.appointment?.appointmentDate || new Date().toISOString(),
                            roomNumber: apptRes.data.appointment?.roomNumber || null
                          });
                        }

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

                    // 1.6 If there's a pending invoice (e.g. from lab tests or consultation during Rx checkout)
                    const hasConsultInInv = pendingAppointmentPayload?.invoice?.lineItems?.some(
                      (li: any) => li.department === "CONSULTATION"
                    );

                    if (pendingAppointmentPayload && !pendingAppointmentPayload.isAppointmentCheckout && pendingAppointmentPayload.invoice) {
                       const invId = pendingAppointmentPayload.invoice.id;
                       const invAmount = pendingAppointmentPayload.invoice.totalAmount;
                       if (invId && invAmount > 0 && pendingAppointmentPayload.invoice.status === "DRAFT") {
                         const payRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/invoices/${invId}/pay`, {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({
                             amount: Math.max(0, invAmount - (discountAmount || 0)),
                             method: activePaymentMethod,
                             discount: discountPayload
                           })
                         });
                         if (!payRes.ok) {
                           const err = await payRes.json().catch(() => ({}));
                           toast.error(err.error || "Failed to finalize consultation/lab invoice payment");
                           setIsProcessing(false);
                           return;
                         }
                         createdInvoiceId = invId;
                       }

                       pendingAppointmentPayload.invoice.lineItems.forEach((li: any) => {
                         combinedItems.push({
                           name: li.description,
                           qty: li.quantity,
                           price: li.unitPrice,
                           total: li.total
                         });
                       });
                    }

                    // 1.7 If consultation was not in a draft invoice and not paid, check it out to record revenue
                    if (
                      pendingAppointmentPayload &&
                      !pendingAppointmentPayload.isAppointmentCheckout &&
                      !pendingAppointmentPayload.consultationPaid &&
                      !hasConsultInInv &&
                      pendingAppointmentPayload.appointmentId
                    ) {
                      const resAppt = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/checkout-appointment`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          appointmentId: pendingAppointmentPayload.appointmentId,
                          fee: pendingAppointmentPayload.fee || 2500,
                          isUpfront: pendingAppointmentPayload.isUpfront,
                          paymentMethod: activePaymentMethod,
                          discount: discountPayload
                        })
                      });
                      if (resAppt.ok) {
                        const apptRes = await resAppt.json();
                        if (apptRes.data?.invoice?.lineItems?.length > 0) {
                          apptRes.data.invoice.lineItems.forEach((li: any) => {
                            if (!combinedItems.some(ci => ci.name === li.description)) {
                              combinedItems.push({
                                name: li.description,
                                qty: li.quantity,
                                price: li.unitPrice,
                                total: li.total
                              });
                            }
                          });
                        } else {
                          combinedItems.push({
                            name: `Consultation - Dr. ${pendingAppointmentPayload.doctorName || 'Doctor'}`,
                            qty: 1,
                            price: pendingAppointmentPayload.fee || 2500,
                            total: pendingAppointmentPayload.fee || 2500
                          });
                        }
                      }
                    }

                    let receiptId = tokenResultTokens?.[0]?.refNo || pendingAppointmentPayload?.bookingReference || createdInvoiceId || `TXN-${Date.now()}`;
                    if (cart.length > 0) {
                      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/pharmacy/sell`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          items: cart, 
                          paymentMethod: activePaymentMethod,
                          prescriptionId: activePrescriptionId,
                          patientId: activePatientId,
                          visitId: activeVisitId,
                          discount: discountPayload
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
                      masterBarcode: pendingAppointmentPayload?.bookingReference || pendingTokenPayload?.refNo || receiptId,
                      bookingReference: pendingAppointmentPayload?.bookingReference || pendingTokenPayload?.refNo,
                      refNo: pendingAppointmentPayload?.bookingReference || pendingTokenPayload?.refNo,
                      date: new Date(),
                      items: combinedItems,
                      subtotal: subtotal,
                      discount: discountAmount,
                      total: total,
                      paymentMethod: activePaymentMethod,
                      receivedAmount: (activePaymentMethod === "CASH" || activePaymentMethod === "BANK") ? parsedReceived : total,
                      change: (activePaymentMethod === "CASH" || activePaymentMethod === "BANK") ? Math.max(0, parsedReceived - total) : 0
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
                Complete Payment
              </Button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden print template */}
      <MergedReceiptTemplate ref={printRef} receiptData={receiptData} tokens={tokenReceiptData} cashierName={user?.fullName || "Unknown"} />
    </div>
  );
}
