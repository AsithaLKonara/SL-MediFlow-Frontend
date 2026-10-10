import os
import re

phone_file = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/PhoneBookingPane.tsx'
token_file = '/Volumes/240GB SSD/Projects/AMAZ-Hospital/Frontend/src/app/frontdesk/components/TokenPane.tsx'

with open(token_file, 'r') as f:
    token_code = f.read()

with open(phone_file, 'r') as f:
    phone_code = f.read()

imports = """
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Calendar as CalendarIcon, User, Search, Loader2, PlusCircle, SendToBack, Send, UserRound, Stethoscope, FlaskConical, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { useRxToPOS } from "../hooks/useCartSync";
import { useAuth } from "@/components/providers/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
"""

# Extract the UI from TokenPane
idx_start = token_code.find('{/* Doctor Selection & Token Generation */}')
idx_end = token_code.find('<div className="mt-4 pt-4 border-t border-border flex justify-end gap-3 shrink-0 bg-background z-10 sticky bottom-0 pb-4">')
issue_token_ui = token_code[idx_start:idx_end]

# In PhoneBookingPane, replace the Doctor & Date div and the dates div
idx_phone_start = phone_code.find('<div className="bg-background border border-border rounded-lg p-4 space-y-4">\\n        <h3 className="font-medium text-muted-foreground text-sm">Doctor & Date</h3>')
idx_phone_end = phone_code.find('<div className="mt-4 pt-4 border-t border-border">')

# Wait, let's just use `phone_code` as a template and rebuild it.
# Actually I'll use multi_replace for PhoneBookingPane.tsx directly since the file is short.

