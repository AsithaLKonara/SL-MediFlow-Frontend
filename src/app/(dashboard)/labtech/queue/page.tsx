"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";

interface QueueToken {
  id: string;
  tokenNumber: string;
  department: string;
  status: string;
  createdAt: string;
  Patient: {
    fullName: string;
    phone: string;
  };
}

export default function LabQueuePage() {
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchQueue = () => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/lab/queue`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load queue");
        return r.json();
      })
      .then((data) => {
        if (data.success) {
          setTokens(data.data);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to fetch lab queue", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!token) return;
    fetchQueue();
    // Poll every 10 seconds for new tokens
    const interval = setInterval(fetchQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && tokens.length === 0) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#3A3435]">Lab Reception Queue</h2>
        <p className="text-muted-foreground mt-1">
          Patients sent from the Front Desk for external lab requests.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Waiting Patients ({tokens.length})
          </CardTitle>
          <CardDescription>Call the patient and enter their requested lab tests to generate a billing invoice.</CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No patients currently waiting in the Lab queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map(token => (
                <div key={token.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 text-primary font-bold text-xl px-4 py-2 rounded-lg min-w-[80px] text-center shrink-0">
                      {token.tokenNumber}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{token.Patient.fullName}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>📞 {token.Patient.phone}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 
                          {new Date(token.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {token.status.replace(/_/g, ' ')}
                    </Badge>
                    <Button onClick={() => toast.info("Opening test entry form for " + token.Patient.fullName + "... (Coming soon)")} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                      Call Patient & Enter Tests <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
