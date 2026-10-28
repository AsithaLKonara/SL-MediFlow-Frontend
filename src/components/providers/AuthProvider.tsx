"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentId?: string | null;
  department?: string | null;
  feeOptions?: number[];
  consultationFee?: number;
  feeType?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const validateSession = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUserStr = localStorage.getItem("user");
        
        if (storedToken && storedUserStr) {
          // Pre-hydrate for immediate UI access
          setToken(storedToken);
          setUser(JSON.parse(storedUserStr));
          setIsLoading(false); // Render UI immediately
          
          // Verify with backend silently
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
            headers: {
              Authorization: `Bearer ${storedToken}`
            },
            credentials: "include"
          });
          
          if (!res.ok) {
            throw new Error("Invalid session");
          }
          
          const data = await res.json();
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          // If on a public display/kiosk or auth route with no stored token,
          // skip probing /auth/refresh to eliminate false-positive 401s and console error spam
          const isPublicRoute = [
            "/customer-display",
            "/login",
            "/register",
            "/forgot-password",
            "/verify-email",
            "/reports",
            "/lab-report-preview"
          ].some(route => pathname?.startsWith(route));

          if (isPublicRoute) {
            setIsLoading(false);
            return;
          }

          // Attempt pure HttpOnly cookie refresh as fallback for protected routes
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
            credentials: "include"
          });
          
          if (!res.ok) {
            throw new Error("No session");
          }
          
          const data = await res.json();
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (error: any) {
        if (error.message !== "No session" && error.message !== "Invalid session") {
          console.error("Session validation failed:", error);
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = async () => {
    // Attempt to close shift if applicable
    if (user && token) {
      const roleStr = user.role.toLowerCase();
      if (roleStr === "doctor") {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/doctors/${user.id}/out`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.error("Failed to checkout doctor shift", e);
        }
      }
      // For Nurse and Receptionist, we could add similar logic if backend supports it.
    }

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.error("Failed to logout from server", e);
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
