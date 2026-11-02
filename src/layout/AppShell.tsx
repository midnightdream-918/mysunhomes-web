import { LogOut } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';

import { Avatar, cx } from '@/components/ui';
import { staffRole } from '@/lib/labels';
import { expireWalkIns, logout, useDb, useMe } from '@/store';
import { canAccess, homeFor, NAV } from './nav';

function useBadges(staffId?: string) {
  const accounts = useDb('residentAccounts');
  const members = useDb('memberRequests');
  const vehicles = useDb('vehicles');
  const complaints = useDb('complaints');
  const services = useDb('serviceRequests');
  const walkIns = useDb('walkIns');
  const staff = useDb('staff');
  return useMemo(() => {
    const role = staff.find((s) => s.id === staffId)?.role;
    return {
      approvals:
        accounts.filter((a) => a.status === 'PENDING').length +
        members.filter((m) => m.status === 'PENDING').length +
        vehicles.filter((v) => v.status === 'PENDING').length,
      complaints:
        role === 'TECHNICIAN'
          ? complaints.filter((c) => c.assigneeId === staffId && ['ASSIGNED', 'REOPENED', 'IN_PROGRESS'].includes(c.status)).length
          : complaints.filter((c) => c.status === 'NEW' || c.status === 'REOPENED').length,
      services: services.filter((s) => s.status === 'NEW').length,
      walkins: walkIns.filter((w) => w.status === 'PENDING').length,
    };
  }, [accounts, members, vehicles, complaints, services, walkIns, staff, staffId]);
}

export function AppShell() {
  const me = useMe();
  const { pathname } = useLocation();
  const badges = useBadges(me?.id);

  // Walk-in requests expire after 30 minutes without an answer.
  useEffect(() => {
    const t = setInterval(expireWalkIns, 15_000);
    return () => clearInterval(t);
  }, []);

  if (!me) return <Navigate to="/login" replace />;
  if (!canAccess(me.role, pathname)) return <Navigate to={homeFor(me.role)} replace />;

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-gold">MY SUNHOME</p>
            <p className="text-[13px] text-muted">Ban quản lý</p>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {NAV.map((g) => {
            const items = g.items.filter((i) => i.roles.includes(me.role));
            if (!items.length) return null;
            return (
              <div key={g.group || 'main'}>
                {g.group && <p className="mb-1.5 px-3 text-[11px] font-medium tracking-wider text-faint uppercase">{g.group}</p>}
                <div className="space-y-0.5">
                  {items.map((i) => {
                    const count = i.badge ? badges[i.badge] : 0;
                    return (
                      <NavLink
                        key={i.to}
                        to={i.to}
                        end={i.to === '/'}
                        className={({ isActive }) =>
                          cx(
                            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                            isActive ? 'bg-primary-soft text-ink' : 'text-ink-soft hover:bg-bg',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <i.icon size={18} strokeWidth={isActive ? 2.1 : 1.7} className={isActive ? 'text-gold' : 'text-muted'} />
                            <span className="flex-1">{i.label}</span>
                            {count > 0 && <span className="tabular rounded-full bg-terracotta px-1.5 text-[11px] font-semibold text-white">{count}</span>}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="m-3 flex items-center gap-3 rounded-2xl bg-bg p-3">
          <Avatar name={me.fullName} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{me.fullName}</p>
            <p className="text-xs text-muted">{staffRole[me.role]}</p>
          </div>
          <button onClick={logout} title="Đăng xuất" aria-label="Đăng xuất" className="rounded-full p-2 text-muted hover:bg-bg-deep hover:text-ink">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1240px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
