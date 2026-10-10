const fs = require('fs');

function processFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. Add EnhancedCalendar import
    if (!code.includes('EnhancedCalendar')) {
        code = code.replace(
            'import { ScrollArea } from "@/components/ui/scroll-area";',
            'import { ScrollArea } from "@/components/ui/scroll-area";\nimport { EnhancedCalendar } from "@/app/frontdesk/arrivals/components/workspace/left-panel/EnhancedCalendar";'
        );
    }

    // 2. Add calendarData state and fetch function
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
        const fetchDocTokensLoc = 'const [dayAppointments, setDayAppointments]';
        code = code.replace(fetchDocTokensLoc, stateInject + '\n  ' + fetchDocTokensLoc);
    }

    // 3. Remove the small date selector
    const dateSelectorRegex = /<div className="relative w-\[150px\]">[\s\S]*?<\/div>\s*<\/div>/g;
    code = code.replace(dateSelectorRegex, '</div>');

    // 4. Replace the Left Column (Agenda) with EnhancedCalendar
    // Since the Agenda block is quite large, we'll use a regex that matches from {/* Left Column: Agenda */} down to {/* Right Column: Matrix */}
    const leftColumnRegex = /\{\/\* Left Column: Agenda \*\/\}[\s\S]*?\{\/\* Right Column: Matrix \*\/\}/g;
    const newLeftColumn = `{/* Left Column: Calendar */}
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

                      {/* Right Column: Matrix */}`;
    code = code.replace(leftColumnRegex, newLeftColumn);

    fs.writeFileSync(filePath, code);
}

processFile('src/app/frontdesk/components/TokenPane.tsx');
processFile('src/app/frontdesk/components/PhoneBookingPane.tsx');
console.log("Calendar refactor done");
