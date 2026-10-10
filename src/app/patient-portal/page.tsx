"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PatientPortalLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const requestOTP = async () => {
    if (!phone) return toast.error("Please enter your phone number");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-portal/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      
      toast.success("OTP sent to your phone");
      setStep(2);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp) return toast.error("Please enter the OTP");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-portal/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      
      localStorage.setItem("patient_token", data.token);
      window.location.href = "/patient-portal/dashboard";
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-8 space-y-6">
        {/* Hospital Header */}
        <div className="flex flex-col items-center border-b border-zinc-800 pb-6">
          <img src="/logo.png" alt="Amaz Hospital" className="h-14 object-contain mb-3 brightness-0 invert" />
          <h1 className="text-lg font-bold text-red-500 tracking-wider uppercase">Amaz Hospital Holdings</h1>
          <p className="text-xs text-zinc-400 text-center mt-1">debarawewa, Tissamaharama<br />T. +94 47 223 9090 | info@amazhospital.com</p>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Patient Portal</h2>
          <p className="text-zinc-400 mt-2 text-sm">Access your medical history securely.</p>
        </div>
        
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Phone Number</label>
              <Input 
                placeholder="e.g. 0712345678" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border-zinc-800 text-white focus-visible:ring-orange-500"
              />
            </div>
            <Button onClick={requestOTP} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Enter OTP</label>
              <Input 
                placeholder="6-digit code" 
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border-zinc-800 text-white focus-visible:ring-orange-500 text-center tracking-widest text-lg font-mono"
                maxLength={6}
              />
            </div>
            <Button onClick={verifyOTP} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Verify & Login
            </Button>
            <button onClick={() => setStep(1)} className="text-xs text-zinc-400 hover:text-white w-full text-center mt-2 underline">
              Use a different phone number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
