import { CalendarClock, Check, Pencil, Play, Plus, UserRound, X } from 'lucide-react';
import { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  cx,
  Drawer,
  Field,
  Input,
  KeyValue,
  Modal,
  PageHeader,
  promptDialog,
  run,
  SectionTitle,
  Select,
  Table,
  Tabs,
  Textarea,
  Timeline,
  toneClass,
} from '@/components/ui';
import { formatDateTime, formatMoney, formatRelative, toLocalInput } from '@/lib/format';
import { serviceStatus } from '@/lib/labels';
import { advanceService, saveService, useDb, useLookups } from '@/store';
import type { Service, ServiceRequest, ServiceStatus } from '@/types';

const COLUMNS: ServiceStatus[] = ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
const WORKERS = ['Lê Hoàng', 'Đỗ Minh Khoa', 'Đội vệ sinh', 'Đội kỹ thuật', 'Đối tác bên ngoài'];

export default function ServicesPage() {
  const [tab, setTab] = useState<'requests' | 'catalog'>('requests');
  const requests = useDb('serviceRequests');
  return (
    <>
      <PageHeader title="Dịch vụ" description="Tiếp nhận yêu cầu dịch vụ của cư dân và quản lý danh mục." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'requests', label: 'Yêu cầu', count: requests.filter((r) => r.status === 'NEW').length },
          { value: 'catalog', label: 'Danh mục dịch vụ' },
        ]}
      />
      {tab === 'requests' ? <Board /> : <Catalog />}
    </>
  );
}

