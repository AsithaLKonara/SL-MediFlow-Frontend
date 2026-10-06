const fs = require('fs');

function fixFile(file) {
    let code = fs.readFileSync(file, 'utf8');

    // Remove the dayAppointments usage in the right column
    // For Doctor tokens
    code = code.replace(/const appt = dayAppointments\.filter.*?find.*?;/g, '');
    code = code.replace(/if \(appt\) \{\s*if \(appt\.status === "WAITING"\) bgClass.*?;\s*else if \(appt\.status === "COMPLETED"\) bgClass.*?;\s*else bgClass.*?;.*?}/gs, '');

    fs.writeFileSync(file, code);
}

fixFile('src/app/frontdesk/components/TokenPane.tsx');
fixFile('src/app/frontdesk/components/PhoneBookingPane.tsx');
