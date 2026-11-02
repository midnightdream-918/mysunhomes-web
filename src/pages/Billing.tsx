import { Ban, Banknote, Check, Download, Pencil, RotateCcw, Send } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  confirmDialog,
  Drawer,
  Field,
  Input,
  KeyValue,
  Modal,
  PageHeader,
  Pills,
  run,
  SearchInput,
  Select,
  Table,
  Tabs,
  toast,
  Toolbar,
} from '@/components/ui';
import { downloadCsv, formatDate, formatDateTime, formatMoney, matches, periodLabel, toDayKey } from '@/lib/format';
import { feeType, invoiceStatus } from '@/lib/labels';
import { cancelInvoice, issuePeriod, recordCounterPayment, reissueInvoice, saveReading, updatePrice, useDb, useLookups } from '@/store';
import type { FeeType, Invoice } from '@/types';

export default function BillingPage() {
  const [tab, setTab] = useState<'invoices' | 'meters' | 'prices'>('invoices');
  const readings = useDb('readings');
  const periods = useDb('periods');
  const openPeriod = readings.find((r) => !periods.some((p) => p.id === r.period))?.period;
  return (
    <>
      <PageHeader title="Hóa đơn & thu phí" description="Theo dõi thu phí theo kỳ, nhập chỉ số công tơ và phát hành hóa đơn." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'invoices', label: 'Hóa đơn' },
          { value: 'meters', label: openPeriod ? `Chỉ số công tơ · ${periodLabel(openPeriod)}` : 'Chỉ số công tơ' },
          { value: 'prices', label: 'Bảng đơn giá' },
        ]}
      />
      {tab === 'invoices' && <Invoices />}
      {tab === 'meters' && <Meters period={openPeriod} onIssued={() => setTab('invoices')} />}
      {tab === 'prices' && <Prices />}
    </>
  );
}

