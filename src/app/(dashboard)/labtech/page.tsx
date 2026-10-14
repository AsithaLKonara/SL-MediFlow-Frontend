"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Microscope, FileCheck, Clock, AlertTriangle, FlaskConical, Search, ArrowRight, TrendingUp, TrendingDown, FileText, ActivitySquare, ScanBarcode } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { ConsolidatedLabManifestModal, ConsolidatedLabManifest, ConsolidatedTestItem } from "@/components/lab/ConsolidatedLabManifestModal";

interface Metrics {
  summary: {
    requestsToday: number;
    requestsYesterday: number;
    pendingRequests: number;
    inProgressTests: number;
    publishedToday: number;
    publishedYesterday: number;
    criticalToday: number;
    criticalYesterday: number;
  };
  charts: {
    weeklyTests: { date: string; count: number }[];
    statusDistribution: { name: string; value: number }[];
  };
  tables: {
    urgentRequests: { id: string; patientName: string; doctor: string; tests: string[]; priority: string; status: string; requestedAt: string }[];
    recentPublished: { id: string; patientName: string; doctor: string; tests: string[]; reportUrl: string | null; requestedAt: string }[];
  };
}

const COLORS = ['#FFBB28', '#00C49F', '#0088FE', '#FF8042', '#8884d8'];

