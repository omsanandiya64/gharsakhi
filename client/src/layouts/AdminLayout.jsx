import { LayoutDashboard, CalendarCheck, Users, HardHat, Receipt } from 'lucide-react';
import { PanelLayout } from './PanelLayout.jsx';

const NAV_ITEMS = [
  { path: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { path: '/admin/customers', label: 'Customers', icon: Users },
  { path: '/admin/workers', label: 'Workers', icon: HardHat },
  { path: '/admin/transactions', label: 'Transactions', icon: Receipt },
];

export function AdminLayout() {
  return <PanelLayout brand="Admin" items={NAV_ITEMS} />;
}
