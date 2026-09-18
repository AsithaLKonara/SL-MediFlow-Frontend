"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Hospital, ShieldCheck, BellRing } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Settings saved successfully.");
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">System Settings</h2>
        <p className="text-muted-foreground mt-1">Configure global hospital system parameters and policies.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Hospital className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <BellRing className="w-4 h-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Hospital Profile</CardTitle>
              <CardDescription>Update the primary contact and display information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Hospital Name</label>
                <Input defaultValue="AMAZ General Hospital" />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Contact Email</label>
                <Input defaultValue="admin@amaz.com" type="email" />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">System Currency</label>
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                    <SelectItem value="gbp">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Security Policies</CardTitle>
              <CardDescription>Manage password requirements and 2FA settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Password Expiry (Days)</label>
                <Input defaultValue="90" type="number" />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Require 2FA for Super Admins</label>
                <Select defaultValue="enabled">
                  <SelectTrigger>
                    <SelectValue placeholder="Select requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
                {loading ? "Saving..." : "Save Policies"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Configure when and how system alerts are dispatched.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Daily Report Email</label>
                <Input defaultValue="admin@amaz.com" type="email" />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Critical Queue Alert Threshold</label>
                <Select defaultValue="50">
                  <SelectTrigger>
                    <SelectValue placeholder="Select threshold" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 Patients</SelectItem>
                    <SelectItem value="50">50 Patients</SelectItem>
                    <SelectItem value="100">100 Patients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
                {loading ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
