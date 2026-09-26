import { ShieldCheck, PackagePlus, Warehouse, Truck, Store, Wrench } from 'lucide-react'

export const ROLES = [
  { id: 'admin', label: 'Main Admin', icon: ShieldCheck, blurb: 'Manage users, assign roles, control the WAREX platform.' },
  { id: 'manufacturer', label: 'Manufacturer', icon: PackagePlus, blurb: 'Submit restocks, monitor sell-through and purchase orders.' },
  { id: 'warehouse_manager', label: 'Warehouse Manager', icon: Warehouse, blurb: 'Receive stock, reserve, pick, pack and ship orders.' },
  { id: 'delivery_partner', label: 'Delivery Partner', icon: Truck, blurb: "Run assigned deliveries and capture proof of delivery." },
  { id: 'business_customer', label: 'Business Customer', icon: Store, blurb: 'Browse products, place bulk orders and track deliveries.' },
  { id: 'technician', label: 'Technician', icon: Wrench, blurb: 'Handle service visits, assembly, defects and service reports.' },
]

export const getRole = (id) => ROLES.find((r) => r.id === id) || ROLES[0]
