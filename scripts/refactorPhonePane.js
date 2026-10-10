const fs = require('fs');

const phoneFile = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/PhoneBookingPane.tsx';
const tokenFile = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/TokenPane.tsx';

let tokenCode = fs.readFileSync(tokenFile, 'utf8');
let phoneCode = fs.readFileSync(phoneFile, 'utf8');

// Extract the UI
const startUI = '{/* Doctor Selection & Token Generation */}';
const endUI = '<div className="mt-4 pt-4 border-t border-border flex justify-end gap-3 shrink-0 bg-background z-10 sticky bottom-0 pb-4">';
const idxStart = tokenCode.indexOf(startUI);
const idxEnd = tokenCode.indexOf(endUI);
if (idxStart === -1 || idxEnd === -1) {
    console.error("Could not find UI block in TokenPane");
    process.exit(1);
}
let uiBlock = tokenCode.substring(idxStart, idxEnd);

// Fix the UI block for PhoneBookingPane: change handleGenerateToken to handleBook?
// Wait, the button is outside this block! The block just contains the Dialogs.

// Find the section to replace in PhoneBookingPane
const phoneStart = '<div className="bg-background border border-border rounded-lg p-4 space-y-4">';
const phoneEnd = '<div className="mt-4 pt-4 border-t border-border">';
const idxPhoneStart = phoneCode.lastIndexOf(phoneStart);
const idxPhoneEnd = phoneCode.indexOf(phoneEnd, idxPhoneStart);

if (idxPhoneStart === -1 || idxPhoneEnd === -1) {
    console.error("Could not find UI block to replace in PhoneBookingPane");
    process.exit(1);
}

// Ensure we found the exact right block (the "Doctor & Date" block)
let beforeUI = phoneCode.substring(0, idxPhoneStart);
let afterUI = phoneCode.substring(idxPhoneEnd);

// Update imports
phoneCode = beforeUI + uiBlock + '      </div>\n' + afterUI;

// Now add the new imports
phoneCode = phoneCode.replace(
    'import { Phone, Calendar as CalendarIcon, User, Search, Loader2, PlusCircle, SendToBack, Send } from "lucide-react";',
    'import { Phone, Calendar as CalendarIcon, User, Search, Loader2, PlusCircle, SendToBack, Send, UserRound, Stethoscope, FlaskConical, FilePlus2 } from "lucide-react";\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";'
);

// We also need to add the state variables and fetching logic!
// Let's replace the top state block
const stateStart = 'const [doctors, setDoctors] = useState<Doctor[]>([]);';
const stateEnd = 'const fetchTodayBookings = async () => {';

const stateReplaceStr = `
  const [doctors, setDoctors] = useState<any[]>([]);
  const [labCatalog, setLabCatalog] = useState<any[]>([]);
  const [extraServicesCatalog, setExtraServicesCatalog] = useState<any[]>([]);
  
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [customLabPrices, setCustomLabPrices] = useState<Record<string, number>>({});
  
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [customServicePrices, setCustomServicePrices] = useState<Record<string, number>>({});

  const [selectedDocToken, setSelectedDocToken] = useState<number | null>(null);
  const [docTokens, setDocTokens] = useState<any[]>([]);
  const [selectedLabToken, setSelectedLabToken] = useState<number | null>(null);
  const [labTokens, setLabTokens] = useState<any[]>([]);
  const [selectedServiceToken, setSelectedServiceToken] = useState<number | null>(null);
  const [serviceTokens, setServiceTokens] = useState<any[]>([]);

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const selectedDate = date; // alias for the UI block
  const setSelectedDate = setDate;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientLookupResult, setPatientLookupResult] = useState<{found: boolean; message: string} | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);

  const [isBooking, setIsBooking] = useState(false);
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const socketRef = useRef<any>(null);
  const { sendAppointmentToPOS } = useRxToPOS();

  const API = process.env.NEXT_PUBLIC_API_URL;
  const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : "http://localhost:5000";

  const fetchDocTokens = useCallback(() => {
    if (!selectedDocId) return;
    apiFetch(\`\${process.env.NEXT_PUBLIC_API_URL}/booking/availability?doctorId=\${selectedDocId}&date=\${date}\`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setDocTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedDocId, date]);

  const fetchLabTokens = useCallback(() => {
    if (!selectedTestIds.size) return;
    apiFetch(\`\${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=LAB&date=\${date}\`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setLabTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedTestIds.size, date]);

  const fetchServiceTokens = useCallback(() => {
    if (!selectedServiceIds.size) return;
    apiFetch(\`\${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=EXTRA_SERVICE&date=\${date}\`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setServiceTokens(res.data.tokens || []);
      })
      .catch(console.error);
  }, [selectedServiceIds.size, date]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const refreshAll = () => {
      if (selectedDocId) fetchDocTokens();
      if (selectedTestIds.size > 0) fetchLabTokens();
      if (selectedServiceIds.size > 0) fetchServiceTokens();
    };
    socketRef.current.on("connect", refreshAll);
    socketRef.current.on("TOKEN_STATUS_UPDATED", refreshAll);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [selectedDocId, selectedTestIds.size, selectedServiceIds.size, fetchDocTokens, fetchLabTokens, fetchServiceTokens, date]);

  useEffect(() => {
    Promise.all([
      apiFetch(\`\${API}/booking/doctors\`).then(r => r.json()),
      apiFetch(\`\${API}/lab/catalog\`).then(r => r.json()),
      apiFetch(\`\${API}/extra-services\`).then(r => r.json())
    ]).then(([docRes, labRes, svcRes]) => {
      if (docRes.success) setDoctors(docRes.data);
      if (Array.isArray(labRes)) setLabCatalog(labRes);
      if (Array.isArray(svcRes)) setExtraServicesCatalog(svcRes);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedDocId) {
      setDocTokens([]);
      setSelectedDocToken(null);
      return;
    }
    fetchDocTokens();
  }, [selectedDocId, fetchDocTokens, date]);

  useEffect(() => {
    if (selectedTestIds.size === 0) {
      setLabTokens([]);
      setSelectedLabToken(null);
      return;
    }
    fetchLabTokens();
  }, [selectedTestIds.size, fetchLabTokens, date]);

  useEffect(() => {
    if (selectedServiceIds.size === 0) {
      setServiceTokens([]);
      setSelectedServiceToken(null);
      return;
    }
    fetchServiceTokens();
  }, [selectedServiceIds.size, fetchServiceTokens, date]);

  `;

