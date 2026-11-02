import { CircleCheck, Clock, Download, DoorOpen, MessageSquareWarning, ReceiptText, RotateCcw, ShieldAlert, UsersRound, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

import { BarList, CHART, ColumnChart, TrendChart } from '@/components/charts';
import { Button, Card, PageHeader, Pills, SectionTitle, StatCard, Table, Tabs, toast } from '@/components/ui';
import { addDays, downloadCsv, formatDayShort, formatMoney, formatMoneyShort, periodLabel, toDayKey } from '@/lib/format';
import { accessMethod, complaintCategory } from '@/lib/labels';
import { useDb, useLookups } from '@/store';

export default function ReportsPage() {
  const [tab, setTab] = useState<'billing' | 'access' | 'complaints'>('billing');
  return (
    <>
      <PageHeader title="Báo cáo" description="Số liệu tổng hợp để theo dõi vận hành. Mỗi báo cáo xuất được ra Excel." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'billing', label: 'Thu phí & công nợ' },
          { value: 'access', label: 'Ra vào & khách' },
          { value: 'complaints', label: 'Xử lý phản ánh' },
        ]}
      />
      {tab === 'billing' && <BillingReport />}
      {tab === 'access' && <AccessReport />}
      {tab === 'complaints' && <ComplaintReport />}
    </>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="secondary" icon={Download} onClick={onClick}>
      Xuất Excel
    </Button>
  );
}

function BillingReport() {
  const invoices = useDb('invoices');
  const periods = useDb('periods');
  const { aptCode, owner } = useLookups();

  const byPeriod = useMemo(
    () =>
      [...periods]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((p) => {
          const list = invoices.filter((i) => i.periodId === p.id && i.status !== 'CANCELLED');
          const paid = list.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
          const total = list.reduce((s, i) => s + i.totalAmount, 0);
          return { id: p.id, period: `T${p.month}/${String(p.year).slice(2)}`, paid, due: total - paid, total, count: list.length };
        }),
    [periods, invoices],
  );

  const debtors = useMemo(() => {
    const m = new Map<string, { periods: number; amount: number; overdue: number }>();
    invoices
      .filter((i) => i.status === 'UNPAID' || i.status === 'OVERDUE')
      .forEach((i) => {
        const d = m.get(i.apartmentId) ?? { periods: 0, amount: 0, overdue: 0 };
        d.periods++;
        d.amount += i.totalAmount;
        if (i.status === 'OVERDUE') d.overdue++;
        m.set(i.apartmentId, d);
      });
    return [...m.entries()].map(([apartmentId, d]) => ({ apartmentId, ...d })).sort((a, b) => b.amount - a.amount);
  }, [invoices]);

  const total = byPeriod.reduce((s, p) => s + p.total, 0);
  const paid = byPeriod.reduce((s, p) => s + p.paid, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ReceiptText} label={`Phát hành ${byPeriod.length} kỳ`} value={formatMoneyShort(total)} hint={formatMoney(total)} />
        <StatCard icon={Wallet} tone="green" label="Đã thu" value={formatMoneyShort(paid)} hint={`${total ? Math.round((paid / total) * 100) : 0}% giá trị phát hành`} />
        <StatCard icon={ShieldAlert} tone="red" label="Công nợ" value={formatMoneyShort(total - paid)} hint={`${debtors.length} căn còn nợ · ${debtors.filter((d) => d.overdue).length} quá hạn`} />
      </div>
      <Card>
        <SectionTitle
          action={
            <ExportButton
              onClick={() => {
                downloadCsv('thu-phi-theo-ky.csv', [['Kỳ', 'Số hóa đơn', 'Phát hành', 'Đã thu', 'Còn nợ'], ...byPeriod.map((p) => [periodLabel(p.id), p.count, p.total, p.paid, p.due])]);
                toast('Đã xuất báo cáo thu phí.');
              }}
            />
          }
        >
          Thu phí theo kỳ
        </SectionTitle>
        <ColumnChart
          data={byPeriod}
          x="period"
          series={[
            { key: 'paid', label: 'Đã thu', color: CHART.s1 },
            { key: 'due', label: 'Chưa thu', color: CHART.s2 },
          ]}
          format={formatMoney}
          axisFormat={formatMoneyShort}
          height={280}
        />
      </Card>
      <div>
        <SectionTitle
          action={
            <ExportButton
              onClick={() => {
                downloadCsv('cong-no-can-ho.csv', [['Căn hộ', 'Chủ hộ', 'Số kỳ nợ', 'Kỳ quá hạn', 'Tổng nợ'], ...debtors.map((d) => [aptCode(d.apartmentId), owner(d.apartmentId)?.fullName ?? '', d.periods, d.overdue, d.amount])]);
                toast('Đã xuất danh sách công nợ.');
              }}
            />
          }
        >
          Căn hộ còn nợ
        </SectionTitle>
        <Table
          rows={debtors}
          rowKey={(d) => d.apartmentId}
          pageSize={8}
          columns={[
            { header: 'Căn hộ', render: (d) => <span className="font-semibold">{aptCode(d.apartmentId)}</span> },
            { header: 'Chủ hộ', render: (d) => owner(d.apartmentId)?.fullName ?? '—' },
            { header: 'Số kỳ nợ', align: 'center', render: (d) => <span className="tabular">{d.periods}</span> },
            { header: 'Quá hạn', align: 'center', render: (d) => <span className={d.overdue ? 'tabular font-semibold text-rose' : 'tabular text-faint'}>{d.overdue}</span> },
            { header: 'Tổng nợ', align: 'right', render: (d) => <span className="tabular font-medium">{formatMoney(d.amount)}</span> },
          ]}
        />
      </div>
    </div>
  );
}

