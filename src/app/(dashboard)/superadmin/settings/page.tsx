"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Hospital, ShieldCheck, BellRing, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export default function SettingsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    hospitalName: "",
    contactEmail: "",
    systemCurrency: "usd",
    passwordExpiry: "90",
    require2FA: "enabled",
    dailyReportEmail: "",
    criticalQueueThreshold: "50",
  });

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setSettings(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [token]);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save");
      toast.success("Settings saved successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">System Settings</h2>
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
                <Input value={settings.hospitalName} onChange={e => handleChange('hospitalName', e.target.value)} placeholder="AMAZ General Hospital" />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Contact Email</label>
                <Input 
                  value={settings.contactEmail} 
                  onChange={e => handleChange('contactEmail', e.target.value.toLowerCase().trim())} 
                  type="email" 
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="admin@amaz.com" 
                />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">System Currency</label>
                <Select value={settings.systemCurrency} onValueChange={v => handleChange('systemCurrency', v || '')}>
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
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? "Saving..." : "Save Changes"}
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
                <Input value={settings.passwordExpiry} onChange={e => handleChange('passwordExpiry', e.target.value)} type="number" placeholder="90" />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Require 2FA for Super Admins</label>
                <Select value={settings.require2FA} onValueChange={v => handleChange('require2FA', v || '')}>
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
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? "Saving..." : "Save Policies"}
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
                <Input 
                  value={settings.dailyReportEmail} 
                  onChange={e => handleChange('dailyReportEmail', e.target.value.toLowerCase().trim())} 
                  type="email" 
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="admin@amaz.com" 
                />
              </div>
              <div className="grid gap-2 max-w-sm">
                <label className="text-sm font-medium">Critical Queue Alert Threshold</label>
                <Select value={settings.criticalQueueThreshold} onValueChange={v => handleChange('criticalQueueThreshold', v || '')}>
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
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
