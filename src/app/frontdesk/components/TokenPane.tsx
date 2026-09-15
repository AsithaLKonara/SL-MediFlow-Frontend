"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Ticket, Phone, Search, PlusCircle, FileText, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TokenPane() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <Tabs defaultValue="reception" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-background border border-border">
          <TabsTrigger value="reception" className="data-[state=active]:bg-secondary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2" />
            Tokens & Registration
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4 mr-2" />
            Prescriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reception" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          {/* Patient Search / Registration */}
          <div className="bg-background border border-border rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-muted-foreground text-sm">Patient Lookup</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by phone number..."
                  className="pl-9 bg-card border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="secondary" className="bg-muted hover:bg-neutral-700">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Quick Registration Form */}
            <div className="pt-2 border-t border-border mt-2 space-y-4">
              <h3 className="font-medium text-muted-foreground text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> Quick Register (Optional)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Full Name</label>
                  <Input placeholder="John Doe" className="bg-card border-border" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Age</label>
                  <Input type="number" placeholder="45" className="bg-card border-border" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input placeholder="077..." className="bg-card border-border" />
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Selection & Token Generation */}
          <div className="flex-1 bg-background border border-border rounded-lg p-4 flex flex-col gap-4">
            <h3 className="font-medium text-muted-foreground text-sm">Issue Token</h3>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 1, name: "Dr. Silva", spec: "General", queue: 4 },
                { id: 2, name: "Dr. Perera", spec: "Cardiology", queue: 2 },
                { id: 3, name: "Dr. Fernando", spec: "Pediatrics", queue: 0 },
                { id: 4, name: "Dr. Jayawardena", spec: "Neurology", queue: 1 },
              ].map((doc) => (
                <button
                  key={doc.id}
                  className="p-3 border border-border rounded-lg bg-card hover:border-secondary text-left transition-colors flex flex-col gap-1"
                >
                  <span className="font-medium text-sm">{doc.name}</span>
                  <span className="text-xs text-muted-foreground">{doc.spec}</span>
                  <span className="text-xs font-medium text-primary mt-1">{doc.queue} waiting</span>
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-border">
              <Button className="w-full h-12 text-lg bg-secondary hover:bg-secondary/90" onClick={() => window.print()}>
                <Ticket className="w-5 h-5 mr-2" />
                Register & Generate Token
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="flex-1 flex flex-col gap-4 mt-0 data-[state=inactive]:hidden">
          <div className="flex-1 bg-background border border-border rounded-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex justify-between items-center">
              <h3 className="font-medium">Pending Prescriptions</h3>
              <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-full">2 New</span>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {[
                  { id: "RX-1001", patient: "Nimal Perera", doctor: "Dr. Silva", time: "2 min ago", status: "PENDING" },
                  { id: "RX-1002", patient: "Saman Kumara", doctor: "Dr. Fernando", time: "15 min ago", status: "PENDING" },
                ].map((rx) => (
                  <div key={rx.id} className="p-4 border border-border rounded-lg bg-card flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-primary">{rx.id}</h4>
                        <p className="text-sm font-medium">{rx.patient}</p>
                        <p className="text-xs text-muted-foreground">from {rx.doctor}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{rx.time}</span>
                    </div>

                    <div className="pt-3 border-t border-border flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 border-primary/30 text-primary hover:bg-primary/10">
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1 bg-primary bg-primary/90">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Send to POS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
