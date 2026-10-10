"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";


export default function DoctorLabRequestsPage() {
  const { token, user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [completedReports, setCompletedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabData = async () => {
    if (!user?.id || !token) return;
    try {
      setLoading(true);
      const [pendingRes, completedRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests?doctorId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/reports?doctorId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingRequests(data);
      }
      
      if (completedRes.ok) {
        const data = await completedRes.json();
        setCompletedReports(data);
      }
    } catch (error) {
      console.error("Failed to fetch lab requests", error);
      toast.error("Failed to load lab requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, [user, token]);

  const viewReport = (url: string) => {
    if (!url) {
      toast.error("Report URL not found");
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Lab Requests</h2>
      <p className="text-muted-foreground">Your pending and completed lab requests. Lab tests are requested within the <strong>Consultation</strong> view.</p>
    </div>
  );
}
