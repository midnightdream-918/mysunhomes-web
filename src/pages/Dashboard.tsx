import {
  Building2,
  Car,
  ChevronRight,
  DoorOpen,
  MessageSquareWarning,
  ReceiptText,
  UserCheck,
  UserPlus,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { CHART, ColumnChart, TrendChart } from '@/components/charts';
import { Card, EmptyState, IconTile, PageHeader, SectionTitle, StatCard } from '@/components/ui';
import { addDays, formatDayShort, formatMoney, formatMoneyShort, periodLabel, toDayKey } from '@/lib/format';
import type { Tone } from '@/lib/labels';
import { useDb, useMe } from '@/store';

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Chào buổi trưa' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

export default function DashboardPage() {
  const me = useMe();
  const navigate = useNavigate();
  const apartments = useDb('apartments');
  const residents = useDb('residents');
  const invoices = useDb('invoices');
  const periods = useDb('periods');
  const complaints = useDb('complaints');
  const accounts = useDb('residentAccounts');
  const members = useDb('memberRequests');
  const vehicles = useDb('vehicles');
  const services = useDb('serviceRequests');
  const walkIns = useDb('walkIns');
  const logs = useDb('accessLogs');

  const stats = useMemo(() => {
    const occupied = apartments.filter((a) => a.status !== 'VACANT').length;
    const living = residents.filter((r) => r.status === 'LIVING').length;
    const open = invoices.filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE');
    const overdue = open.filter((i) => i.status === 'OVERDUE').length;
    const openComplaints = complaints.filter((c) => c.status !== 'CLOSED');
    return {
      occupied,
      living,
      debt: open.reduce((s, i) => s + i.totalAmount, 0),
      openInvoices: open.length,
      overdue,
      openComplaints: openComplaints.length,
      newComplaints: openComplaints.filter((c) => c.status === 'NEW').length,
    };
  }, [apartments, residents, invoices, complaints]);

  const tasks = [
    { label: 'Tài khoản cư dân chờ duyệt', count: accounts.filter((a) => a.status === 'PENDING').length, icon: UserCheck, tone: 'amber', to: '/approvals' },
    { label: 'Yêu cầu thêm thành viên', count: members.filter((m) => m.status === 'PENDING').length, icon: UserPlus, tone: 'blue', to: '/approvals?tab=members' },
    { label: 'Đăng ký phương tiện', count: vehicles.filter((v) => v.status === 'PENDING').length, icon: Car, tone: 'plum', to: '/approvals?tab=vehicles' },
    { label: 'Phản ánh mới chưa phân công', count: complaints.filter((c) => c.status === 'NEW' || c.status === 'REOPENED').length, icon: MessageSquareWarning, tone: 'red', to: '/complaints' },
    { label: 'Yêu cầu dịch vụ mới', count: services.filter((s) => s.status === 'NEW').length, icon: Wrench, tone: 'terracotta', to: '/services' },
    { label: 'Khách walk-in chờ cư dân xác nhận', count: walkIns.filter((w) => w.status === 'PENDING').length, icon: DoorOpen, tone: 'green', to: '/access' },
  ] satisfies { label: string; count: number; icon: LucideIcon; tone: Tone; to: string }[];
  const pendingTasks = tasks.filter((t) => t.count > 0);

  const collection = useMemo(
    () =>
      [...periods]
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(-6)
        .map((p) => {
          const list = invoices.filter((i) => i.periodId === p.id && i.status !== 'CANCELLED');
          const paid = list.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
          const due = list.filter((i) => i.status !== 'PAID').reduce((s, i) => s + i.totalAmount, 0);
          return { period: `T${p.month}`, paid, due };
        }),
    [periods, invoices],
  );

  const traffic = useMemo(() => {
    const perDay = new Map<string, number>();
    logs.forEach((l) => {
      const k = toDayKey(new Date(l.time));
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    });
    return Array.from({ length: 14 }, (_, k) => {
      const key = toDayKey(addDays(new Date(), k - 13));
      return { day: formatDayShort(key), count: perDay.get(key) ?? 0 };
    });
  }, [logs]);

  const latest = periods.length ? [...periods].sort((a, b) => b.id.localeCompare(a.id))[0] : undefined;
  const latestRate = useMemo(() => {
    if (!latest) return 0;
    const list = invoices.filter((i) => i.periodId === latest.id && i.status !== 'CANCELLED');
    return list.length ? Math.round((list.filter((i) => i.status === 'PAID').length / list.length) * 100) : 0;
  }, [invoices, latest]);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${me?.fullName.split(' ').pop()}`}
        description={`Hôm nay ${formatDayShort(new Date())}. Đây là tình hình khu căn hộ.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Căn hộ đang ở" value={`${stats.occupied}/${apartments.length}`} hint={`${Math.round((stats.occupied / apartments.length) * 100)}% lấp đầy`} onClick={() => navigate('/apartments')} />
        <StatCard icon={UsersRound} tone="blue" label="Cư dân" value={stats.living} hint="Đang cư trú" onClick={() => navigate('/apartments?tab=residents')} />
        <StatCard
          icon={ReceiptText}
          tone="terracotta"
          label="Công nợ chưa thu"
          value={formatMoneyShort(stats.debt)}
          hint={`${stats.openInvoices} hóa đơn · ${stats.overdue} quá hạn`}
          onClick={() => navigate('/billing')}
        />
        <StatCard
          icon={MessageSquareWarning}
          tone="red"
          label="Phản ánh đang mở"
          value={stats.openComplaints}
          hint={`${stats.newComplaints} chưa phân công`}
          onClick={() => navigate('/complaints')}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card>
          <SectionTitle>Cần xử lý</SectionTitle>
          {pendingTasks.length === 0 ? (
            <EmptyState title="Không còn việc tồn đọng" message="Mọi yêu cầu đã được xử lý." />
          ) : (
            <div className="-mx-2">
              {pendingTasks.map((t) => (
                <button key={t.label} onClick={() => navigate(t.to)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-warm">
                  <IconTile icon={t.icon} tone={t.tone} size={36} />
                  <span className="flex-1 text-sm">{t.label}</span>
                  <span className="tabular rounded-full bg-bg-deep px-2.5 py-0.5 text-[13px] font-semibold">{t.count}</span>
                  <ChevronRight size={16} className="text-faint" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle
            action={
              latest && (
                <span className="text-[13px] text-muted">
                  {periodLabel(latest.id)}: đã thu <span className="font-semibold text-ink">{latestRate}%</span> số căn
                </span>
              )
            }
          >
            Thu phí 6 kỳ gần nhất
          </SectionTitle>
          <ColumnChart
            data={collection}
            x="period"
            series={[
              { key: 'paid', label: 'Đã thu', color: CHART.s1 },
              { key: 'due', label: 'Chưa thu', color: CHART.s2 },
            ]}
            format={formatMoney}
            axisFormat={formatMoneyShort}
          />
        </Card>
      </div>

      <Card className="mt-6">
        <SectionTitle action={<span className="text-[13px] text-muted">Quẹt thẻ, mã QR và walk-in</span>}>Lượt ra vào 14 ngày</SectionTitle>
        <TrendChart data={traffic} x="day" y="count" label="Lượt ra vào" format={(v) => `${v} lượt`} height={220} />
      </Card>
    </>
  );
}
