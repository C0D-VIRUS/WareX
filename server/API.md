# WAREX API map

## Auth
- POST /api/auth/login
- GET /api/auth/me

## Main Admin
- GET /api/users
- GET /api/users/roles
- POST /api/users
- PATCH /api/users/:id
- PATCH /api/users/:id/password

## Catalog
- GET /api/catalog/products
- POST /api/catalog/products
- PATCH /api/catalog/products/:id
- GET /api/catalog/warehouses
- POST /api/catalog/warehouses
- GET /api/catalog/inventory
- PATCH /api/catalog/inventory/:id/adjust

## Orders
- GET /api/orders
- GET /api/orders/:id
- POST /api/orders
- POST /api/orders/:id/confirm
- POST /api/orders/:id/reserve
- POST /api/orders/:id/pick
- POST /api/orders/:id/pack
- POST /api/orders/:id/confirm-receipt

## Shipments
- GET /api/shipments
- POST /api/shipments/from-order/:orderId
- POST /api/shipments/:id/assign
- PATCH /api/shipments/:id/status
- POST /api/shipments/:id/proof

## Restocking
- GET /api/restocks
- POST /api/restocks
- POST /api/restocks/:id/validate
- POST /api/restocks/:id/receive

## Complaints / service
- GET /api/complaints
- POST /api/complaints
- POST /api/complaints/:id/assign-technician
- PATCH /api/complaints/:id/status
- GET /api/service-visits
- PATCH /api/service-visits/:id

## Returns
- GET /api/returns
- POST /api/returns
- PATCH /api/returns/:id/status

## Notifications
- GET /api/notifications
- PATCH /api/notifications/:id/read
- PATCH /api/notifications/read-all

## Fleet
- GET /api/fleet/vehicles
- POST /api/fleet/vehicles
- GET /api/fleet/runs
- POST /api/fleet/runs
- PATCH /api/fleet/vehicles/:id/status

## Analytics
- GET /api/catalog/sell-through (Main Admin / Manufacturer; uses shipped, delivered and closed order lines)

## Warehouse transfers
- GET /api/transfers (Main Admin / Warehouse Manager)
- POST /api/transfers
- PATCH /api/transfers/:id/dispatch
- PATCH /api/transfers/:id/receive

## Workflow notes
- Order statuses distinguish `CONFIRMED` from `RESERVED`; only reserved orders can be picked, and only picked orders can be packed.
- A shipment must be assigned before dispatch. A proof reference or note is required before it can be marked delivered.
- A customer can confirm receipt or request a return only after the order has been delivered.
- Transfer dispatch deducts available stock at the source and increments incoming stock at the destination; receiving reconciles both destination counters.
