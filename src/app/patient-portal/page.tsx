"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Phone, KeyRound, ArrowLeft, RefreshCw, CheckCircle2, User } from "lucide-react";

export default function PatientPortalLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const maskPhone = (num: string) => {
    const clean = num.trim();
    if (clean.length >= 7) {
      return clean.slice(0, 3) + " ••• " + clean.slice(-3);
    }
    return clean;
  };

  const requestOTP = async (isResend = false) => {
    if (!phone || phone.trim().length < 9) {
      return toast.error("Please enter a valid phone number (e.g. 07XXXXXXXX)");
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-portal/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to find patient records");
      
      if (data.patients && data.patients.length > 1) {
        setFamilyMembers(data.patients);
        setSelectedPatientId(data.patients[0].id);
      } else {
        setFamilyMembers([]);
        setSelectedPatientId(null);
      }

      setOtp("");
      setResendTimer(60);
      toast.success(isResend ? "New verification code sent via SMS" : "Verification code sent to your phone via SMS");
      setStep(2);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      return toast.error("Please enter the 6-digit verification code");
    }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patient-portal/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone: phone.trim(), 
          otp: cleanOtp,
          patientId: selectedPatientId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      
      localStorage.setItem("patient_token", data.token);
      toast.success(`Welcome, ${data.patient.fullName}!`);
      window.location.href = "/patient-portal/dashboard";
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 selection:bg-orange-500/20">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Hospital Header */}
        <div className="flex flex-col items-center border-b border-zinc-800 pb-6 text-center">
          <img src="/logo.png" alt="Amaz Hospital" className="h-14 object-contain mb-3 brightness-0 invert" />
          <h1 className="text-base font-bold text-red-500 tracking-wider uppercase">Amaz Hospital Holdings</h1>
          <p className="text-xs text-zinc-400 mt-1">Debarawewa, Tissamaharama<br />T. +94 47 223 9090 | info@amazhospital.com</p>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Patient Portal</h2>
          <p className="text-zinc-400 mt-1 text-sm">Access your clinical reports, lab results & prescriptions securely.</p>
        </div>
        
        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400" />
                Registered Phone Number
              </label>
              <Input 
                type="tel"
                placeholder="e.g. 0712345678" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") requestOTP(false); }}
                autoFocus
                className="bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border-zinc-800 text-white focus-visible:ring-orange-500 text-base py-5 tracking-wide"
              />
              <p className="text-xs text-zinc-500">Enter the phone number provided during hospital registration.</p>
            </div>

            <Button 
              onClick={() => requestOTP(false)} 
              disabled={loading || !phone} 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-5 text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Verification Code...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Send Verification Code via SMS
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-300 flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span>A 6-digit verification code was sent to </span>
                <span className="font-mono font-bold text-white">{maskPhone(phone)}</span>.
                <p className="text-zinc-500 mt-0.5">Please check your messages and enter the code below.</p>
              </div>
            </div>

            {familyMembers.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  Select Patient Profile
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {familyMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPatientId(m.id)}
                      className={`w-full p-2.5 rounded-xl border text-left text-sm flex items-center justify-between transition-all ${
                        selectedPatientId === m.id
                          ? "border-orange-500 bg-orange-500/10 text-white"
                          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800/60"
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
              <label className="text-sm font-medium text-zinc-300">Enter 6-Digit Code</label>
              <Input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••" 
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                onKeyDown={e => { if (e.key === "Enter") verifyOTP(); }}
                autoFocus
                className="bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-950 border-zinc-800 text-white focus-visible:ring-orange-500 text-center tracking-[0.5em] text-2xl font-mono font-bold py-6"
                maxLength={6}
              />
            </div>

            <Button 
              onClick={verifyOTP} 
              disabled={loading || otp.trim().length !== 6} 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-5 text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Verify & Enter Portal
                </>
              )}
            </Button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button 
                type="button"
                onClick={() => setStep(1)} 
                className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change phone
              </button>

              {resendTimer > 0 ? (
                <span className="text-zinc-500">Resend SMS in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => requestOTP(true)}
                  disabled={loading}
                  className="text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend SMS Code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
