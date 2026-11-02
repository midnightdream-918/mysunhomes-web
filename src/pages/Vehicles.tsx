import { Bike, Car, CreditCard, Lock, LockOpen, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import {
  Badge,
  Button,
  confirmDialog,
  Field,
  Input,
  Modal,
  PageHeader,
  Pills,
  promptDialog,
  run,
  SearchInput,
  Select,
  Table,
  Tabs,
  Toolbar,
} from '@/components/ui';
import { formatDate, matches } from '@/lib/format';
import { cardStatus, vehicleStatus, vehicleType } from '@/lib/labels';
import { cancelVehicle, issueCard, reissueCard, setCardStatus, useDb, useLookups } from '@/store';

export default function VehiclesPage() {
  const [tab, setTab] = useState<'vehicles' | 'cards'>('vehicles');
  return (
    <>
      <PageHeader title="Phương tiện & thẻ" description="Xe đã đăng ký, thẻ cư dân và thẻ xe đang lưu hành." />
      <Tabs value={tab} onChange={setTab} items={[{ value: 'vehicles', label: 'Phương tiện' }, { value: 'cards', label: 'Thẻ ra vào' }]} />
      {tab === 'vehicles' ? <VehicleList /> : <CardList />}
    </>
  );
}

function VehicleList() {
  const vehicles = useDb('vehicles');
  const { aptCode } = useLookups();
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('APPROVED');
  const [q, setQ] = useState('');
  const rows = vehicles
    .filter((v) => (type === 'all' || v.vehicleType === type) && (status === 'all' || v.status === status) && matches(q, v.plateNumber, v.ownerName, aptCode(v.apartmentId), v.brand))
    .sort((a, b) => aptCode(a.apartmentId).localeCompare(aptCode(b.apartmentId)));

  return (
    <>
      <Toolbar>
        <Pills value={type} onChange={setType} items={[{ value: 'all', label: 'Tất cả' }, { value: 'CAR', label: 'Ô tô' }, { value: 'MOTORBIKE', label: 'Xe máy' }]} />
        <div className="w-44">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'all', label: 'Mọi trạng thái' }, ...Object.entries(vehicleStatus).map(([k, v]) => ({ value: k, label: v.label }))]} />
        </div>
        <div className="ml-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Biển số, chủ xe, mã căn" />
        </div>
      </Toolbar>
      <Table
        rows={rows}
        rowKey={(v) => v.id}
        columns={[
          { header: 'Biển số', render: (v) => <span className="rounded-md border-[1.5px] border-ink px-1.5 py-0.5 text-xs font-semibold tracking-wide">{v.plateNumber}</span> },
          {
            header: 'Phương tiện',
            render: (v) => (
              <span className="flex items-center gap-2">
                {v.vehicleType === 'CAR' ? <Car size={16} className="text-muted" /> : <Bike size={16} className="text-muted" />}
                {v.brand} {v.model}
              </span>
            ),
          },
          { header: 'Loại', render: (v) => <span className="text-ink-soft">{vehicleType[v.vehicleType]}</span> },
          { header: 'Căn hộ', render: (v) => <span className="font-medium">{aptCode(v.apartmentId)}</span> },
          { header: 'Chủ xe', render: (v) => v.ownerName },
          { header: 'Trạng thái', render: (v) => <Badge {...vehicleStatus[v.status]} /> },
          {
            header: '',
            align: 'right',
            render: (v) =>
              v.status === 'APPROVED' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (await confirmDialog({ title: 'Xác nhận hủy đăng ký xe', message: `Xe ${v.plateNumber} sẽ ngừng tính phí và thẻ xe bị khóa.`, destructive: true, confirmText: 'Hủy đăng ký' }))
                      run(() => cancelVehicle(v.id), 'Đã hủy đăng ký xe.');
                  }}
                >
                  Hủy đăng ký
                </Button>
              ),
          },
        ]}
      />
    </>
  );
}

