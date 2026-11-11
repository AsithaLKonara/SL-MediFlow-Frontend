"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/providers/AuthProvider";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }).transform(val => val.trim().toLowerCase()),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          email: data.email.trim().toLowerCase(),
        }),
      });

      let responseData;
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response from server:", text.substring(0, 200));
        throw new Error("Server returned an invalid response (not JSON). Is the backend running at " + process.env.NEXT_PUBLIC_API_URL + "?");
      }

      if (!response.ok) {
        throw new Error(responseData.error || "Login failed");
      }

      const user = responseData.user;
      login(responseData.token, user);

      // Determine correct dashboard path based on role
      const roleStr = (user.roleName || user.role || "").toLowerCase();
      
      if (roleStr === "admin" || roleStr === "superadmin") {
        router.push("/superadmin");
      } else if (["extra services", "extra_services", "extraservices"].includes(roleStr) || (user.permissions?.includes("Extra Services") && !["admin", "superadmin", "doctor"].includes(roleStr))) {
        router.push("/extra-services");
      } else if (roleStr === "nurse") {
        router.push("/frontdesk");
      } else if (["receptionist", "pharmacist", "cashier"].includes(roleStr)) {
        router.push("/frontdesk");
      } else if (roleStr === "doctor") {
        router.push("/doctor");
      } else if (roleStr === "labtech") {
        router.push("/labtech");
      } else {
        const sanitizedRole = roleStr.replace(/\s+/g, "-");
        router.push(`/${sanitizedRole}`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-white">
      {/* Back to home link */}
      <Link href="/" className="inline-flex items-center text-sm font-medium text-white/50 hover:text-white transition-colors mb-8">
        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
        Back to home
      </Link>

      <div>
        <h2 className="text-4xl font-bold tracking-tight text-white mb-2">Welcome <span className="italic font-serif text-primary">Back</span></h2>
        <p className="text-white/50">Enter your credentials to access your workspace</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 text-red-400 rounded-md flex items-start gap-2 text-sm border border-red-500/20">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-white/50 font-bold">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
            <Input
              id="email"
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="name@example.com"
              className="pl-10 bg-black/40 border-white/10 text-white focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:bg-black/60 placeholder:text-white/30 h-12 rounded-xl transition-all dark:bg-black/40 dark:focus:bg-black/60"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-white/50 font-bold">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              className="pl-10 pr-10 bg-black/40 border-white/10 text-white focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary focus:bg-black/60 placeholder:text-white/30 h-12 rounded-xl transition-all dark:bg-black/40 dark:focus:bg-black/60"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-white/40 hover:text-white transition-colors px-2"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox id="remember" className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
          <Label
            htmlFor="remember"
            className="text-sm font-medium leading-none text-white/60 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Stay signed in for 30 days
          </Label>
        </div>

        <Button type="submit" className="w-full h-12 font-semibold text-white group bg-primary hover:bg-primary/90 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 ml-2 opacity-70 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>
      

      
      <p className="text-center text-xs text-white/30 mt-12">
        © 2026 SL MediFlow. All rights reserved.
      </p>
    </div>
  );
}
