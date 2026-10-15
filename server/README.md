# WAREX Backend

Express REST API with PostgreSQL and Prisma. The frontend connects to `http://localhost:5050/api` by default.

## Setup

1. Use Node.js 22+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `DIRECT_URL`, and a long random `JWT_SECRET`.
3. Run from this folder:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:migrate` applies the checked-in migrations in development. For deployment, use `npm run db:deploy` after generating the Prisma Client. `npm run db:status` reports migration state.

Health check: `GET http://localhost:5050/api/health`.

## Important workflows and guards

- Stock reservation is atomic and repeat requests cannot reserve the same order twice.
- Picking requires a reserved order; packing requires a picked order.
- Shipment creation requires a packed order and a vehicle with valid capacity, dimensions, cost, energy and speed specifications.
- Dispatch requires a delivery partner assignment. Delivery completion requires proof of delivery.
- Receipt confirmation is allowed only after delivery.
- Role-restricted endpoints scope orders, shipments, inventory, complaints, service visits, restocks, returns and fleet data.

Demo credentials from `npm run db:seed` are for local development only. Never use them in production.
