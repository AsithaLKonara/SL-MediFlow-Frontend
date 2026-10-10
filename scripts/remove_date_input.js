const fs = require('fs');

function removeDateInput(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // Remove the specific date input block in PhoneBookingPane
    const dateInputRegex = /<div className="flex items-center gap-2">\s*<label className="text-xs text-muted-foreground">Booking Date<\/label>\s*<Input type="date"[\s\S]*?<\/div>/;
    code = code.replace(dateInputRegex, '');

    fs.writeFileSync(filePath, code);
}

removeDateInput('src/app/frontdesk/components/PhoneBookingPane.tsx');
console.log("Date input removed");
