# SL MediFlow - Frontend Client

The frontend interface for the SL MediFlow Healthcare Management System. Built on Next.js App Router, this robust web application offers specialized, role-based dashboards for different hospital departments. It features hardware-specific UI designs, real-time WebSocket integrations, and a centralized UI/UX design system.

## Technology Stack

- **Framework**: Next.js (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charting**: Recharts
- **Real-Time Client**: Socket.io-client
- **Hardware Integrations**: React-to-Print (for 80mm POS Thermal Printing)

## Specialized Workspaces (Role-Based Access)

The application is heavily modularized into different workspaces located in `src/app/(dashboard)/`:

1. **Frontdesk / Reception**: Patient registration, queue token generation, and demographic management.
2. **Doctor**: Consultation workspace with past medical history, real-time lab result alerts, and a dynamic prescription builder.
3. **Pharmacy (POS)**: Real-time prescription queue connected via WebSockets. Pharmacists can modify dispensed quantities and directly push charges to the centralized invoice.
4. **Laboratory**: Request queue management and a specialized UI for entering biomarker test results.
5. **Cashier**: The centralized billing engine. Aggregates all hospital charges (Consultation, Lab, Pharmacy) into single unified invoices.
6. **Superadmin**: Full hospital overview, including the Finance Engine (Income/Expense tracking) and the Inventory Engine (Drug Master, Stock Batches, Suppliers).

## Hardware-Specific UI

This project supports specialized hospital hardware, particularly **80mm Thermal Receipt Printers**.
Instead of using generic `window.print()`, we utilize `react-to-print` combined with dedicated, monochromatic, strict-width templates (e.g., `PrescriptionPrintTemplate.tsx`) to ensure perfect POS printer alignment without layout collisions.

## Project Structure

```
Frontend/
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router definitions and page layouts
│   ├── components/         # Reusable UI components and specific module elements
│   │   ├── dashboard/      # Sidebar, Shell, and Navigation components
│   │   ├── printing/       # Thermal printer templates (80mm)
│   │   └── ui/             # Generic atomic UI components (Buttons, Inputs, Cards)
│   └── lib/                # Utilities and generic helpers
└── .env                    # Environment variables (not committed)
```

## Setup & Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:5000/api"
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Design Guidelines
- **Currency Standard**: All currency representations must use "LKR" (not "$").
- **Printing**: Never use native `window.print()` in standard dashboard views; always use invisible render mounts with `react-to-print`.
- **Modularity**: Ensure state is localized where possible, but leverage backend aggregation for high-level BI/Finance charts to maintain $O(1)$ render efficiency.
