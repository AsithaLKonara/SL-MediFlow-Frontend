"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, KeyRound, Loader2, Save, Settings as SettingsIcon, Bell, Sun, Printer, HardDrive, CheckCircle2, AlertCircle, RefreshCw, Banknote, Scissors } from "lucide-react";
import { openCashDrawer, getBridgeUrl } from "@/lib/cashDrawer";
import { triggerPrinterAutoCut } from "@/lib/printerAutoCut";
import { NodePrintClient } from "@asithakonara/node-print-client";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);

  // Hardware Print & Cash Drawer state
  const [bridgeUrl, setBridgeUrl] = useState("http://127.0.0.1:18181");
  const [printerName, setPrinterName] = useState("");
  const [lanIp, setLanIp] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState<"idle" | "checking" | "online" | "offline">("idle");
  const [detectedPrinters, setDetectedPrinters] = useState<any[]>([]);
  const [isTestingDrawer, setIsTestingDrawer] = useState(false);
  const [isTestingCut, setIsTestingCut] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    specialty: "",
    roomNumber: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    setMounted(true);
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          specialty: data.specialty || "",
          roomNumber: data.roomNumber || ""
        });
      })
      .catch(err => {
        toast.error("Failed to load profile details");
        console.error(err);
      })
      .finally(() => setLoading(false));

    if (typeof window !== "undefined") {
      setBridgeUrl(getBridgeUrl());
      setPrinterName(localStorage.getItem("node_print_printer") || localStorage.getItem("pos_printer") || "");
      setLanIp(localStorage.getItem("printer_lan_ip") || "");
    }
  }, [token]);

  const checkBridge = async (urlToCheck: string = bridgeUrl) => {
    setBridgeStatus("checking");
    try {
      const client = new NodePrintClient({ url: urlToCheck });
      const printers = await client.printers.list();
      setDetectedPrinters(printers);
      setBridgeStatus("online");
      toast.success(`Bridge is online. Found ${printers.length} printer(s).`);
    } catch (e: any) {
      setBridgeStatus("offline");
      toast.error(`Bridge unreachable at ${urlToCheck}: ${e?.message || "connection refused"}`);
    }
  };

  const handleTestCashDrawer = async () => {
    setIsTestingDrawer(true);
    try {
      const res = await openCashDrawer({
        url: bridgeUrl,
        printer: printerName.trim() || undefined
      });
      if (res.success) {
        toast.success(`Cash drawer triggered successfully (${res.method === "webusb" ? "WebUSB" : "Bridge"}).`);
      } else {
        toast.error(`Cash drawer failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Cash drawer test error: ${err?.message || err}`);
    } finally {
      setIsTestingDrawer(false);
    }
  };

  const handleTestCut = async () => {
    setIsTestingCut(true);
    try {
      const res = await triggerPrinterAutoCut({
        printer: printerName.trim() || undefined,
        ip: lanIp.trim() || undefined,
        feedLines: 3
      });
      if (res.success) {
        toast.success(`Auto-cut triggered successfully via ${res.method === "lan" ? "LAN TCP Socket" : res.method === "webusb" ? "WebUSB" : "Bridge"}.`);
      } else {
        toast.error(`Auto-cut failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Auto-cut test error: ${err?.message || err}`);
    } finally {
      setIsTestingCut(false);
    }
  };

  const handleSaveHardware = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("node_print_url", bridgeUrl.trim());
      if (printerName.trim()) {
        localStorage.setItem("node_print_printer", printerName.trim());
      } else {
        localStorage.removeItem("node_print_printer");
      }
      if (lanIp.trim()) {
        localStorage.setItem("printer_lan_ip", lanIp.trim());
      } else {
        localStorage.removeItem("printer_lan_ip");
      }
      toast.success("Hardware configuration saved locally.");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      
      toast.success("Profile updated successfully. Please log back in to see changes globally.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    
    if (passwordForm.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      
      toast.success("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isDoctor = user?.role?.toLowerCase() === "doctor";

  return (
    <div className="flex-1 p-8 h-[calc(100vh-56px)] overflow-y-auto animate-in fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings & Profile</h2>
          <p className="text-muted-foreground mt-2">Manage your personal information, security, and app preferences.</p>
        </div>

      <Tabs defaultValue="profile" orientation="vertical" className="w-full flex flex-col md:flex-row gap-6">
        <div className="md:w-64 shrink-0">
          <TabsList className="w-full bg-transparent p-0 space-y-1">
            <TabsTrigger 
              value="profile" 
              className="gap-2 px-4 py-2 hover:bg-muted/50 rounded-md"
            >
              <User className="w-4 h-4" /> Profile Details
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="gap-2 px-4 py-2 hover:bg-muted/50 rounded-md"
            >
              <KeyRound className="w-4 h-4" /> Security
            </TabsTrigger>
            <TabsTrigger 
              value="preferences" 
              className="gap-2 px-4 py-2 hover:bg-muted/50 rounded-md"
            >
              <SettingsIcon className="w-4 h-4" /> App Preferences
            </TabsTrigger>
            <TabsTrigger 
              value="hardware" 
              className="gap-2 px-4 py-2 hover:bg-muted/50 rounded-md"
            >
              <Printer className="w-4 h-4" /> Hardware & Printers
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1">
          <TabsContent value="profile" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your basic profile details here.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={profile.fullName} 
                      onChange={e => setProfile({...profile, fullName: e.target.value})} 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={profile.email} 
                      onChange={e => setProfile({...profile, email: e.target.value})} 
                      required 
                    />
                  </div>

                  {isDoctor && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="specialty">Specialty</Label>
                        <Input 
                          id="specialty" 
                          value={profile.specialty} 
                          onChange={e => setProfile({...profile, specialty: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roomNumber">Room Number</Label>
                        <Input 
                          id="roomNumber" 
                          value={profile.roomNumber} 
                          onChange={e => setProfile({...profile, roomNumber: e.target.value})} 
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4 bg-muted/20">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="m-0 focus-visible:outline-none focus-visible:ring-0">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdatePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password"
                      value={passwordForm.currentPassword} 
                      onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} 
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input 
                      id="newPassword" 
                      type="password"
                      value={passwordForm.newPassword} 
                      onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      value={passwordForm.confirmPassword} 
                      onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                      required 
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4 bg-muted/20">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Update Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="m-0 space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-primary" /> Appearance
                </CardTitle>
                <CardDescription>Customize how the dashboard looks on your device.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark themes.
                    </p>
                  </div>
                  <Switch 
                    checked={theme === "dark"} 
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" /> Notifications
                </CardTitle>
                <CardDescription>Manage how you receive alerts and updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive daily summaries and critical alerts via email.
                    </p>
                  </div>
                  <Switch 
                    checked={emailNotifs} 
                    onCheckedChange={setEmailNotifs} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hardware" className="m-0 space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" /> Hardware Printing & Cash Drawer
                </CardTitle>
                <CardDescription>
                  Configure and test the local hardware printing bridge service and cash drawer connection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bridgeUrl">Bridge Service URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="bridgeUrl" 
                      value={bridgeUrl} 
                      onChange={e => setBridgeUrl(e.target.value)} 
                      placeholder="http://127.0.0.1:18181" 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => checkBridge(bridgeUrl)}
                      disabled={bridgeStatus === "checking"}
                      className="gap-1.5 shrink-0"
                    >
                      <RefreshCw className={cn("w-4 h-4", bridgeStatus === "checking" && "animate-spin")} />
                      Test Bridge
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default port is 18181. Ensure the background bridge service is running (<code>node-print start</code>).
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bridge Status:</span>
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      {bridgeStatus === "online" && (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Online ({detectedPrinters.length} printers)
                        </span>
                      )}
                      {bridgeStatus === "offline" && (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Offline / Unreachable
                        </span>
                      )}
                      {bridgeStatus === "checking" && <span className="text-muted-foreground">Connecting...</span>}
                      {bridgeStatus === "idle" && <span className="text-muted-foreground">Not checked yet</span>}
                    </span>
                  </div>

                  {detectedPrinters.length > 0 && (
                    <div className="space-y-1 pt-2 border-t text-xs">
                      <span className="font-medium text-muted-foreground">Detected Printers:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {detectedPrinters.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPrinterName(p.name || p.id)}
                            className={cn(
                              "px-2.5 py-1 rounded border text-xs cursor-pointer transition-colors",
                              (printerName === p.name || printerName === p.id)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card hover:bg-muted"
                            )}
                          >
                            {p.name || p.id} {p.isDefault && "(Default)"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="printerName">Assigned Receipt / Cash Drawer Printer (USB / Local)</Label>
                  <Input 
                    id="printerName" 
                    value={printerName} 
                    onChange={e => setPrinterName(e.target.value)} 
                    placeholder="e.g. POS-80, Thermal-Receipt, or leave blank for default" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to automatically route to the default system receipt printer.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lanIp">Network / LAN Printer IP (Optional — Xprinter XP-80T LAN)</Label>
                  <Input 
                    id="lanIp" 
                    value={lanIp} 
                    onChange={e => setLanIp(e.target.value)} 
                    placeholder="e.g. 192.168.1.100 (port 9100)" 
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct socket TCP connection on port 9100 using Node.js default <code>net</code> module.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-primary" /> Test Cash Drawer
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Send ESC/POS kick pulse to open cash drawer.
                        </p>
                      </div>
                      <Button 
                        type="button"
                        onClick={handleTestCashDrawer}
                        disabled={isTestingDrawer}
                        className="gap-2 shrink-0"
                      >
                        {isTestingDrawer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                        Open Drawer
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-1.5">
                          <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Test Auto-Cut
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Send GS V 66 0 ESC/POS auto-cut sequence.
                        </p>
                      </div>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handleTestCut}
                        disabled={isTestingCut}
                        className="gap-2 shrink-0 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        {isTestingCut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                        Cut Paper
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-muted/20 flex justify-between">
                <Button type="button" onClick={handleSaveHardware} className="gap-2">
                  <Save className="w-4 h-4" /> Save Hardware Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
      </div>
    </div>
  );
}
