import {
  BarChart3,
  Building2,
  Car,
  ClipboardCheck,
  DoorOpen,
  LayoutDashboard,
  MessageSquareWarning,
  Newspaper,
  ReceiptText,
  CalendarCheck,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { StaffRole } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: StaffRole[];
  badge?: 'approvals' | 'complaints' | 'services' | 'walkins';
}

const OFFICE: StaffRole[] = ['MANAGER', 'ADMIN'];

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: '',
    items: [
      { to: '/', label: 'Tổng quan', icon: LayoutDashboard, roles: OFFICE },
      { to: '/approvals', label: 'Phê duyệt', icon: ClipboardCheck, roles: OFFICE, badge: 'approvals' },
    ],
  },
  {
    group: 'Cư dân',
    items: [
      { to: '/apartments', label: 'Căn hộ & cư dân', icon: Building2, roles: OFFICE },
      { to: '/vehicles', label: 'Phương tiện & thẻ', icon: Car, roles: OFFICE },
      { to: '/access', label: 'Ra vào & khách', icon: DoorOpen, roles: [...OFFICE, 'SECURITY'], badge: 'walkins' },
    ],
  },
  {
    group: 'Vận hành',
    items: [
      { to: '/billing', label: 'Hóa đơn & thu phí', icon: ReceiptText, roles: OFFICE },
      { to: '/services', label: 'Dịch vụ', icon: Wrench, roles: OFFICE, badge: 'services' },
      { to: '/facilities', label: 'Tiện ích', icon: CalendarCheck, roles: OFFICE },
      { to: '/complaints', label: 'Phản ánh', icon: MessageSquareWarning, roles: [...OFFICE, 'TECHNICIAN'], badge: 'complaints' },
      { to: '/announcements', label: 'Bảng tin', icon: Newspaper, roles: OFFICE },
    ],
  },
  {
    group: 'Quản trị',
    items: [
      { to: '/reports', label: 'Báo cáo', icon: BarChart3, roles: OFFICE },
      { to: '/staff', label: 'Nhân viên', icon: UsersRound, roles: ['ADMIN'] },
    ],
  },
];

export function homeFor(role: StaffRole) {
  if (role === 'SECURITY') return '/access';
  if (role === 'TECHNICIAN') return '/complaints';
  return '/';
}

export function canAccess(role: StaffRole, path: string) {
  const item = NAV.flatMap((g) => g.items).find((i) => (i.to === '/' ? path === '/' : path.startsWith(i.to)));
  return !item || item.roles.includes(role);
}