function Invoices() {
  const invoices = useDb('invoices');
  const periods = useDb('periods');
  const { aptCode, owner } = useLookups();
  const sortedPeriods = [...periods].sort((a, b) => b.id.localeCompare(a.id));
  const [period, setPeriod] = useState(sortedPeriods[0]?.id ?? '');
  const [status, setStatus] = useState('open');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const inPeriod = useMemo(() => invoices.filter((i) => i.periodId === period), [invoices, period]);
  const summary = useMemo(() => {
    const valid = inPeriod.filter((i) => i.status !== 'CANCELLED');
    const total = valid.reduce((s, i) => s + i.totalAmount, 0);
    const paid = valid.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
    return { total, paid, due: total - paid, count: valid.length, paidCount: valid.filter((i) => i.status === 'PAID').length };
  }, [inPeriod]);

  const rows = inPeriod
    .filter((i) => (status === 'all' ? true : status === 'open' ? i.status === 'UNPAID' || i.status === 'OVERDUE' : i.status === status))
    .filter((i) => matches(q, aptCode(i.apartmentId), owner(i.apartmentId)?.fullName))
    .sort((a, b) => aptCode(a.apartmentId).localeCompare(aptCode(b.apartmentId)));
  const open = invoices.find((i) => i.id === openId);
  const pct = summary.total ? Math.round((summary.paid / summary.total) * 100) : 0;

  return (
    <>
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="w-44">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={sortedPeriods.map((p) => ({ value: p.id, label: periodLabel(p.id) }))} />
          </div>
          <Summary label="Phát hành" value={formatMoney(summary.total)} sub={`${summary.count} hóa đơn`} />
          <Summary label="Đã thu" value={formatMoney(summary.paid)} sub={`${summary.paidCount} căn`} />
          <Summary label="Còn phải thu" value={formatMoney(summary.due)} sub={`${summary.count - summary.paidCount} căn`} />
          <div className="min-w-[180px] flex-1">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">Tỷ lệ thu</span>
              <span className="tabular font-semibold">{pct}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-deep">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <Toolbar>
        <Pills
          value={status}
          onChange={setStatus}
          items={[
            { value: 'open', label: 'Chưa thu' },
            { value: 'OVERDUE', label: 'Quá hạn' },
            { value: 'PAID', label: 'Đã thanh toán' },
            { value: 'CANCELLED', label: 'Đã hủy' },
            { value: 'all', label: 'Tất cả' },
          ]}
        />
        <div className="ml-auto flex gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Mã căn hoặc chủ hộ" />
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => {
              downloadCsv(`hoa-don-${period}.csv`, [
                ['Căn hộ', 'Chủ hộ', 'Tổng tiền', 'Trạng thái', 'Hạn thanh toán', 'Ngày thanh toán', 'Hình thức'],
                ...rows.map((i) => [aptCode(i.apartmentId), owner(i.apartmentId)?.fullName ?? '', i.totalAmount, invoiceStatus[i.status].label, formatDate(i.dueDate), i.paidAt ? formatDate(i.paidAt) : '', i.paymentMethod === 'COUNTER' ? 'Tại quầy' : i.paymentMethod ? 'Cổng thanh toán' : '']),
              ]);
              toast(`Đã xuất ${rows.length} hóa đơn.`);
            }}
          >
            Xuất Excel
          </Button>
        </div>
      </Toolbar>

      <Table
        rows={rows}
        rowKey={(i) => i.id}
        onRowClick={(i) => setOpenId(i.id)}
        empty="Không có hóa đơn phù hợp"
        columns={[
          { header: 'Căn hộ', render: (i) => <span className="font-semibold">{aptCode(i.apartmentId)}</span> },
          { header: 'Chủ hộ', render: (i) => owner(i.apartmentId)?.fullName ?? '—' },
          { header: 'Tổng tiền', align: 'right', render: (i) => <span className="tabular font-medium">{formatMoney(i.totalAmount)}</span> },
          { header: 'Hạn', render: (i) => <span className="tabular text-ink-soft">{formatDate(i.dueDate)}</span> },
          { header: 'Thanh toán', render: (i) => <span className="tabular text-ink-soft">{i.paidAt ? `${formatDate(i.paidAt)} · ${i.paymentMethod === 'COUNTER' ? 'Quầy' : 'Online'}` : '—'}</span> },
          { header: 'Trạng thái', render: (i) => <Badge {...invoiceStatus[i.status]} /> },
        ]}
      />
      {open && <InvoiceDrawer invoice={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="tabular text-lg font-bold">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  );
}

function InvoiceDrawer({ invoice: i, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { aptCode, owner } = useLookups();
  const payable = i.status === 'UNPAID' || i.status === 'OVERDUE';
  return (
    <Drawer
      open
      onClose={onClose}
      title={`Hóa đơn căn ${aptCode(i.apartmentId)}`}
      subtitle={`${periodLabel(i.periodId)} · ${owner(i.apartmentId)?.fullName ?? ''}`}
      footer={
        <>
          {payable && (
            <Button
              variant="ghost"
              icon={Ban}
              onClick={async () => {
                if (await confirmDialog({ title: 'Hủy hóa đơn phát hành sai?', message: 'Hóa đơn bị hủy sẽ không còn hiển thị cho cư dân. Bạn có thể phát hành lại sau.', destructive: true, confirmText: 'Hủy hóa đơn' }))
                  run(() => cancelInvoice(i.id), 'Đã hủy hóa đơn.');
              }}
            >
              Hủy hóa đơn
            </Button>
          )}
          {i.status === 'CANCELLED' && (
            <Button icon={RotateCcw} onClick={() => run(() => reissueInvoice(i.id), 'Đã phát hành lại hóa đơn.') && onClose()}>
              Phát hành lại
            </Button>
          )}
          {payable && (
            <Button
              icon={Banknote}
              onClick={async () => {
                if (await confirmDialog({ title: 'Ghi nhận thu tại quầy', message: `Xác nhận đã thu ${formatMoney(i.totalAmount)} bằng tiền mặt hoặc chuyển khoản tại quầy.` }))
                  run(() => recordCounterPayment(i.id), 'Đã ghi nhận thanh toán.');
              }}
            >
              Ghi nhận thu tại quầy
            </Button>
          )}
        </>
      }
    >
      <Card className="text-center">
        <Badge {...invoiceStatus[i.status]} />
        <p className="tabular mt-2 text-3xl font-bold">{formatMoney(i.totalAmount)}</p>
        <p className="mt-1 text-[13px] text-muted">Hạn thanh toán {formatDate(i.dueDate)}</p>
      </Card>
      <Card padded={false}>
        {i.items.map((it, k) => (
          <div key={k} className="flex items-center justify-between border-b border-line px-5 py-3 last:border-0">
            <div>
              <p className="font-medium">{feeType[it.feeType]}</p>
              <p className="text-xs text-muted">
                {it.description} × {formatMoney(it.unitPrice)}
              </p>
            </div>
            <span className="tabular font-medium">{formatMoney(it.amount)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-b-2xl bg-surface-warm px-5 py-3">
          <span className="font-semibold">Tổng cộng</span>
          <span className="tabular text-lg font-bold text-gold">{formatMoney(i.totalAmount)}</span>
        </div>
      </Card>
      {i.paidAt && (
        <Card>
          <KeyValue label="Thanh toán lúc">{formatDateTime(i.paidAt)}</KeyValue>
          <KeyValue label="Hình thức">{i.paymentMethod === 'COUNTER' ? 'Tại quầy' : 'Cổng thanh toán'}</KeyValue>
        </Card>
      )}
    </Drawer>
  );
}

function Meters({ period, onIssued }: { period?: string; onIssued: () => void }) {
  const readings = useDb('readings');
  const { aptCode } = useLookups();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'missing' | 'all'>('missing');
  const [issuing, setIssuing] = useState(false);
  const [due, setDue] = useState(() => {
    const d = new Date();
    return toDayKey(new Date(d.getFullYear(), d.getMonth() + 1, 15));
  });
  const [draft, setDraft] = useState<Record<string, { e: string; w: string }>>({});

  const rows = useMemo(() => (period ? readings.filter((r) => r.period === period) : []), [readings, period]);
  const done = rows.filter((r) => r.electricCurr !== undefined && r.waterCurr !== undefined).length;
  const visible = rows
    .filter((r) => (filter === 'all' || r.electricCurr === undefined || r.waterCurr === undefined) && matches(q, aptCode(r.apartmentId)))
    .sort((a, b) => aptCode(a.apartmentId).localeCompare(aptCode(b.apartmentId)));

  if (!period) return <Card><p className="text-muted">Không có kỳ nào đang mở để nhập chỉ số.</p></Card>;

  const save = (apartmentId: string) => {
    const d = draft[apartmentId];
    if (!d) return;
    const e = d.e === '' ? undefined : Number(d.e);
    const w = d.w === '' ? undefined : Number(d.w);
    if (run(() => saveReading(apartmentId, period, e, w))) setDraft(({ [apartmentId]: _, ...rest }) => rest);
  };

  return (
    <>
      <Card className="mb-5 flex flex-wrap items-center gap-6">
        <div className="min-w-[240px] flex-1">
          <p className="font-semibold">{periodLabel(period)}</p>
          <p className="text-[13px] text-muted">
            Đã nhập {done}/{rows.length} căn. Phát hành khi mọi căn đã có chỉ số.
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-deep">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(done / Math.max(1, rows.length)) * 100}%` }} />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            // Demo convenience: fill plausible readings for every missing meter.
            rows.filter((r) => r.electricCurr === undefined || r.waterCurr === undefined).forEach((r) => {
              saveReading(r.apartmentId, period, r.electricPrev + 180 + Math.round(Math.random() * 280), r.waterPrev + 8 + Math.round(Math.random() * 14));
            });
            toast('Đã điền chỉ số mẫu cho các căn còn thiếu.');
          }}
        >
          Điền dữ liệu mẫu
        </Button>
        <Button icon={Send} disabled={done < rows.length} onClick={() => setIssuing(true)}>
          Phát hành kỳ
        </Button>
      </Card>

      <Toolbar>
        <Pills value={filter} onChange={setFilter} items={[{ value: 'missing', label: `Chưa nhập (${rows.length - done})` }, { value: 'all', label: 'Tất cả' }]} />
        <div className="ml-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Mã căn" />
        </div>
      </Toolbar>

      <Table
        rows={visible}
        rowKey={(r) => r.apartmentId}
        pageSize={15}
        empty="Mọi căn đã có chỉ số"
        columns={[
          { header: 'Căn hộ', render: (r) => <span className="font-semibold">{aptCode(r.apartmentId)}</span> },
          { header: 'Điện kỳ trước', align: 'right', render: (r) => <span className="tabular text-ink-soft">{r.electricPrev.toLocaleString('vi-VN')}</span> },
          {
            header: 'Điện kỳ này (kWh)',
            render: (r) => (
              <Input
                className="h-9 w-32"
                inputMode="numeric"
                value={draft[r.apartmentId]?.e ?? r.electricCurr ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [r.apartmentId]: { e: e.target.value, w: d[r.apartmentId]?.w ?? String(r.waterCurr ?? '') } }))}
                onKeyDown={(e) => e.key === 'Enter' && save(r.apartmentId)}
              />
            ),
          },
          { header: 'Nước kỳ trước', align: 'right', render: (r) => <span className="tabular text-ink-soft">{r.waterPrev.toLocaleString('vi-VN')}</span> },
          {
            header: 'Nước kỳ này (m³)',
            render: (r) => (
              <Input
                className="h-9 w-28"
                inputMode="numeric"
                value={draft[r.apartmentId]?.w ?? r.waterCurr ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [r.apartmentId]: { w: e.target.value, e: d[r.apartmentId]?.e ?? String(r.electricCurr ?? '') } }))}
                onKeyDown={(e) => e.key === 'Enter' && save(r.apartmentId)}
              />
            ),
          },
          {
            header: '',
            align: 'right',
            render: (r) =>
              draft[r.apartmentId] ? (
                <Button size="sm" icon={Check} onClick={() => save(r.apartmentId)}>
                  Lưu
                </Button>
              ) : r.electricCurr !== undefined && r.waterCurr !== undefined ? (
                <Badge label="Đã nhập" tone="green" />
              ) : null,
          },
        ]}
      />

      <Modal
        open={issuing}
        onClose={() => setIssuing(false)}
        title={`Phát hành ${periodLabel(period)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIssuing(false)}>
              Hủy
            </Button>
            <Button
              icon={Send}
              onClick={() => {
                let n = 0;
                if (run(() => (n = issuePeriod(period, due)))) {
                  toast(`Đã phát hành ${n} hóa đơn và gửi thông báo tới cư dân.`);
                  setIssuing(false);
                  onIssued();
                }
              }}
            >
              Phát hành
            </Button>
          </>
        }
      >
        <p className="mb-4 text-ink-soft">
          Hệ thống tạo hóa đơn cho {rows.length} căn đang có người ở: phí quản lý, gửi xe, điện, nước, dịch vụ đã hoàn thành và tiện ích trả qua hóa đơn.
        </p>
        <Field label="Hạn thanh toán" required>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </Modal>
    </>
  );
}

function Prices() {
  const prices = useDb('prices');
  const [editing, setEditing] = useState<FeeType | null>(null);
  const [value, setValue] = useState('');
  return (
    <Table
      rows={prices}
      rowKey={(p) => p.feeType}
      columns={[
        { header: 'Khoản phí', render: (p) => <span className="font-medium">{feeType[p.feeType]}</span> },
        {
          header: 'Đơn giá',
          align: 'right',
          render: (p) =>
            editing === p.feeType ? (
              <span className="flex justify-end">
                <Input className="h-9 w-36 text-right" autoFocus inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
              </span>
            ) : (
              <span className="tabular font-medium">{formatMoney(p.unitPrice)}</span>
            ),
        },
        { header: 'Đơn vị', render: (p) => <span className="text-ink-soft">{p.unit}</span> },
        { header: 'Áp dụng từ', render: (p) => <span className="tabular text-ink-soft">{formatDate(p.effectiveFrom)}</span> },
        {
          header: '',
          align: 'right',
          render: (p) =>
            editing === p.feeType ? (
              <span className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Hủy
                </Button>
                <Button size="sm" onClick={() => run(() => updatePrice(p.feeType, Number(value)), 'Đã cập nhật đơn giá, áp dụng từ kỳ kế tiếp.') && setEditing(null)}>
                  Lưu
                </Button>
              </span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon={Pencil}
                onClick={() => {
                  setEditing(p.feeType);
                  setValue(String(p.unitPrice));
                }}
              >
                Sửa
              </Button>
            ),
        },
      ]}
    />
  );
}
