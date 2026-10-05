"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
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
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          // Verify token against server
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          if (res.status === 401 || res.status === 403) {
            throw new Error("Session expired or invalid");
          } else if (!res.ok) {
            // Check if user simply doesn't exist in DB (e.g. after re-seed)
            try {
              const errData = await res.clone().json();
              if (errData?.error === "User not found") {
                throw new Error("Session expired or invalid");
              }
            } catch (parseErr) {
              // Not a JSON error body, keep session alive for network issues
            }
            console.warn(`Session validation returned ${res.status}, keeping session active.`);
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsLoading(false);
            return;
          }
          
          const userData = await res.json();
          // Update user in case roles/details changed
          const validatedUser = { 
            ...JSON.parse(storedUser), 
            ...userData,
            role: userData.Role?.name || JSON.parse(storedUser).role
          };
          
          setToken(storedToken);
          setUser(validatedUser);
          localStorage.setItem("user", JSON.stringify(validatedUser));
        } catch (error) {
          console.error("Session validation failed:", error);
          // Only clear local storage if we definitively know the token is bad (401/403)
          if (error instanceof Error && error.message === "Session expired or invalid") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
          } else {
            // Keep the session for network errors / server downtime
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        }
      }
      setIsLoading(false);
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
