"use client";

import { useState, useEffect } from "react";

import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

export type ShiftState = {
  id?: string;
  isOpen: boolean;
  startedAt: string | null;
  startingFloat: number;
  cashierName: string;
};

export function useShift() {
  const { token } = useAuth();
  const [shift, setShift] = useState<ShiftState>({
    isOpen: false,
    startedAt: null,
    startingFloat: 0,
    cashierName: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);

  const fetchShift = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/shift/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setShift(data.data);
      } else {
        setShift({
          isOpen: false,
          startedAt: null,
          startingFloat: 0,
          cashierName: "",
        });
      }
    } catch (e) {
      console.error("Failed to fetch shift state", e);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchShift();
  }, [token]);

  const openShift = async (cashierName: string, startingFloat: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/open-shift`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ startingFloat })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Shift opened successfully");
        fetchShift(); // refresh
      } else {
        toast.error(data.error || "Failed to open shift");
      }
    } catch (e) {
      toast.error("Network error opening shift");
    }
  };

  const closeShift = async (declaredCash: number) => {
    return new Promise<{summary: any} | null>(async (resolve) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reception/shift-summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ declaredCash })
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Shift closed successfully");
          setShift({
            isOpen: false,
            startedAt: null,
            startingFloat: 0,
            cashierName: "",
          });
          resolve({ summary: data.data });
        } else {
          toast.error(data.error || "Failed to close shift");
          resolve(null);
        }
      } catch (e) {
        toast.error("Network error closing shift");
        resolve(null);
      }
    });
  };

  return {
    shift,
    isLoaded,
    openShift,
    closeShift,
    refreshShift: fetchShift
  };
}
