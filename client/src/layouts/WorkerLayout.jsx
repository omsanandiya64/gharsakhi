import { LayoutDashboard, Briefcase, Wallet, User } from 'lucide-react';
import { PanelLayout } from './PanelLayout.jsx';

const NAV_ITEMS = [
  { path: '/worker', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { path: '/worker/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/worker/earnings', label: 'Earnings', icon: Wallet },
  { path: '/worker/profile', label: 'Profile', icon: User },
];

export function WorkerLayout() {
  return <PanelLayout brand="Worker" items={NAV_ITEMS} />;
}
