const fs = require('fs');

const createTwoColUI = (tokensVar, selectedTokenVar, setTokenVar) => {
    return `
                  <div className="mt-2 p-4 border-t border-border bg-card flex flex-col gap-3 shrink-0 h-[350px]">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Schedule & Tokens</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[250px]">
                      {/* Left Column: Calendar */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-card p-3">
                        <EnhancedCalendar 
                          selectedDate={new Date(selectedDate)} 
                          onDateSelect={(d) => {
                            const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                            setSelectedDate(localDate);
                          }}
                          calendarData={selectedDocId ? calendarData : null} 
                        />
                      </div>

                      {/* Right Column: Matrix */}
                      <div className="border rounded-md flex flex-col overflow-hidden bg-muted/10">
                        <div className="p-2 border-b bg-muted/50 font-medium text-xs text-muted-foreground">Select Token</div>
                        <ScrollArea className="flex-1 p-2">
                          <div className="grid grid-cols-5 gap-2">
                            {${tokensVar}.map(t => {
                              const isBooked = t.status !== "AVAILABLE";
                              let bgClass = isBooked ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed" : "bg-card border hover:border-primary cursor-pointer";
                              
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
                `;
};

function processFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // Make sure EnhancedCalendar and ScrollArea are imported if missing
    if (!code.includes('EnhancedCalendar')) {
        code = code.replace(
            'import { ScrollArea } from "@/components/ui/scroll-area";',
            'import { ScrollArea } from "@/components/ui/scroll-area";\nimport { EnhancedCalendar } from "@/app/frontdesk/arrivals/components/workspace/left-panel/EnhancedCalendar";'
        );
    }
    
    // Add calendarData state if missing
    if (!code.includes('calendarData')) {
        const stateInject = `
  const [calendarData, setCalendarData] = useState<any>(null);
  const fetchCalendarData = useCallback(() => {
    if (!selectedDocId) return;
    const monthStr = selectedDate.substring(0, 7);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    apiFetch(\`\${apiUrl}/frontdesk/doctors/\${selectedDocId}/calendar?month=\${monthStr}\`)
      .then(r => r.json())
      .then(res => setCalendarData(res))
      .catch(console.error);
  }, [selectedDocId, selectedDate, apiFetch]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);
`;
        const fetchDocTokensLoc = 'const fetchDocTokens = useCallback(() => {';
        if (code.includes(fetchDocTokensLoc)) {
            code = code.replace(fetchDocTokensLoc, stateInject + '\n  ' + fetchDocTokensLoc);
        }
    }


    // Replace DOCTOR block
    const docRegex = /<div className="mt-2 p-4 border-t border-border bg-card space-y-3 shrink-0">\s*<h3 className="font-semibold text-sm">Select Token Number<\/h3>[\s\S]*?No tokens available for this doctor today.<\/div>\s*<\/div>/;
    code = code.replace(docRegex, createTwoColUI('docTokens', 'selectedDocToken', 'setSelectedDocToken'));

    // Replace LAB block
    const labRegex = /<div className="mt-2 p-4 border-t border-border bg-card space-y-3 shrink-0">\s*<h3 className="font-semibold text-sm">Select Lab Token Number<\/h3>[\s\S]*?No tokens available for labs today.<\/div>\s*<\/div>/;
    code = code.replace(labRegex, createTwoColUI('labTokens', 'selectedLabToken', 'setSelectedLabToken'));

    // Replace SERVICE block
    const svcRegex = /<div className="mt-2 p-4 border-t border-border bg-card space-y-3 shrink-0">\s*<h3 className="font-semibold text-sm">Select Service Token Number<\/h3>[\s\S]*?No tokens available for extra services today.<\/div>\s*<\/div>/;
    code = code.replace(svcRegex, createTwoColUI('serviceTokens', 'selectedServiceToken', 'setSelectedServiceToken'));

    fs.writeFileSync(filePath, code);
}

processFile('src/app/frontdesk/components/TokenPane.tsx');
processFile('src/app/frontdesk/components/PhoneBookingPane.tsx');
console.log("Refactor applied!");