function Board() {
  const requests = useDb('serviceRequests');
  const services = useDb('services');
  const { aptCode } = useLookups();
  const [openId, setOpenId] = useState<string | null>(null);
  const cancelled = requests.filter((r) => r.status === 'CANCELLED').length;
  const open = requests.find((r) => r.id === openId);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = requests.filter((r) => r.status === col).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <div key={col} className="rounded-2xl bg-bg-deep/60 p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cx('h-2 w-2 rounded-full', toneClass[serviceStatus[col].tone].dot)} />
                <span className="text-sm font-semibold">{serviceStatus[col].label}</span>
                <span className="tabular ml-auto text-[13px] text-muted">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((r) => (
                  <button key={r.id} onClick={() => setOpenId(r.id)} className="w-full rounded-xl border border-line bg-surface p-3.5 text-left shadow-soft transition-shadow hover:shadow-card">
                    <p className="font-medium">{services.find((s) => s.id === r.serviceId)?.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-soft">{r.description}</p>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
                      <span className="font-medium text-ink">{aptCode(r.apartmentId)}</span>
                      <span>{r.assignee ?? formatRelative(r.createdAt)}</span>
                    </div>
                  </button>
                ))}
                {items.length === 0 && <p className="px-1 py-4 text-center text-[13px] text-faint">Trống</p>}
              </div>
            </div>
          );
        })}
      </div>
      {cancelled > 0 && <p className="mt-4 text-[13px] text-muted">{cancelled} yêu cầu đã hủy không hiển thị trên bảng.</p>}
      {open && <RequestDrawer request={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function RequestDrawer({ request: r, onClose }: { request: ServiceRequest; onClose: () => void }) {
  const services = useDb('services');
  const { aptCode, owner } = useLookups();
  const service = services.find((s) => s.id === r.serviceId);
  const [accepting, setAccepting] = useState(false);
  const [assignee, setAssignee] = useState(WORKERS[0]);
  const [schedule, setSchedule] = useState(toLocalInput(r.preferredTime));

  return (
    <Drawer
      open
      onClose={onClose}
      title={service?.name}
      subtitle={`Căn ${aptCode(r.apartmentId)} · ${owner(r.apartmentId)?.fullName ?? ''}`}
      footer={
        <>
          {(r.status === 'NEW' || r.status === 'ACCEPTED') && (
            <Button
              variant="ghost"
              icon={X}
              onClick={async () => {
                const reason = await promptDialog({ title: 'Từ chối yêu cầu', confirmText: 'Từ chối', destructive: true, input: { label: 'Lý do', required: true } });
                if (reason) run(() => advanceService(r.id, 'CANCELLED', { note: reason }), 'Đã từ chối yêu cầu.');
              }}
            >
              Từ chối
            </Button>
          )}
          {r.status === 'NEW' && (
            <Button icon={Check} onClick={() => setAccepting(true)}>
              Tiếp nhận
            </Button>
          )}
          {r.status === 'ACCEPTED' && (
            <Button icon={Play} onClick={() => run(() => advanceService(r.id, 'IN_PROGRESS'), 'Đã chuyển sang đang xử lý.')}>
              Bắt đầu thực hiện
            </Button>
          )}
          {r.status === 'IN_PROGRESS' && (
            <Button icon={Check} onClick={() => run(() => advanceService(r.id, 'COMPLETED', { note: `Phí ${formatMoney(service?.price ?? 0)} cộng vào hóa đơn kỳ kế tiếp` }), 'Đã hoàn thành. Phí sẽ cộng vào hóa đơn kỳ tới.')}>
              Hoàn thành
            </Button>
          )}
        </>
      }
    >
      <Card>
        <div className="mb-2">
          <Badge {...serviceStatus[r.status]} />
        </div>
        <p>{r.description}</p>
        <div className="mt-3 border-t border-line pt-2">
          <KeyValue label="Thời gian mong muốn">{formatDateTime(r.preferredTime)}</KeyValue>
          {r.scheduledTime && <KeyValue label="Lịch hẹn">{formatDateTime(r.scheduledTime)}</KeyValue>}
          {r.assignee && <KeyValue label="Người thực hiện">{r.assignee}</KeyValue>}
          <KeyValue label="Đơn giá">{service ? `${formatMoney(service.price)} / ${service.unit}` : '—'}</KeyValue>
          {r.cancelReason && <KeyValue label="Lý do hủy">{r.cancelReason}</KeyValue>}
        </div>
      </Card>
      <div>
        <SectionTitle>Tiến trình</SectionTitle>
        <Card>
          <Timeline steps={r.history} meta={serviceStatus} />
        </Card>
      </div>

      <Modal
        open={accepting}
        onClose={() => setAccepting(false)}
        title="Tiếp nhận yêu cầu"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccepting(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (run(() => advanceService(r.id, 'ACCEPTED', { assignee, scheduledTime: new Date(schedule).toISOString(), note: `Giao cho ${assignee}` }), 'Đã tiếp nhận và báo lịch hẹn cho cư dân.'))
                  setAccepting(false);
              }}
            >
              Tiếp nhận
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Người thực hiện" required>
            <div className="relative">
              <UserRound size={16} className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted" />
              <Select className="pl-10" value={assignee} onChange={(e) => setAssignee(e.target.value)} options={WORKERS.map((w) => ({ value: w, label: w }))} />
            </div>
          </Field>
          <Field label="Lịch hẹn" required>
            <div className="relative">
              <CalendarClock size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
              <Input className="pl-10" type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
            </div>
          </Field>
        </div>
      </Modal>
    </Drawer>
  );
}

function Catalog() {
  const services = useDb('services');
  const [edit, setEdit] = useState<Partial<Service> | null>(null);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon={Plus} onClick={() => setEdit({ name: '', description: '', price: 0, unit: 'lượt', active: true })}>
          Thêm dịch vụ
        </Button>
      </div>
      <Table
        rows={services}
        rowKey={(s) => s.id}
        onRowClick={(s) => setEdit(s)}
        columns={[
          {
            header: 'Dịch vụ',
            render: (s) => (
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted">{s.description}</p>
              </div>
            ),
          },
          { header: 'Đơn giá', align: 'right', render: (s) => <span className="tabular font-medium">{formatMoney(s.price)}</span> },
          { header: 'Đơn vị', render: (s) => <span className="text-ink-soft">{s.unit}</span> },
          { header: 'Trạng thái', render: (s) => <Badge label={s.active ? 'Đang cung cấp' : 'Tạm ngưng'} tone={s.active ? 'green' : 'neutral'} /> },
          { header: '', align: 'right', render: () => <Pencil size={16} className="ml-auto text-faint" /> },
        ]}
      />
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (run(() => saveService({ id: edit!.id, name: edit!.name ?? '', description: edit!.description ?? '', price: Number(edit!.price), unit: edit!.unit ?? '', active: !!edit!.active }), 'Đã lưu dịch vụ.'))
                  setEdit(null);
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Tên dịch vụ" required>
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Mô tả">
                <Textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </Field>
            </div>
            <Field label="Đơn giá (đ)" required>
              <Input inputMode="numeric" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value.replace(/\D/g, '')) })} />
            </Field>
            <Field label="Đơn vị" required>
              <Input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} />
            </Field>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#f2a516]" checked={!!edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
              Đang cung cấp cho cư dân
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