function CardList() {
  const cards = useDb('cards');
  const apartments = useDb('apartments');
  const { aptCode } = useLookups();
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({ apartmentId: '', holderName: '', cardNumber: '' });

  const rows = cards
    .filter((c) => (type === 'all' || c.cardType === type) && matches(q, c.cardNumber, c.holderName, aptCode(c.apartmentId)))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  return (
    <>
      <Toolbar>
        <Pills value={type} onChange={setType} items={[{ value: 'all', label: 'Tất cả' }, { value: 'RESIDENT', label: 'Thẻ cư dân' }, { value: 'VEHICLE', label: 'Thẻ xe' }]} />
        <div className="ml-auto flex gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Số thẻ, chủ thẻ, mã căn" />
          <Button icon={Plus} onClick={() => setIssuing(true)}>
            Cấp thẻ cư dân
          </Button>
        </div>
      </Toolbar>
      <Table
        rows={rows}
        rowKey={(c) => c.id}
        columns={[
          {
            header: 'Số thẻ',
            render: (c) => (
              <span className="flex items-center gap-2 font-medium">
                <CreditCard size={16} className="text-muted" />
                <span className="tabular">{c.cardNumber}</span>
              </span>
            ),
          },
          { header: 'Loại', render: (c) => <span className="text-ink-soft">{c.cardType === 'RESIDENT' ? 'Cư dân' : 'Xe'}</span> },
          { header: 'Chủ thẻ', render: (c) => c.holderName },
          { header: 'Căn hộ', render: (c) => <span className="font-medium">{aptCode(c.apartmentId)}</span> },
          { header: 'Ngày cấp', render: (c) => <span className="tabular text-ink-soft">{formatDate(c.issuedAt)}</span> },
          {
            header: 'Trạng thái',
            render: (c) => (
              <span className="flex flex-col items-start gap-0.5">
                <Badge {...cardStatus[c.status]} />
                {c.note && <span className="text-xs text-muted">{c.note}</span>}
              </span>
            ),
          },
          {
            header: '',
            align: 'right',
            render: (c) => (
              <span className="flex justify-end gap-1">
                {c.status === 'ACTIVE' ? (
                  <Button size="sm" variant="ghost" icon={Lock} onClick={() => run(() => setCardStatus(c.id, 'LOCKED', 'Khóa bởi BQL'), `Đã khóa thẻ ${c.cardNumber}.`)}>
                    Khóa
                  </Button>
                ) : (
                  !c.note?.startsWith('Cấp lại') && (
                    <Button size="sm" variant="ghost" icon={LockOpen} onClick={() => run(() => setCardStatus(c.id, 'ACTIVE'), `Đã mở khóa thẻ ${c.cardNumber}.`)}>
                      Mở khóa
                    </Button>
                  )
                )}
                {!c.note?.startsWith('Cấp lại') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={RefreshCw}
                    onClick={async () => {
                      const n = await promptDialog({ title: `Cấp lại thẻ ${c.cardNumber}`, message: 'Thẻ cũ sẽ bị khóa vĩnh viễn.', confirmText: 'Cấp lại', input: { label: 'Số thẻ mới', required: true } });
                      if (n) run(() => reissueCard(c.id, n), 'Đã cấp lại thẻ.');
                    }}
                  >
                    Cấp lại
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />

      <Modal
        open={issuing}
        onClose={() => setIssuing(false)}
        title="Cấp thẻ cư dân"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIssuing(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (run(() => issueCard({ ...form, cardType: 'RESIDENT' }), 'Đã cấp thẻ.')) {
                  setForm({ apartmentId: '', holderName: '', cardNumber: '' });
                  setIssuing(false);
                }
              }}
            >
              Cấp thẻ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Căn hộ" required>
            <Select
              value={form.apartmentId}
              onChange={(e) => setForm({ ...form, apartmentId: e.target.value })}
              options={[{ value: '', label: 'Chọn căn hộ' }, ...apartments.filter((a) => a.status !== 'VACANT').sort((a, b) => a.code.localeCompare(b.code)).map((a) => ({ value: a.id, label: a.code }))]}
            />
          </Field>
          <Field label="Chủ thẻ" required>
            <Input value={form.holderName} onChange={(e) => setForm({ ...form, holderName: e.target.value })} />
          </Field>
          <Field label="Số thẻ" required hint="In trên thẻ vật lý">
            <Input value={form.cardNumber} onChange={(e) => setForm({ ...form, cardNumber: e.target.value })} placeholder="RC-00013000" />
          </Field>
        </div>
      </Modal>
    </>
  );
}
