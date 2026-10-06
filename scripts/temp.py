import os

token_file = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/TokenPane.tsx'
phone_file = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/PhoneBookingPane.tsx'

with open(token_file, 'r') as f:
    token_code = f.read()

with open(phone_file, 'r') as f:
    phone_code = f.read()

# We need the 3 dialogs. 
start_dialogs = '{/* Doctor Selection & Token Generation */}'
end_dialogs = '{/* END OF DOCTOR SELECTION */}'

# Wait, TokenPane doesn't have an END OF DOCTOR SELECTION.
# I'll manually construct the updated PhoneBookingPane based on its current structure.
# Instead of text manipulation in python, it's easier to just provide the full file contents.

