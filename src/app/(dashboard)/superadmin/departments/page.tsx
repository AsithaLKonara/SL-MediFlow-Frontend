"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Activity, ActivitySquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Department {
  id: string;
  name: string;
  queueSize: number;
  activeStaff: number;
  efficiency: number;
  status: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/departments")
      .then(res => res.json())
      .then(data => {
        setDepartments(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Departments</h2>
        <p className="text-muted-foreground mt-1">Monitor capacity and operational efficiency across all hospital wings.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                </div>
                <Badge 
                  variant="secondary" 
                  className={
                    dept.status === 'NORMAL' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                    dept.status === 'BUSY' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                    "bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse"
                  }
                >
                  {dept.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1.5" /> Staff
                  </p>
                  <p className="text-xl font-semibold">{dept.activeStaff}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <ActivitySquare className="w-3.5 h-3.5 mr-1.5" /> Queue
                  </p>
                  <p className="text-xl font-semibold">{dept.queueSize} patients</p>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground flex items-center">
                    <Activity className="w-3.5 h-3.5 mr-1.5" /> Efficiency Score
                  </span>
                  <span className="font-medium">{dept.efficiency}%</span>
                </div>
                <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/80 rounded-full"
                    style={{ width: `${dept.efficiency}%` }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full">View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
