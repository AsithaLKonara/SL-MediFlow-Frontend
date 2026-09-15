"use client";

import { useState, useEffect } from "react";

export type ShiftState = {
  isOpen: boolean;
  startedAt: string | null;
  startingFloat: number;
  cashierName: string;
};

const SHIFT_STORAGE_KEY = "AMAZ_FRONTDESK_SHIFT";

export function useShift() {
  const [shift, setShift] = useState<ShiftState>({
    isOpen: false,
    startedAt: null,
    startingFloat: 0,
    cashierName: "",
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SHIFT_STORAGE_KEY);
    if (stored) {
      try {
        setShift(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse shift state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const openShift = (cashierName: string, startingFloat: number) => {
    const newState: ShiftState = {
      isOpen: true,
      startedAt: new Date().toISOString(),
      startingFloat,
      cashierName,
    };
    setShift(newState);
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(newState));
  };

  const closeShift = () => {
    const newState: ShiftState = {
      isOpen: false,
      startedAt: null,
      startingFloat: 0,
      cashierName: "",
    };
    setShift(newState);
    localStorage.removeItem(SHIFT_STORAGE_KEY);
  };

  return {
    shift,
    isLoaded,
    openShift,
    closeShift,
  };
}
