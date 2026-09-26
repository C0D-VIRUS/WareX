# WAREX Frontend

Stage 6: Manual stock adjustment on the Inventory screen.

## Setup
1. Unzip this folder anywhere (e.g. your Desktop).
2. Open a terminal in the folder.
3. Run:
   npm install
   npm run dev
4. Open the printed localhost URL, log in as Warehouse Manager.

## What's new in this stage
- Inventory now has an "Adjust" button on every row. Opens a modal to
  enter a +/- quantity change, pick a reason (Damage / Loss / Correction
  / Other — matches the backend's AdjustmentReason enum), and an
  optional note (required if reason is "Other"). Shows the resulting
  quantity live and blocks adjustments that would go below zero.
- A "Recent adjustments" list appears below the table after your first
  adjustment, showing the last 5 changes with their reason/note and
  timestamp — a lightweight audit trail, matching the SRS's requirement
  that stock never changes without a validated, reasoned transaction.

## Still mock data
Still local React state only — see the new warex-backend project (built
alongside this) for where real persistence is headed.


## WAREX interactive frontend

The current frontend prototype is role-driven and stores demo state in `localStorage` so workflows can be demonstrated before the backend is connected.

Demo accounts:
- Main Admin: `admin@warex.com` / `admin123`
- Manufacturer: `manufacturer@warex.com` / `demo123`
- Warehouse Manager: `warehouse@warex.com` / `demo123`
- Delivery Partner: `delivery@warex.com` / `demo123`
- Business Customer: `customer@warex.com` / `demo123`
- Technician: `technician@warex.com` / `demo123`

Main Admin can create users and assign roles from **User & Roles**. Orders, inventory, restocks, shipments, complaints and technician service visits share the same frontend state. This is intentionally a frontend prototype; authentication and persistence should move to a backend/API in the next phase.
