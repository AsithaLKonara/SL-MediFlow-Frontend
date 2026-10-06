const fs = require('fs');
let code = fs.readFileSync('src/app/frontdesk/components/TokenPane.tsx', 'utf8');

if (!code.includes('const [selectedDate')) {
    code = code.replace(
        'const [selectedServiceToken, setSelectedServiceToken] = useState<number | null>(null);',
        'const [selectedServiceToken, setSelectedServiceToken] = useState<number | null>(null);\n  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split(\'T\')[0]);'
    );
}

code = code.replace(
    'apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/availability?doctorId=${selectedDocId}`)',
    'apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/availability?doctorId=${selectedDocId}&date=${selectedDate}`)'
);
code = code.replace(
    'apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=LAB`)',
    'apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=LAB&date=${selectedDate}`)'
);
code = code.replace(
    'apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=EXTRA_SERVICE`)',
    'apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/booking/department-availability?department=EXTRA_SERVICE&date=${selectedDate}`)'
);
code = code.replace(
    '}, [token, apiFetch]);',
    '}, [token, apiFetch, selectedDate]);'
);

fs.writeFileSync('src/app/frontdesk/components/TokenPane.tsx', code);
