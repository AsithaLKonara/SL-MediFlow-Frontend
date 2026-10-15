"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ShieldCheck, UserCheck, Sparkles } from "lucide-react";

export default function PatientPortalLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("123456");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const requestOTP = async (autoBypass = false) => {
    if (!phone) return toast.error("Please enter your phone number");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-portal/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to find patient records");
      
      if (data.patients && data.patients.length > 1) {
        setFamilyMembers(data.patients);
        setSelectedPatientId(data.patients[0].id);
      } else {
        setFamilyMembers([]);
      }

      setOtp("123456");

      if (autoBypass) {
        // Direct test login
        await executeLogin(phone, "123456", data.patients?.[0]?.id);
        return;
      }

      toast.success("Test OTP ready: 123456");
      setStep(2);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const executeLogin = async (targetPhone: string, code: string, targetPatientId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-portal/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: targetPhone, 
          otp: code || "123456",
          patientId: targetPatientId || selectedPatientId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      
      localStorage.setItem("patient_token", data.token);
      toast.success(`Welcome, ${data.patient.fullName}!`);
      window.location.href = "/patient-portal/dashboard";
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    await executeLogin(phone, otp || "123456");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-8 space-y-6">
        {/* Hospital Header */}
        <div className="flex flex-col items-center border-b border-zinc-800 pb-6">
          <img src="/logo.png" alt="Amaz Hospital" className="h-14 object-contain mb-3 brightness-0 invert" />
          <h1 className="text-lg font-bold text-red-500 tracking-wider uppercase">Amaz Hospital Holdings</h1>
          <p className="text-xs text-zinc-400 text-center mt-1">Debarawewa, Tissamaharama<br />T. +94 47 223 9090 | info@amazhospital.com</p>
        </div>

        {/* Temporary Test Bypass Badge */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span><strong>Testing Mode:</strong> OTP verification is bypassed. Default test code is <strong>123456</strong>.</span>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Patient Portal</h2>
          <p className="text-zinc-400 mt-1 text-sm">Access your clinical reports, lab results & prescriptions.</p>
        </div>
        
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Registered Phone Number</label>
              <Input 
                placeholder="e.g. 0712345678" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") requestOTP(false); }}
                className="bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border-zinc-800 text-white focus-visible:ring-orange-500"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button 
                onClick={() => requestOTP(true)} 
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                1-Click Quick Login (Bypass OTP)
              </Button>

              <Button 
                onClick={() => requestOTP(false)} 
                disabled={loading} 
                variant="outline"
                className="w-full border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Proceed to Code Screen
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {familyMembers.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Select Patient Profile</label>
                <div className="space-y-1.5">
                  {familyMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPatientId(m.id)}
                      className={`w-full p-2.5 rounded-lg border text-left text-sm flex items-center justify-between transition-colors ${
                        selectedPatientId === m.id
                          ? "border-orange-500 bg-orange-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="font-semibold">{m.fullName}</span>
                      <span className="text-xs text-zinc-400">{m.ageFallback ? `${m.ageFallback} yrs` : ""} {m.gender || ""}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-zinc-300">Enter OTP</label>
                <span className="text-[11px] text-amber-400">Test Code: 123456</span>
              </div>
              <Input 
                placeholder="123456" 
                value={otp}
                onChange={e => setOtp(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") verifyOTP(); }}
                className="bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border-zinc-800 text-white focus-visible:ring-orange-500 text-center tracking-widest text-lg font-mono font-bold"
                maxLength={6}
              />
            </div>

            <Button onClick={verifyOTP} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Verify & Enter Portal
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
