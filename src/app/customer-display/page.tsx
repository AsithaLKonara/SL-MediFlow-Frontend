"use client";

import { useCartSync } from "../frontdesk/hooks/useCartSync";
import { ShoppingBag, BellRing, Receipt } from "lucide-react";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function CustomerDisplayPage() {
  const { state } = useCartSync(false); // Receiver
  const [mounted, setMounted] = useState(false);
  const [calledTokens, setCalledTokens] = useState<{ id: string; number: string; doctor: string; room?: string; specialty?: string }[]>([]);

  useEffect(() => {
    setMounted(true);

    const socket: Socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');
    
    socket.on("TOKEN_STATUS_UPDATED", (data) => {
      if (data.appointment?.status === "CONSULTATION") {
        setCalledTokens(prev => {
          const newToken = {
            id: data.appointment.id,
            number: String(data.appointment.tokenNumber).padStart(2, '0'),
            doctor: data.appointment.User?.fullName || "Doctor",
            room: data.appointment.User?.roomNumber || "No Room",
            specialty: data.appointment.User?.specialty || "OPD"
          };
          
          // Play an announcement sound
          try {
            const audio = new Audio('/bell.mp3');
            audio.play().catch(e => console.log("Audio play blocked by browser", e));
          } catch (e) {}

          // Remove duplicates and keep only last 4
          const filtered = prev.filter(t => t.id !== newToken.id);
          return [newToken, ...filtered].slice(0, 4);
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!mounted) {
    return <div className="flex h-screen w-full bg-background flex-col items-center justify-center text-muted-foreground">Loading Display...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full lg:h-screen lg:overflow-hidden">
      {/* Left Side: Tokens / Announcements */}
      <div className="w-full lg:w-1/2 min-h-[40vh] lg:h-full bg-secondary/10 border-b lg:border-b-0 lg:border-r border-border p-4 md:p-8 flex flex-col items-center justify-center relative">
        <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 md:gap-4">
          <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
            <BellRing className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-secondary">Now Serving</h2>
        </div>

        {calledTokens.length > 0 ? (
          <div className="w-full flex flex-col items-center animate-in zoom-in duration-500">
            {/* Latest Called Token */}
            <div className="text-center bg-primary/5 p-8 rounded-3xl border border-primary/20 w-full mb-6">
              <p className="text-xl md:text-2xl text-primary font-bold uppercase tracking-widest mb-4">
                {calledTokens[0].specialty}
              </p>
              <h1 className="text-7xl md:text-[140px] font-black text-foreground tracking-tighter leading-none mb-6">
                {calledTokens[0].number}
              </h1>
              <p className="text-2xl md:text-4xl text-muted-foreground font-medium mb-2">
                {calledTokens[0].doctor}
              </p>
              <p className="text-xl md:text-3xl text-foreground font-bold">
                {calledTokens[0].room}
              </p>
            </div>

            {/* Previously Called Tokens */}
            {calledTokens.length > 1 && (
              <div className="w-full mt-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-left px-2">Previous Tokens</p>
                {calledTokens.slice(1).map((token) => (
                  <div key={token.id} className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-3xl font-black">{token.number}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg">{token.doctor}</p>
                        <p className="text-sm text-muted-foreground">{token.specialty}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl">{token.room}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : state.tokenCalled ? (
          <div className="text-center animate-in zoom-in duration-500 bg-primary/5 p-8 rounded-3xl border border-primary/20 w-full">
            <p className="text-xl md:text-2xl text-primary font-bold uppercase tracking-widest mb-4">PHARMACY / BILLING</p>
            <h1 className="text-7xl md:text-[140px] font-black text-foreground tracking-tighter leading-none mb-6">
              {state.tokenCalled.number}
            </h1>
            <p className="text-2xl md:text-4xl text-muted-foreground font-medium">
              Please proceed to {state.tokenCalled.doctor}
            </p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground flex flex-col items-center">
            <Image src="/logo.png" alt="AMAZ Hospital" width={400} height={120} className="mb-4 object-contain opacity-80" priority />
            <p className="text-lg md:text-xl">Waiting for next token...</p>
          </div>
        )}
      </div>

      {/* Right Side: POS Receipt */}
      <div className="w-full lg:w-1/2 flex-1 lg:h-full bg-background p-4 md:p-8 flex flex-col relative">
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-primary">Your Receipt</h2>
        </div>

        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-background">
                <TableRow className="border-border border-b-2">
                  <TableHead className="text-base md:text-lg py-3 md:py-4">Item</TableHead>
                  <TableHead className="text-base md:text-lg py-3 md:py-4 text-center">Qty</TableHead>
                  <TableHead className="text-base md:text-lg py-3 md:py-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.cart.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="text-lg md:text-xl font-medium py-3 md:py-4">{item.name}</TableCell>
                    <TableCell className="text-lg md:text-xl text-center text-muted-foreground py-3 md:py-4">{item.qty}</TableCell>
                    <TableCell className="text-lg md:text-xl text-right py-3 md:py-4">LKR {(item.price * item.qty).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {state.cart.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-40 md:h-48 text-center text-lg md:text-xl text-muted-foreground">
                      <div className="flex flex-col items-center gap-3 md:gap-4 justify-center">
                        <ShoppingBag className="w-10 h-10 md:w-12 md:h-12 opacity-50" />
                        No items scanned yet
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totals Footer */}
          <div className="bg-background p-4 md:p-8 border-t-2 border-border space-y-3 md:space-y-4">
            <div className="flex justify-between text-xl md:text-2xl text-muted-foreground">
              <span>Subtotal</span>
              <span>LKR {state.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-3xl md:text-5xl font-bold text-primary pt-3 md:pt-4 border-t border-border">
              <span>Total</span>
              <span>LKR {state.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Overlay */}
        {state.checkout?.status === "PAYING" && (state.checkout.method === "BANK" || state.checkout.method === "QR") && (
          <div className="absolute inset-4 md:inset-8 bg-card/95 backdrop-blur-md border border-border rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 z-50 shadow-2xl">
            {state.checkout.method === "QR" ? (
              <>
                <div className="w-64 h-64 bg-card text-card-foreground p-4 rounded-xl shadow-lg flex items-center justify-center mb-6">
                  {/* Placeholder for actual QR code */}
                  <div className="w-full h-full border-4 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 font-medium text-lg text-center p-4">
                    LANKAQR<br/>Code
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-primary mb-2">Scan to Pay</h2>
                <p className="text-xl text-muted-foreground">Amount: LKR {state.total.toFixed(2)}</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                  <Receipt className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-primary mb-4">Bank Transfer Details</h2>
                <div className="bg-background border border-border rounded-xl p-6 text-left space-y-2 w-full max-w-sm mb-6">
                  <p className="text-muted-foreground text-sm">Bank Name</p>
                  <p className="text-lg font-semibold text-foreground mb-4">Commercial Bank</p>
                  <p className="text-muted-foreground text-sm">Account Name</p>
                  <p className="text-lg font-semibold text-foreground mb-4">AMAZ Hospital (Pvt) Ltd</p>
                  <p className="text-muted-foreground text-sm">Account Number</p>
                  <p className="text-2xl font-mono font-bold text-primary">1000 234 5678</p>
                </div>
                <p className="text-xl text-muted-foreground">Amount: LKR {state.total.toFixed(2)}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