let sIdx = phoneCode.indexOf(stateStart);
let eIdx = phoneCode.indexOf(stateEnd);
phoneCode = phoneCode.substring(0, sIdx) + stateReplaceStr + phoneCode.substring(eIdx);

// Now update handleBook to use /reception/token
const handleBookStart = 'const handleBook = async () => {';
const handleBookEnd = '  return (';
let hIdx = phoneCode.indexOf(handleBookStart);
let hEndIdx = phoneCode.indexOf(handleBookEnd, hIdx);

const handleBookReplace = \`const handleBook = async () => {
    if (!patientPhone || !patientName || (!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0) || !date) {
      toast.error("Please fill all required fields and select a service");
      return;
    }

    setIsBooking(true);
    try {
      const selectedDoc = doctors.find(d => d.id === selectedDocId);
      
      const tests = Array.from(selectedTestIds).map(testId => {
        const test = labCatalog.find(t => t.id === testId);
        const price = customLabPrices[testId] !== undefined ? customLabPrices[testId] : (test?.price || 0);
        return { id: testId, name: test?.name || "Lab Test", price };
      });
  
      const services = Array.from(selectedServiceIds).map(svcId => {
        const svc = extraServicesCatalog.find(s => s.id === svcId);
        const price = customServicePrices[svcId] !== undefined ? customServicePrices[svcId] : (svc?.price || 0);
        return { id: svcId, name: svc?.title || "Extra Service", price };
      });

      const payload = {
        bookingType: "PHONE",
        patientName: patientName || "Phone Booking",
        patientPhone,
        ageFallback: patientAge ? parseInt(patientAge, 10) : undefined,
        doctorId: selectedDocId,
        doctorName: selectedDoc?.fullName,
        doctorTokenNumber: selectedDocToken || undefined,
        tests,
        testIds: Array.from(selectedTestIds),
        customLabPrices,
        labTokenNumber: selectedLabToken || undefined,
        services,
        serviceIds: Array.from(selectedServiceIds),
        customServicePrices,
        serviceTokenNumber: selectedServiceToken || undefined,
        date: date
      };

      const res = await apiFetch(\`\${API}/reception/token\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        toast.success(\`Tokens booked successfully!\`);
        setSearchQuery("");
        setPatientName("");
        setPatientPhone("");
        setPatientAge("");
        setPatientLookupResult(null);
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedDocId(null);
        setSelectedTestIds(new Set());
        setSelectedServiceIds(new Set());
        setSelectedDocToken(null);
        setSelectedLabToken(null);
        setSelectedServiceToken(null);
        fetchTodayBookings();
      } else {
        toast.error(result.error || "Failed to book");
      }
    } catch (e) {
      toast.error("Error booking tokens");
    } finally {
      setIsBooking(false);
    }
  };

\`;

phoneCode = phoneCode.substring(0, hIdx) + handleBookReplace + phoneCode.substring(hEndIdx);

// Remove the disabled state logic from the Book Phone Token button
phoneCode = phoneCode.replace(
    'disabled={!availability?.available || isBooking || !selectedDocId || !date || (!selectedTokenNumber && availability?.tokens?.length > 0)}',
    'disabled={isBooking || (!selectedDocId && selectedTestIds.size === 0 && selectedServiceIds.size === 0) || !date}'
);

fs.writeFileSync(phoneFile, phoneCode);
console.log("Success");