function AccessReport() {
  const logs = useDb('accessLogs');
  const [days, setDays] = useState<'7' | '14'>('14');
  const data = useMemo(() => {
    const n = Number(days);
    const from = toDayKey(addDays(new Date(), -(n - 1)));
    const inRange = logs.filter((l) => toDayKey(new Date(l.time)) >= from);
    const perDay = new Map<string, number>();
    inRange.forEach((l) => {
      const k = toDayKey(new Date(l.time));
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    });
    const series = Array.from({ length: n }, (_, i) => {
      const k = toDayKey(addDays(new Date(), i - (n - 1)));
      return { day: formatDayShort(k), key: k, count: perDay.get(k) ?? 0 };
    });
    const byMethod = (Object.keys(accessMethod) as (keyof typeof accessMethod)[]).map((m) => ({ label: accessMethod[m], value: inRange.filter((l) => l.method === m).length }));
    return {
      series,
      byMethod,
      total: inRange.length,
      guests: inRange.filter((l) => l.subjectType === 'GUEST').length,
      denied: inRange.filter((l) => l.result === 'DENIED').length,
    };
  }, [logs, days]);

  return (
    <div className="space-y-6">
      <Pills value={days} onChange={setDays} items={[{ value: '7', label: '7 ngày' }, { value: '14', label: '14 ngày' }]} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={DoorOpen} label="Tổng lượt ra vào" value={data.total.toLocaleString('vi-VN')} hint={`Trung bình ${Math.round(data.total / Number(days))} lượt/ngày`} />
        <StatCard icon={UsersRound} tone="blue" label="Lượt khách" value={data.guests.toLocaleString('vi-VN')} hint="Mã QR và walk-in" />
        <StatCard icon={ShieldAlert} tone="red" label="Bị từ chối" value={data.denied} hint="Thẻ khóa hoặc mã không hợp lệ" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle
            action={
              <ExportButton
                onClick={() => {
                  downloadCsv(`ra-vao-${days}-ngay.csv`, [['Ngày', 'Lượt ra vào'], ...data.series.map((s) => [s.key, s.count])]);
                  toast('Đã xuất báo cáo ra vào.');
                }}
              />
            }
          >
            Lượt ra vào theo ngày
          </SectionTitle>
          <TrendChart data={data.series} x="day" y="count" label="Lượt ra vào" format={(v) => `${v} lượt`} />
        </Card>
        <Card>
          <SectionTitle>Theo phương thức</SectionTitle>
          <BarList items={data.byMethod} format={(v) => v.toLocaleString('vi-VN')} />
          <p className="mt-4 text-xs text-muted">Quẹt thẻ gồm cả thẻ cư dân và thẻ xe tại hầm.</p>
        </Card>
      </div>
    </div>
  );
}