export default function LabTechOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenSearch, setTokenSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [manifest, setManifest] = useState<ConsolidatedLabManifest | null>(null);
  const [isManifestOpen, setIsManifestOpen] = useState(false);
  const router = useRouter();
  const { token } = useAuth();

  const performTokenSearch = async (query: string) => {
    const code = query.trim();
    if (!code) return;
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    setSearching(true);
    try {
      // 1. Fast direct lab request & token resolver (<15ms)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/requests/token/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const data = await res.json();
      
      // 1. Check direct lab requests by token/barcode
      if (data.success && data.data?.LabRequests && data.data.LabRequests.length > 0) {
        const d = data.data;
        const tests: ConsolidatedTestItem[] = [];
        (d.LabRequests || []).forEach((lr: any) => {
          const isDoctor = !!lr.doctorId;
          (lr.items || []).forEach((item: any) => {
            tests.push({
              requestId: lr.id,
              testId: item.LabTest?.id || item.labTestId,
              testName: item.LabTest?.name || "Lab Test",
              category: item.LabTest?.category,
              status: lr.status,
              source: isDoctor ? "Doctor" : "Frontdesk",
              requestedAt: lr.requestedAt,
              price: item.price
            });
          });
        });

        setManifest({
          masterBarcode: d.bookingReference || code,
          patient: {
            name: d.Patient?.fullName || "Walk-in Patient",
            age: d.Patient?.ageFallback,
            gender: d.Patient?.gender,
            phone: d.Patient?.phone
          },
          tokens: {
            lab: d.tokens?.lab || d.tokenNumber,
            consultation: d.tokens?.consultation || null
          },
          room: "LAB",
          tests
        });
        setIsManifestOpen(true);
        toast.success(`Loaded visit manifest for ${d.Patient?.fullName || "Patient"}.`);
        return;
      }

      // 2. Check universal barcode resolver
      const barcodeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/barcode/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });

      if (barcodeRes.ok) {
        const { type, data: bData, masterBarcode } = await barcodeRes.json();
        if (type === "LAB_REQUEST") {
          const lr = bData;
          const tests: ConsolidatedTestItem[] = (lr.items || []).map((item: any) => ({
            requestId: lr.id,
            testId: item.LabTest?.id || item.labTestId,
            testName: item.LabTest?.name || "Lab Test",
            category: item.LabTest?.category,
            status: lr.status,
            source: lr.doctorId ? "Doctor" : "Frontdesk",
            requestedAt: lr.requestedAt,
            price: item.price
          }));

          setManifest({
            masterBarcode: code,
            patient: {
              name: lr.Patient?.fullName || "Walk-in Patient",
              age: lr.Patient?.ageFallback,
              gender: lr.Patient?.gender,
              phone: lr.Patient?.phone
            },
            tokens: { lab: "LAB", consultation: null },
            room: "LAB",
            tests
          });
          setIsManifestOpen(true);
          toast.success(`Lab request found.`);
          return;
        }

        if (type === "APPOINTMENT") {
          const lrs = bData.labRequests || bData.appointment?.LabRequests || [];
          if (lrs.length > 0) {
            const tests: ConsolidatedTestItem[] = [];
            lrs.forEach((lr: any) => {
              const isDoctor = !!lr.doctorId;
              (lr.items || []).forEach((item: any) => {
                tests.push({
                  requestId: lr.id,
                  testId: item.LabTest?.id || item.labTestId,
                  testName: item.LabTest?.name || "Lab Test",
                  category: item.LabTest?.category,
                  status: lr.status,
                  source: isDoctor ? "Doctor" : "Frontdesk",
                  requestedAt: lr.requestedAt,
                  price: item.price
                });
              });
            });

            setManifest({
              masterBarcode: masterBarcode || bData.masterBarcode || code,
              patient: {
                name: bData.patient?.fullName || bData.appointment?.Patient?.fullName || "Walk-in Patient",
                age: bData.patient?.ageFallback || bData.appointment?.Patient?.ageFallback,
                gender: bData.patient?.gender || bData.appointment?.Patient?.gender,
                phone: bData.patient?.phone || bData.appointment?.Patient?.phone
              },
              tokens: {
                lab: bData.tokens?.lab || null,
                consultation: bData.tokens?.consultation || null
              },
              room: bData.rooms?.lab || "LAB",
              tests
            });
            setIsManifestOpen(true);
            toast.success(`Visit manifest loaded: ${tests.length} tests found.`);
            return;
          } else {
            toast.info(`Visit ${bData.masterBarcode || code} has no lab tests requested.`);
            return;
          }
        }
      }

      toast.error(`No pending lab requests found for barcode/token "${code}".`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to find token or barcode.");
    } finally {
      setSearching(false);
    }
  };

  const handleTokenSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performTokenSearch(tokenSearch);
  };

  // Barcode scanner: scanning a token barcode auto-searches without touching keyboard
  useBarcodeScanner((barcode) => {
    performTokenSearch(barcode);
  });

  useEffect(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (!activeToken) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/metrics`, {
      headers: { Authorization: `Bearer ${activeToken}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(e => {
        console.error("Failed to load metrics", e);
        setMetrics({
          summary: {
            requestsToday: 0,
            requestsYesterday: 0,
            pendingRequests: 0,
            inProgressTests: 0,
            publishedToday: 0,
            publishedYesterday: 0,
            criticalToday: 0,
            criticalYesterday: 0
          },
          charts: { weeklyTests: [], statusDistribution: [] },
          tables: { urgentRequests: [], recentPublished: [] }
        });
        setLoading(false);
      });
  }, [token]);

  const calculateGrowth = (today: number, yesterday: number) => {
    if (!yesterday) return 100;
    return ((today - yesterday) / yesterday) * 100;
  };

  const reqGrowth = metrics ? calculateGrowth(metrics.summary.requestsToday, metrics.summary.requestsYesterday) : 0;
  const pubGrowth = metrics ? calculateGrowth(metrics.summary.publishedToday, metrics.summary.publishedYesterday) : 0;
  const critGrowth = metrics ? calculateGrowth(metrics.summary.criticalToday, metrics.summary.criticalYesterday) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#3A3435] dark:text-gray-100">Laboratory Dashboard</h2>
          <p className="text-muted-foreground mt-2">Real-time diagnostic metrics and queue management.</p>
        </div>
        
        <form onSubmit={handleTokenSearch} className="flex items-center gap-2 max-w-md w-full bg-card p-2 rounded-lg border shadow-sm">
          <ScanBarcode className="w-5 h-5 text-primary ml-2 shrink-0" />
          <Input 
            value={tokenSearch} 
            onChange={(e) => setTokenSearch(e.target.value)} 
            placeholder="Scan barcode or enter token #..." 
            className="border-0 bg-transparent focus-visible:ring-0 shadow-none flex-1 text-sm font-mono"
          />
          <Button type="submit" disabled={!tokenSearch.trim()} isLoading={searching}>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {loading || !metrics ? (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-t-4 border-t-amber-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3A3435] dark:text-gray-100">{metrics.summary.pendingRequests}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                <span className="text-amber-600 mr-1 font-medium">{metrics.summary.requestsToday} total today</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-t-4 border-t-blue-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress (Saved)</CardTitle>
              <FlaskConical className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3A3435] dark:text-gray-100">{metrics.summary.inProgressTests}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                <span>Actively being processed</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-t-4 border-t-green-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Published Today</CardTitle>
              <FileCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3A3435] dark:text-gray-100">{metrics.summary.publishedToday}</div>
              <div className="flex items-center text-xs mt-2">
                {pubGrowth >= 0 ? (
                  <span className="text-emerald-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" /> +{pubGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center font-medium">
                    <TrendingDown className="h-3 w-3 mr-1" /> {pubGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground ml-2">vs yesterday</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-t-4 border-t-red-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Results</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3A3435] dark:text-gray-100">{metrics.summary.criticalToday}</div>
              <div className="flex items-center text-xs mt-2">
                {critGrowth > 0 ? (
                  <span className="text-red-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" /> +{critGrowth.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center font-medium">
                    <TrendingDown className="h-3 w-3 mr-1" /> {critGrowth.toFixed(1)}%
                  </span>
                )}
                <span className="text-muted-foreground ml-2">vs yesterday</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Lab Requests Trend (7 Days)</CardTitle>
            <CardDescription>Daily volume of requested lab tests.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.charts.weeklyTests} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C49F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00C49F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Breakdown of last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {metrics.charts.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.charts.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.charts.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: any) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm flex flex-col items-center">
                  <ActivitySquare className="h-10 w-10 mb-2 opacity-20" />
                  No data available
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {metrics.charts.statusDistribution.map((entry, index) => (
                <div key={entry.name} className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Urgent Requests */}
        <Card className="shadow-sm border-t-4 border-t-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-red-600 dark:text-red-400">Urgent Pending Requests</CardTitle>
              <CardDescription>Must be processed immediately.</CardDescription>
            </div>
            <Link href="/labtech/requests">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {metrics.tables.urgentRequests.length > 0 ? (
              metrics.tables.urgentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{req.patientName}</p>
                    <p className="text-xs text-muted-foreground truncate">🧪 {req.tests.join(", ")}</p>
                  </div>
                  <Link href={`/labtech/results/${req.id}`}>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 h-8 ml-4">
                      {req.status === "PENDING" ? "Process" : "Edit"}
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg border-dashed bg-muted/20">
                <FileCheck className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground">No urgent requests pending.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Published */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Recently Published</CardTitle>
              <CardDescription>Latest finalized reports.</CardDescription>
            </div>
            <Link href="/labtech/reports">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {metrics.tables.recentPublished.length > 0 ? (
              metrics.tables.recentPublished.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{req.patientName}</p>
                    <p className="text-xs text-muted-foreground truncate">by {req.doctor}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Published</Badge>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg border-dashed bg-muted/20">
                <FileText className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                <p className="text-sm font-medium">No recent reports</p>
                <p className="text-xs text-muted-foreground">Completed reports will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}

      <ConsolidatedLabManifestModal
        isOpen={isManifestOpen}
        onClose={() => setIsManifestOpen(false)}
        manifest={manifest}
      />
    </div>
  );
}
