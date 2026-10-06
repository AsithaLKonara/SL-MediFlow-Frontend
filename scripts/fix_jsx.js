const fs = require('fs');

function fixFile(file) {
    let code = fs.readFileSync(file, 'utf8');

    // Replace literal '\n' characters that were mistakenly injected
    code = code.replace(/\{selectedDocId && \(\\n                  <div/g, '{selectedDocId && (\n                  <div');
    code = code.replace(/\{selectedTestIds\.size > 0 && \(\\n                  <div/g, '{selectedTestIds.size > 0 && (\n                  <div');
    code = code.replace(/\{selectedServiceIds\.size > 0 && \(\\n                  <div/g, '{selectedServiceIds.size > 0 && (\n                  <div');
    code = code.replace(/<\/div>\\n                \)}/g, '</div>\n                )}');

    fs.writeFileSync(file, code);
}

fixFile('src/app/frontdesk/components/PhoneBookingPane.tsx');
