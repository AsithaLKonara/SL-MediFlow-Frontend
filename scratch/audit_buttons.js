const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const filesWithButtons = [];

walkDir('/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('<Button') || content.includes('<button')) {
      const lines = content.split('\n');
      let issueCount = 0;
      let issues = [];
      lines.forEach((line, i) => {
        if (line.includes('<Button') && line.includes('onClick=') && !line.includes('disabled={')) {
          if (!line.includes('variant="ghost"') && !line.includes('variant="outline"')) {
            issues.push(`Line ${i+1}: Missing disabled state -> ${line.trim()}`);
            issueCount++;
          }
        }
      });
      if (issueCount > 0) {
        filesWithButtons.push({ file: filePath, issues });
      }
    }
  }
});

fs.writeFileSync('scratch/button_issues.json', JSON.stringify(filesWithButtons, null, 2));
console.log(`Found ${filesWithButtons.length} files with button issues`);
