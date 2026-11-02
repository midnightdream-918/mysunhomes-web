import { CalendarCheck, MapPin, Pencil, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge, Button, Card, confirmDialog, Field, IconTile, Input, Modal, PageHeader, Pills, run, SectionTitle, Table, Toolbar } from '@/components/ui';
import { addDays, formatDayShort, formatMoney, toDayKey } from '@/lib/format';
import { bookingStatus } from '@/lib/labels';
import { cancelBooking, saveFacility, useDb, useLookups } from '@/store';
import type { Facility } from '@/types';

export default function FacilitiesPage() {
  const facilities = useDb('facilities');
  const bookings = useDb('bookings');
  const { aptCode } = useLookups();
  const [edit, setEdit] = useState<Facility | null>(null);
  const [range, setRange] = useState<'upcoming' | 'today' | 'past'>('upcoming');
  const [facility, setFacility] = useState('all');
  const today = toDayKey(new Date());

  const usage = useMemo(() => {
    const week = toDayKey(addDays(new Date(), 7));
    const m = new Map<string, number>();
    bookings.filter((b) => b.status === 'BOOKED' && b.date >= today && b.date <= week).forEach((b) => m.set(b.facilityId, (m.get(b.facilityId) ?? 0) + 1));
    return m;
  }, [bookings, today]);

  const rows = bookings
    .filter((b) => (facility === 'all' || b.facilityId === facility) && (range === 'today' ? b.date === today : range === 'upcoming' ? b.date >= today : b.date < today))
    .sort((a, b) => (range === 'past' ? -1 : 1) * (a.date + a.slotStart).localeCompare(b.date + b.slotStart));

  return (
    <>
      <PageHeader title="Tiện ích" description="Sức chứa, giá và lịch đặt tiện ích nội khu. Khung giờ 08:00–17:00." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {facilities.map((f) => (
          <Card key={f.id} className={f.active ? '' : 'opacity-60'}>
            <div className="flex items-start gap-3">
              <IconTile icon={CalendarCheck} tone="green" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{f.name}</p>
                <p className="flex items-center gap-1 text-[13px] text-muted">
                  <MapPin size={13} />
                  {f.location}
                </p>
              </div>
              <button onClick={() => setEdit(f)} className="rounded-full p-2 text-muted hover:bg-bg-deep" aria-label="Sửa">
                <Pencil size={15} />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-1.5 text-ink-soft">
                <Users size={14} />
                {f.capacityPerSlot} chỗ/khung
              </span>
              <span className="font-medium">{f.pricePerBooking ? `${formatMoney(f.pricePerBooking)}/lượt` : 'Miễn phí'}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[13px]">
              <span className="text-muted">7 ngày tới</span>
              {f.active ? <span className="tabular font-medium">{usage.get(f.id) ?? 0} lượt đặt</span> : <Badge label="Tạm đóng" tone="neutral" />}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <SectionTitle>Lịch đặt</SectionTitle>
        <Toolbar>
          <Pills value={range} onChange={setRange} items={[{ value: 'upcoming', label: 'Sắp tới' }, { value: 'today', label: 'Hôm nay' }, { value: 'past', label: 'Đã qua' }]} />
          <Pills value={facility} onChange={setFacility} items={[{ value: 'all', label: 'Mọi tiện ích' }, ...facilities.map((f) => ({ value: f.id, label: f.name.split(' ').slice(0, 2).join(' ') }))]} />
        </Toolbar>
        <Table
          rows={rows}
          rowKey={(b) => b.id}
          empty="Không có lượt đặt"
          columns={[
            { header: 'Ngày', render: (b) => <span className="tabular font-medium">{formatDayShort(b.date)}</span> },
            { header: 'Giờ', render: (b) => <span className="tabular">{b.slotStart}</span> },
            { header: 'Tiện ích', render: (b) => facilities.find((f) => f.id === b.facilityId)?.name },
            { header: 'Căn hộ', render: (b) => <span className="font-medium">{aptCode(b.apartmentId)}</span> },
            { header: 'Số người', align: 'center', render: (b) => <span className="tabular">{b.people}</span> },
            { header: 'Chi phí', align: 'right', render: (b) => <span className="tabular">{b.amount ? `${formatMoney(b.amount)} · ${b.payMode === 'PAY_NOW' ? 'Đã trả' : 'Hóa đơn'}` : 'Miễn phí'}</span> },
            { header: 'Trạng thái', render: (b) => <Badge {...bookingStatus[b.status]} /> },
            {
              header: '',
              align: 'right',
              render: (b) =>
                b.status === 'BOOKED' &&
                b.date >= today && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Hủy lượt đặt?', message: 'Cư dân sẽ nhận thông báo hủy. Lượt trả trước sẽ được hoàn tiền.', destructive: true, confirmText: 'Hủy lượt đặt' }))
                        run(() => cancelBooking(b.id), 'Đã hủy lượt đặt.');
                    }}
                  >
                    Hủy
                  </Button>
                ),
            },
          ]}
        />
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={`Cấu hình ${edit?.name ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Hủy
            </Button>
            <Button onClick={() => edit && run(() => saveFacility(edit.id, edit), 'Đã lưu cấu hình.') && setEdit(null)}>Lưu</Button>
          </>
        }
      >
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sức chứa mỗi khung giờ" required>
              <Input inputMode="numeric" value={edit.capacityPerSlot} onChange={(e) => setEdit({ ...edit, capacityPerSlot: Number(e.target.value.replace(/\D/g, '')) })} />
            </Field>
            <Field label="Giá mỗi lượt (đ)" hint="Nhập 0 nếu miễn phí">
              <Input inputMode="numeric" value={edit.pricePerBooking} onChange={(e) => setEdit({ ...edit, pricePerBooking: Number(e.target.value.replace(/\D/g, '')) })} />
            </Field>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#f2a516]" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
              Mở cho cư dân đặt
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
