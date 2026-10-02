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
import { User, KeyRound, Loader2, Save, Settings as SettingsIcon, Bell, Sun } from "lucide-react";

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);

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
  }, [token]);

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
        </div>
      </Tabs>
      </div>
    </div>
  );
}
