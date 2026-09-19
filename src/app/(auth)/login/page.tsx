"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/providers/AuthProvider";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@amaz.com",
      password: "password123",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const responseData = await response.json();
      const user = responseData.user;
      login(responseData.token, user);

      // Determine correct dashboard path based on role
      const roleStr = user.role.toLowerCase();
      
      if (roleStr === "admin" || roleStr === "superadmin") {
        router.push("/superadmin");
      } else if (["receptionist", "pharmacist", "cashier"].includes(roleStr)) {
        router.push("/frontdesk");
      } else {
        router.push(`/${roleStr}`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const MOCK_USERS = [
    { label: "Admin", email: "admin@amaz.com" },
    { label: "Reception", email: "reception@amaz.com" },
    { label: "Doctor", email: "doctor@amaz.com" },
    { label: "Pharmacy", email: "pharmacy@amaz.com" },
    { label: "LabTech", email: "labtech@amaz.com" },
    { label: "Cashier", email: "cashier@amaz.com" },
  ];

  const handleQuickLogin = (email: string) => {
    setValue("email", email);
    setValue("password", "password123");
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

      {/* QUICK LOGIN FOR DEVELOPMENT */}
      <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 text-sm shadow-xl">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Quick Login (Dev)</p>
        <div className="flex flex-wrap gap-2">
          {MOCK_USERS.map(u => (
            <Button 
              key={u.email} 
              type="button" 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white/70"
              onClick={() => handleQuickLogin(u.email)}
            >
              {u.label}
            </Button>
          ))}
        </div>
      </div>

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
              placeholder="name@example.com"
              className="pl-10 bg-white/5 border-white/10 text-white focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary placeholder:text-white/30 h-12 rounded-xl transition-all"
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
              type="password"
              placeholder="••••••••••••"
              className="pl-10 bg-white/5 border-white/10 text-white focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary placeholder:text-white/30 h-12 rounded-xl transition-all"
              {...register("password")}
            />
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
      
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#0a0a0a] px-4 text-white/40 font-semibold tracking-wider">Or continue with</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" type="button" className="bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white h-11 rounded-xl">
          {/* Simple Google SVG Icon */}
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </Button>
        <Button variant="outline" type="button" className="bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white h-11 rounded-xl">
          {/* Simple Facebook SVG Icon */}
          <svg className="w-4 h-4 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook
        </Button>
      </div>

      <p className="text-center text-sm text-white/50 mt-8">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          Create Account
        </Link>
      </p>
      
      <p className="text-center text-xs text-white/30 mt-12">
        © 2026 AMAZ Hospital. All rights reserved.
      </p>
    </div>
  );
}
