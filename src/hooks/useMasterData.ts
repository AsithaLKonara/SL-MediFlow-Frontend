"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { sortDoctorsWithOpdFirst } from "@/lib/doctor-utils";

export interface MasterDoctor {
  id: string;
  fullName: string;
  specialty?: string;
  roomNumber?: string;
  feeType?: string;
  consultationFee?: number;
  expectedStartTime?: string;
  isArrived?: boolean;
  arrivedAt?: string;
}

export interface MasterLabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  category?: string;
}

export interface MasterExtraService {
  id: string;
  name: string;
  code?: string;
  price: number;
  cost?: number;
  description?: string;
}

export interface MasterRoom {
  id: string;
  name: string;
  roomNumber: string;
  type?: string;
  status?: string;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * In-Memory Master Data Hook: Doctors
 * Cached for 5 minutes in memory. Returns in 0ms on subsequent calls.
 */
export function useDoctors() {
  const { token } = useAuth();

  return useQuery<MasterDoctor[]>({
    queryKey: ["masterData", "doctors"],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/booking/doctors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      const data = await res.json();
      const docs = data.success ? data.data : Array.isArray(data) ? data : [];
      return sortDoctorsWithOpdFirst(docs);
    },
    staleTime: FIVE_MINUTES_MS,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * In-Memory Master Data Hook: Lab Tests Catalog
 * Cached for 5 minutes in memory.
 */
export function useLabCatalog() {
  const { token } = useAuth();

  return useQuery<MasterLabTest[]>({
    queryKey: ["masterData", "labCatalog"],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/lab/catalog`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch lab catalog");
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    },
    staleTime: FIVE_MINUTES_MS,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * In-Memory Master Data Hook: Extra Services Catalog
 * Cached for 5 minutes in memory.
 */
export function useExtraServices() {
  const { token } = useAuth();

  return useQuery<MasterExtraService[]>({
    queryKey: ["masterData", "extraServices"],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/extra-services`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch extra services");
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    },
    staleTime: FIVE_MINUTES_MS,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * In-Memory Master Data Hook: Clinic Rooms
 * Cached for 5 minutes in memory.
 */
export function useRooms() {
  const { token } = useAuth();

  return useQuery<MasterRoom[]>({
    queryKey: ["masterData", "rooms"],
    queryFn: async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/rooms`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    },
    staleTime: FIVE_MINUTES_MS,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Invalidate master data query cache when admin mutates settings
 */
export function useInvalidateMasterData() {
  const queryClient = useQueryClient();

  return (keys?: ("doctors" | "labCatalog" | "extraServices" | "rooms")[]) => {
    if (!keys || keys.length === 0) {
      return queryClient.invalidateQueries({ queryKey: ["masterData"] });
    }
    return Promise.all(
      keys.map((k) => queryClient.invalidateQueries({ queryKey: ["masterData", k] }))
    );
  };
}
