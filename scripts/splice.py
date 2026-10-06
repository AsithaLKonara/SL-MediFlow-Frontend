import os
import re

token_file = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/TokenPane.tsx'
phone_file = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/PhoneBookingPane.tsx'

with open(token_file, 'r') as f:
    token_code = f.read()

with open(phone_file, 'r') as f:
    phone_code = f.read()

# Extract the block starting with {/* Doctor Selection & Token Generation */}
# and ending right before the button for generate token:
# <div className="mt-4 pt-4 border-t border-border flex justify-end gap-3 shrink-0 bg-background z-10 sticky bottom-0 pb-4">
match = re.search(r'(\{/\* Doctor Selection & Token Generation \*/\}.*?)<div className="mt-4 pt-4 border-t border-border', token_code, re.DOTALL)
if match:
    issue_token_ui = match.group(1)
else:
    print("Failed to find UI in TokenPane")
    exit(1)

# Now find the place in PhoneBookingPane to replace:
# Replace from: <div className="bg-background border border-border rounded-lg p-4 space-y-4">
#          <h3 className="font-medium text-muted-foreground text-sm">Doctor & Date</h3>
# down to right before: <div className="mt-4 pt-4 border-t border-border">
match_phone = re.search(r'(<div className="bg-background border border-border rounded-lg p-4 space-y-4">\s*<h3 className="font-medium text-muted-foreground text-sm">Doctor & Date</h3>.*?)(<div className="mt-4 pt-4 border-t border-border">)', phone_code, re.DOTALL)

if match_phone:
    new_phone_code = phone_code.replace(match_phone.group(1), issue_token_ui)
else:
    print("Failed to find UI in PhoneBookingPane")
    exit(1)

with open(phone_file, 'w') as f:
    f.write(new_phone_code)

print("UI replaced successfully")
