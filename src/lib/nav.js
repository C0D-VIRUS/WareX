import {
  LayoutDashboard, Users, Warehouse, PackageSearch, Truck, Store,
  ClipboardList, Boxes, Undo2, MessageSquareWarning, FileBarChart,
  PackagePlus, TrendingUp, FileText, Inbox, PackageCheck, ArrowLeftRight,
  Route, History, ShoppingCart, ListOrdered, UserCog, Wrench, ClipboardCheck,
} from 'lucide-react'

export const NAV_BY_ROLE = {
  admin: [
    { label: 'Dashboard', path: '', icon: LayoutDashboard, end: true },
    { label: 'User & Roles', path: 'users', icon: UserCog },
    { label: 'Manufacturers', path: 'manufacturers', icon: PackagePlus },
    { label: 'Warehouses', path: 'warehouses', icon: Warehouse },
    { label: 'Products / SKUs', path: 'products', icon: PackageSearch },
    { label: 'Business Customers', path: 'customers', icon: Store },
    { label: 'Orders & Shipments', path: 'orders', icon: ClipboardList },
    { label: 'Fleet', path: 'fleet', icon: Truck },
    { label: 'Returns', path: 'returns', icon: Undo2 },
    { label: 'Complaints', path: 'complaints', icon: MessageSquareWarning },
    { label: 'Reports', path: 'reports', icon: FileBarChart },
  ],
  manufacturer: [
    { label: 'Dashboard', path: '', icon: LayoutDashboard, end: true },
    { label: 'Restock Shipments', path: 'shipments', icon: PackagePlus },
    { label: 'Sell-Through', path: 'sell-through', icon: TrendingUp },
    { label: 'Purchase Orders', path: 'purchase-orders', icon: FileText },
  ],
  warehouse_manager: [
    { label: 'Dashboard', path: '', icon: LayoutDashboard, end: true },
    { label: 'Receiving', path: 'receiving', icon: Inbox },
    { label: 'Inventory', path: 'inventory', icon: Boxes },
    { label: 'Pick & Pack', path: 'pick-pack', icon: PackageCheck },
    { label: 'Shipments', path: 'shipments', icon: ClipboardList },
    { label: 'Transfers', path: 'transfers', icon: ArrowLeftRight },
  ],
  delivery_partner: [
    { label: "Today's Run", path: '', icon: Route, end: true },
    { label: 'Shipment History', path: 'history', icon: History },
  ],
  business_customer: [
    { label: 'Dashboard', path: '', icon: LayoutDashboard, end: true },
    { label: 'Browse & Order', path: 'browse', icon: ShoppingCart },
    { label: 'My Orders', path: 'my-orders', icon: ListOrdered },
    { label: 'Returns & Complaints', path: 'returns-complaints', icon: MessageSquareWarning },
  ],
  technician: [
    { label: 'Dashboard', path: '', icon: LayoutDashboard, end: true },
    { label: 'Service Visits', path: 'service-visits', icon: Wrench },
    { label: 'Service Reports', path: 'service-reports', icon: ClipboardCheck },
  ],
}
