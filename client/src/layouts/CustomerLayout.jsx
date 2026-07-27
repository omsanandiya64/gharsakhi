import { Home, CalendarCheck, Wallet, User } from 'lucide-react';
import { PanelLayout } from './PanelLayout.jsx';

const NAV_ITEMS = [
  { path: '/customer', end: true, label: 'Home', icon: Home },
  { path: '/customer/bookings', label: 'Bookings', icon: CalendarCheck },
  { path: '/customer/wallet', label: 'Wallet', icon: Wallet },
  { path: '/customer/profile', label: 'Profile', icon: User },
];

export function CustomerLayout() {
  return <PanelLayout brand="Customer" items={NAV_ITEMS} />;
}