function ComplaintReport() {
  const complaints = useDb('complaints');
  const staff = useDb('staff');
  const { staffName } = useLookups();

  const stats = useMemo(() => {
    const durations: number[] = [];
    complaints.forEach((c) => {
      const resolved = c.history.find((h) => h.status === 'RESOLVED');
      if (resolved) durations.push((new Date(resolved.at).getTime() - new Date(c.createdAt).getTime()) / 3_600_000);
    });
    const reopened = complaints.filter((c) => c.history.some((h) => h.status === 'REOPENED')).length;
    const byCategory = (Object.keys(complaintCategory) as (keyof typeof complaintCategory)[]).map((k) => ({ label: complaintCategory[k], value: complaints.filter((c) => c.category === k).length }));
    const handlers = new Map<string, { total: number; done: number; hours: number[] }>();
    complaints.forEach((c) => {
      const who = staffName(c.assigneeId) ?? c.external;
      if (!who) return;
      const h = handlers.get(who) ?? { total: 0, done: 0, hours: [] };
      h.total++;
      const resolved = c.history.find((x) => x.status === 'RESOLVED');
      if (resolved) {
        h.done++;
        h.hours.push((new Date(resolved.at).getTime() - new Date(c.createdAt).getTime()) / 3_600_000);
      }
      handlers.set(who, h);
    });
    return {
      total: complaints.length,
      closed: complaints.filter((c) => c.status === 'CLOSED').length,
      avg: durations.length ? durations.reduce((s, x) => s + x, 0) / durations.length : 0,
      reopened,
      byCategory,
      handlers: [...handlers.entries()].map(([name, h]) => ({ name, ...h, avg: h.hours.length ? h.hours.reduce((s, x) => s + x, 0) / h.hours.length : 0 })).sort((a, b) => b.total - a.total),
    };
  }, [complaints, staffName, staff]);

  const hours = (h: number) => (h >= 24 ? `${(h / 24).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ngày` : `${Math.round(h)} giờ`);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={MessageSquareWarning} label="Tổng phản ánh" value={stats.total} />
        <StatCard icon={CircleCheck} tone="green" label="Đã đóng" value={stats.closed} hint={`${stats.total ? Math.round((stats.closed / stats.total) * 100) : 0}% tổng số`} />
        <StatCard icon={Clock} tone="blue" label="Thời gian xử lý TB" value={hours(stats.avg)} hint="Từ lúc gửi đến khi xử lý xong" />
        <StatCard icon={RotateCcw} tone="red" label="Bị mở lại" value={stats.reopened} hint="Cư dân chưa hài lòng" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card>
          <SectionTitle>Theo loại</SectionTitle>
          <BarList items={stats.byCategory} format={(v) => String(v)} />
        </Card>
        <div>
          <SectionTitle
            action={
              <ExportButton
                onClick={() => {
                  downloadCsv('xu-ly-phan-anh.csv', [['Người xử lý', 'Được giao', 'Đã xử lý', 'Thời gian TB (giờ)'], ...stats.handlers.map((h) => [h.name, h.total, h.done, Math.round(h.avg)])]);
                  toast('Đã xuất báo cáo phản ánh.');
                }}
              />
            }
          >
            Theo người xử lý
          </SectionTitle>
          <Table
            rows={stats.handlers}
            rowKey={(h) => h.name}
            columns={[
              { header: 'Người xử lý', render: (h) => <span className="font-medium">{h.name}</span> },
              { header: 'Được giao', align: 'center', render: (h) => <span className="tabular">{h.total}</span> },
              { header: 'Đã xử lý', align: 'center', render: (h) => <span className="tabular">{h.done}</span> },
              { header: 'Thời gian TB', align: 'right', render: (h) => <span className="tabular">{h.done ? hours(h.avg) : '—'}</span> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
