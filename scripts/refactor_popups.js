const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. Add CalendarIcon to imports if not exists
    if (!code.includes('Calendar as CalendarIcon') && !code.includes('CalendarIcon')) {
       code = code.replace('Calendar,', 'Calendar as CalendarIcon,');
    } else if (code.includes('Calendar') && !code.includes('CalendarIcon')) {
       code = code.replace('Calendar', 'Calendar as CalendarIcon');
    }
    
    // Add ScrollArea if not present
    if (!code.includes('import { ScrollArea }')) {
        code = `import { ScrollArea } from "@/components/ui/scroll-area";\n` + code;
    }

    // 2. Add dayAppointments state and fetch
    if (!code.includes('dayAppointments')) {
        const stateInject = `
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const fetchDayAppointments = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    apiFetch(\`\${apiUrl}/booking/appointments?date=\${selectedDate}\`)
      .then(r => r.json())
      .then(res => { if (res.success) setDayAppointments(res.data); })
      .catch(console.error);
  }, [selectedDate, apiFetch]);

  useEffect(() => {
    fetchDayAppointments();
  }, [fetchDayAppointments]);
`;
        const fetchDocTokensLoc = 'const fetchDocTokens = useCallback(() => {';
        if (code.includes(fetchDocTokensLoc)) {
            code = code.replace(fetchDocTokensLoc, stateInject + '\n  ' + fetchDocTokensLoc);
        }
    }

    // Add mark arrived function
    if (!code.includes('handleMarkArrived')) {
        const arriveFn = `
  const handleMarkArrived = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await apiFetch(\`\${apiUrl}/booking/\${id}/arrive\`, { method: "PATCH" });
      const result = await res.json();
      if (result.success) {
        toast.success("Patient marked as arrived.");
        fetchDayAppointments();
        if (selectedDocId) fetchDocTokens();
        if (selectedTestIds.size > 0) fetchLabTokens();
        if (selectedServiceIds.size > 0) fetchServiceTokens();
      } else {
        toast.error(result.error || "Failed");
      }
    } catch (e) { toast.error("Error"); }
  };
`;
        const fetchDocTokensLoc = 'const fetchDocTokens = useCallback(() => {';
        code = code.replace(fetchDocTokensLoc, arriveFn + '\n  ' + fetchDocTokensLoc);
    }

    // 3. Replace the UI block for Doctor, Lab, Service
    const createTwoColUI = (deptName, tokensVar, selectedTokenVar, setTokenVar, isLab = false, isService = false) => {
        const idVar = isLab ? 'a.department === "LAB"' : (isService ? 'a.department === "EXTRA_SERVICE"' : 'a.doctorId === selectedDocId');
        return `{(${isLab ? 'selectedTestIds.size > 0' : (isService ? 'selectedServiceIds.size > 0' : 'selectedDocId')}) && (
                  <div className="mt-2 p-4 border-t border-border bg-card flex flex-col gap-3 shrink-0 h-[350px]">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Schedule & Tokens</h3>
                      <div className="relative w-[150px]">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="pl-9 h-8 text-sm" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[250px]">
                      {/* Left Column: Agenda */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-muted/10">
                        <div className="p-2 border-b bg-muted/50 font-medium text-xs text-muted-foreground">Booked Appointments</div>
                        <ScrollArea className="flex-1 p-2">
                          <div className="space-y-2">
                            {dayAppointments.filter(a => ${idVar}).length === 0 ? (
                              <div className="text-xs text-muted-foreground p-4 text-center">No appointments.</div>
                            ) : (
                              dayAppointments.filter(a => ${idVar}).map(apt => (
                                <div key={apt.id} className="p-2 border rounded-md bg-card text-xs flex flex-col gap-2 shadow-sm">
                                  <div className="flex justify-between">
                                    <span className="font-semibold">Token {apt.tokenNumber}</span>
                                    <span className={\`px-1.5 py-0.5 rounded text-[10px] font-bold \${apt.status === "WAITING" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}\`}>{apt.status}</span>
                                  </div>
                                  <div className="flex flex-col">
                                     <span>{apt.Patient?.fullName || apt.patientName}</span>
                                     <span className="text-muted-foreground">{apt.Patient?.phone || apt.patientPhone}</span>
                                  </div>
                                  {apt.status !== "WAITING" && apt.status !== "COMPLETED" && (
                                    <Button size="sm" className="h-6 text-[10px] w-full" onClick={() => handleMarkArrived(apt.id)}>Mark Arrived</Button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Right Column: Matrix */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-muted/10">
                        <div className="p-2 border-b bg-muted/50 font-medium text-xs text-muted-foreground">Select Token</div>
                        <ScrollArea className="flex-1 p-2">
                          <div className="grid grid-cols-5 gap-2">
                            {${tokensVar}.map(t => {
                              const isBooked = t.status !== "AVAILABLE";
                              const appt = dayAppointments.filter(a => ${idVar}).find(a => parseInt(a.tokenNumber.replace(/\\D/g, '')) === t.tokenNumber);
                              let bgClass = isBooked ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed" : "bg-card border hover:border-primary cursor-pointer";
                              if (appt) {
                                if (appt.status === "WAITING") bgClass = "bg-green-100 text-green-700 border-green-300 cursor-not-allowed";
                                else if (appt.status === "COMPLETED") bgClass = "bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed";
                                else bgClass = "bg-yellow-100 text-yellow-700 border-yellow-300 cursor-not-allowed";
                              }
                              const isSelected = ${selectedTokenVar} === t.tokenNumber;
                              if (isSelected) bgClass = "bg-primary text-primary-foreground border-primary";
                              
                              return (
                                <button
                                  key={t.tokenNumber}
                                  disabled={isBooked}
                                  onClick={() => ${setTokenVar}(t.tokenNumber)}
                                  className={\`h-8 rounded-md text-xs font-medium transition-colors border \${bgClass}\`}
                                >
                                  {t.tokenNumber}
                                </button>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                )}`;
    }

    // Replace DOCTOR block
    const docRegex = /\{selectedDocId && \([\s\S]*?<div className="text-sm text-muted-foreground">No tokens available for this doctor today.<\/div>\s*\)\}\s*<\/div>\s*\)\}/;
    code = code.replace(docRegex, createTwoColUI('CONSULTATION', 'docTokens', 'selectedDocToken', 'setSelectedDocToken', false, false));

    // Replace LAB block
    const labRegex = /\{selectedTestIds.size > 0 && \([\s\S]*?<div className="text-sm text-muted-foreground">No tokens available for labs today.<\/div>\s*\)\}\s*<\/div>\s*\)\}/;
    code = code.replace(labRegex, createTwoColUI('LAB', 'labTokens', 'selectedLabToken', 'setSelectedLabToken', true, false));

    // Replace SERVICE block
    const svcRegex = /\{selectedServiceIds.size > 0 && \([\s\S]*?<div className="text-sm text-muted-foreground">No tokens available for services today.<\/div>\s*\)\}\s*<\/div>\s*\)\}/;
    code = code.replace(svcRegex, createTwoColUI('EXTRA_SERVICE', 'serviceTokens', 'selectedServiceToken', 'setSelectedServiceToken', false, true));

    fs.writeFileSync(filePath, code);
}

const p1 = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/TokenPane.tsx';
const p2 = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/PhoneBookingPane.tsx';

processFile(p1);
processFile(p2);
console.log("Done");
