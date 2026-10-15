import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Overview from '../../pages/Overview'
import StubPage from '../../pages/StubPage'
import Receiving from '../../pages/warehouse/Receiving'
import Inventory from '../../pages/warehouse/Inventory'
import Products from '../../pages/admin/Products'
import BusinessCustomers from '../../pages/admin/BusinessCustomers'
import Warehouses from '../../pages/admin/Warehouses'
import UserManagement from '../../pages/admin/UserManagement'
import OrdersShipments from '../../pages/admin/OrdersShipments'
import Complaints from '../../pages/admin/Complaints'
import { Manufacturers, Fleet, Returns, Reports } from '../../pages/admin/ManagementPages'
import RestockShipments from '../../pages/manufacturer/RestockShipments'
import SellThrough from '../../pages/manufacturer/SellThrough'
import PurchaseOrders from '../../pages/manufacturer/PurchaseOrders'
import PickPack from '../../pages/warehouse/PickPack'
import WarehouseShipments from '../../pages/warehouse/Shipments'
import Transfers from '../../pages/warehouse/Transfers'
import TodayRun from '../../pages/delivery/TodayRun'
import History from '../../pages/delivery/History'
import BrowseOrder from '../../pages/customer/BrowseOrder'
import MyOrders from '../../pages/customer/MyOrders'
import ReturnsComplaints from '../../pages/customer/ReturnsComplaints'
import ServiceVisits from '../../pages/technician/ServiceVisits'
import ServiceReports from '../../pages/technician/ServiceReports'
import { NAV_BY_ROLE } from '../../lib/nav'
import { useWarex } from '../../context/WarexContext'

const PAGE_OVERRIDES = {
  admin: { users: UserManagement, manufacturers: Manufacturers, products: Products, customers: BusinessCustomers, warehouses: Warehouses, orders: OrdersShipments, fleet: Fleet, returns: Returns, complaints: Complaints, reports: Reports },
  manufacturer: { shipments: RestockShipments, 'sell-through': SellThrough, 'purchase-orders': PurchaseOrders },
  warehouse_manager: { receiving: Receiving, inventory: Inventory, 'pick-pack': PickPack, shipments: WarehouseShipments, transfers: Transfers },
  delivery_partner: { history: History },
  business_customer: { browse: BrowseOrder, 'my-orders': MyOrders, 'returns-complaints': ReturnsComplaints },
  technician: { 'service-visits': ServiceVisits, 'service-reports': ServiceReports },
}

export default function AppShell({ session }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { toast } = useWarex()
  const items = NAV_BY_ROLE[session.roleId] || []
  const nonIndexItems = items.filter((item) => item.path !== '')
  const overrides = PAGE_OVERRIDES[session.roleId] || {}

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--paper)' }}>
      <Sidebar roleId={session.roleId} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar session={session} onMenuClick={() => setMobileOpen(true)} />
        <main className="app-main flex-1 p-4 md:p-6">
          <Routes>
            <Route index element={session.roleId === 'delivery_partner' ? <TodayRun session={session} /> : <Overview session={session} />} />
            {nonIndexItems.map((item) => {
              const Component = overrides[item.path]
              return <Route key={item.path} path={item.path} element={Component ? <Component session={session} /> : <StubPage title={item.label} />} />
            })}
          </Routes>
        </main>
      </div>
      {toast && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-md px-4 py-3 text-sm shadow-lg" style={{ background: 'var(--ink)', color: '#fff', borderLeft: `3px solid ${toast.type === 'error' ? 'var(--signal-red)' : 'var(--accent)'}` }}>{toast.message}</div>}
    </div>
  )
}
