# WAREX — B2B Warehouse Management System

WAREX connects business customers, manufacturers, warehouse operations, fleet dispatch, delivery and after-sales workflows. The frontend is React + Vite + Tailwind CSS; the API is Node.js + Express; PostgreSQL persistence is handled through Prisma.

## Requirements

- Node.js 22 or newer
- PostgreSQL database
- A terminal with two sessions (API and frontend)

## 1. Configure the backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set `DATABASE_URL`, `DIRECT_URL`, and a long random `JWT_SECRET` for your database. The API defaults to `http://localhost:5050`; keep `PORT=5050` unless you also change `VITE_API_URL` on the frontend.

Install dependencies and prepare the database:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The migration adds a distinct stock-reserved state, package measurements and vehicle specifications used by the vehicle-selection algorithm, and persistent warehouse-transfer records. `db:seed` creates or refreshes the local demonstration records; use it only for a development database because it resets several demo records to their sample values.

Check the API at [http://localhost:5050/api/health](http://localhost:5050/api/health).

## 2. Start the frontend

In a second terminal, from the project root:

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API URL defaults to `http://localhost:5050/api`. To use a different API origin, create a root `.env` file containing `VITE_API_URL=http://localhost:5050/api` with your actual API URL.

## Demo accounts

The seed script creates local demonstration users:

- Main Admin: `admin@warex.com` / `admin123`
- Manufacturer: `manufacturer@warex.com` / `demo123`
- Warehouse Manager: `warehouse@warex.com` / `demo123`
- Delivery Partner: `delivery@warex.com` / `demo123`
- Business Customer: `customer@warex.com` / `demo123`
- Technician: `technician@warex.com` / `demo123`

These passwords are for local development only. Change them before any real deployment.

## Main workflows

- Role-aware sign-in and account management
- Product catalogue and inventory adjustments with stock alerts
- Bulk order creation, guarded stock reservation, picking and packing
- Shipment creation from packed orders with package measurements and suitable-vehicle selection
- Delivery-partner assignment, dispatch, proof of delivery and receipt confirmation
- Manufacturer restocks and warehouse receiving
- Complaints, technician service visits, returns and notifications
- Fleet vehicle specification management and delivery-run visibility
- Warehouse-to-warehouse transfers with stock movement and receipt audit trails
- Sell-through analytics based on actual shipped / delivered / closed order lines

## Tests and validation

```bash
# Frontend production build
npm run build

# Backend syntax and unit tests
cd server
npm test
```

The project should be tested against your own configured PostgreSQL database after applying migrations. A successful source build does not replace an end-to-end workflow test.

## Notes

- `node_modules`, generated build output and local `.env` files are intentionally excluded from source-control-style project bundles. Reinstall dependencies with `npm install` on your machine.
- Do not share a `.env` file or ZIP containing database credentials or JWT secrets.
