"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Verification failed");
        }

        setStatus("success");
        setMessage("Your email has been successfully verified.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "An error occurred during verification.");
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="w-full space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {status === "loading" && (
        <div className="space-y-6">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Verifying Email</h2>
            <p className="text-muted-foreground mt-2">Please wait while we verify your email address...</p>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Email Verified</h2>
            <p className="text-muted-foreground mt-2">{message}</p>
          </div>
          <Button className="w-full h-11 font-medium group">
            <Link href="/login" className="flex items-center justify-center w-full h-full">
              Continue to Sign In
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-6">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Verification Failed</h2>
            <p className="text-muted-foreground mt-2">{message}</p>
          </div>
          <Button className="w-full h-11 font-medium" variant="outline">
            <Link href="/login" className="flex items-center justify-center w-full h-full">Back to Sign In</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
