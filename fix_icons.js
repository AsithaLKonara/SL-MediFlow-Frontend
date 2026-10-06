const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('import { Calendar } from "lucide-react"')) {
     code = code.replace('import { Calendar } from "lucide-react"', 'import { Calendar as CalendarIcon } from "lucide-react"');
  } else if (code.includes('Calendar,') && !code.includes('Calendar as CalendarIcon')) {
     code = code.replace('Calendar,', 'Calendar as CalendarIcon,');
  } else if (!code.includes('CalendarIcon')) {
     code = code.replace('} from "lucide-react"', ', Calendar as CalendarIcon } from "lucide-react"');
  }

  if (code.includes('expectedTotal\n    });')) {
     code = code.replace('expectedTotal\n    });', 'expectedTotal,\n      date: selectedDate\n    });');
  } else if (code.includes('expectedTotal\n      });')) {
     code = code.replace('expectedTotal\n      });', 'expectedTotal,\n      date: selectedDate\n      });');
  }
  
  fs.writeFileSync(file, code);
}

fixFile('src/app/frontdesk/components/TokenPane.tsx');
fixFile('src/app/frontdesk/components/PhoneBookingPane.tsx');
