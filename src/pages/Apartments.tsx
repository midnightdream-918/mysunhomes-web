import { Crown, LogOut, Plus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  Avatar,
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
  SectionTitle,
  Select,
  Table,
  Tabs,
  Toolbar,
} from '@/components/ui';
import { ageFrom, formatDate, formatMoney, maskPhone, matches } from '@/lib/format';
import { apartmentStatus, invoiceStatus } from '@/lib/labels';
import { addResident, changeOwner, moveOut, setApartmentStatus, useDb, useLookups, type ResidentInput } from '@/store';
import type { Apartment, ApartmentStatus } from '@/types';

export default function ApartmentsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'residents' ? 'residents' : 'apartments';
  return (
    <>
      <PageHeader title="Căn hộ & cư dân" description="Hồ sơ căn hộ, thành viên và lịch sử cư trú." />
      <Tabs value={tab} onChange={(v) => setParams(v === 'apartments' ? {} : { tab: v })} items={[{ value: 'apartments', label: 'Căn hộ' }, { value: 'residents', label: 'Cư dân' }]} />
      {tab === 'apartments' ? <ApartmentList /> : <ResidentList />}
    </>
  );
}

function ApartmentList() {
  const apartments = useDb('apartments');
  const buildings = useDb('buildings');
  const residencies = useDb('residencies');
  const { building, owner } = useLookups();
  const [b, setB] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    residencies.filter((r) => r.active).forEach((r) => m.set(r.apartmentId, (m.get(r.apartmentId) ?? 0) + 1));
    return m;
  }, [residencies]);

  const rows = apartments
    .filter((a) => (b === 'all' || a.buildingId === b) && (status === 'all' || a.status === status) && matches(q, a.code, owner(a.id)?.fullName))
    .sort((x, y) => x.code.localeCompare(y.code));

  return (
    <>
      <Toolbar>
        <Pills value={b} onChange={setB} items={[{ value: 'all', label: 'Tất cả tòa' }, ...buildings.map((x) => ({ value: x.id, label: x.name }))]} />
        <div className="w-44">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'all', label: 'Mọi trạng thái' }, ...Object.entries(apartmentStatus).map(([k, v]) => ({ value: k, label: v.label }))]} />
        </div>
        <div className="ml-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Mã căn hoặc tên chủ hộ" />
        </div>
      </Toolbar>
      <Table
        rows={rows}
        rowKey={(a) => a.id}
        onRowClick={(a) => setOpenId(a.id)}
        columns={[
          { header: 'Căn hộ', render: (a) => <span className="font-semibold">{a.code}</span> },
          { header: 'Tòa · Tầng', render: (a) => `${building(a.buildingId)?.name} · ${a.floor}` },
          { header: 'Loại', render: (a) => <span className="text-ink-soft">{a.type}</span> },
          { header: 'Diện tích', align: 'right', render: (a) => <span className="tabular">{a.area} m²</span> },
          { header: 'Chủ hộ', render: (a) => owner(a.id)?.fullName ?? <span className="text-faint">—</span> },
          { header: 'Số người', align: 'center', render: (a) => <span className="tabular">{counts.get(a.id) ?? 0}</span> },
          { header: 'Trạng thái', render: (a) => <Badge {...apartmentStatus[a.status]} /> },
        ]}
      />
      {openId && <ApartmentDrawer apartment={apartments.find((a) => a.id === openId)!} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ApartmentDrawer({ apartment: a, onClose }: { apartment: Apartment; onClose: () => void }) {
  const residencies = useDb('residencies');
  const residents = useDb('residents');
  const vehicles = useDb('vehicles');
  const invoices = useDb('invoices');
  const { building } = useLookups();
  const [adding, setAdding] = useState(false);

  const members = residencies
    .filter((r) => r.apartmentId === a.id && r.active)
    .map((r) => ({ ...r, resident: residents.find((x) => x.id === r.residentId)! }))
    .sort((x) => (x.role === 'OWNER' ? -1 : 1));
  const aptVehicles = vehicles.filter((v) => v.apartmentId === a.id && v.status === 'APPROVED');
  const debt = invoices.filter((i) => i.apartmentId === a.id && (i.status === 'UNPAID' || i.status === 'OVERDUE'));

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Căn hộ ${a.code}`}
      subtitle={`${building(a.buildingId)?.name} · Tầng ${a.floor} · ${a.type}`}
      footer={
        <Button icon={UserPlus} onClick={() => setAdding(true)}>
          Thêm cư dân
        </Button>
      }
    >
      <Card>
        <KeyValue label="Diện tích">{a.area} m²</KeyValue>
        <KeyValue label="Phòng ngủ">{a.bedrooms}</KeyValue>
        <KeyValue label="Trạng thái">
          <div className="w-36">
            <Select
              value={a.status}
              onChange={(e) => run(() => setApartmentStatus(a.id, e.target.value as ApartmentStatus), 'Đã cập nhật trạng thái căn hộ.')}
              options={Object.entries(apartmentStatus).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>
        </KeyValue>
        <KeyValue label="Phương tiện">{aptVehicles.length ? aptVehicles.map((v) => v.plateNumber).join(', ') : '—'}</KeyValue>
        <KeyValue label="Công nợ">
          {debt.length ? <span className="text-terracotta">{formatMoney(debt.reduce((s, i) => s + i.totalAmount, 0))}</span> : 'Không có'}
        </KeyValue>
      </Card>

      <div>
        <SectionTitle>Thành viên ({members.length})</SectionTitle>
        <Card padded={false}>
          {members.length === 0 && <p className="p-5 text-muted">Căn hộ chưa có cư dân.</p>}
          {members.map((m) => (
            <div key={m.id} className="group flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <Avatar name={m.resident.fullName} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {m.resident.fullName}
                  {m.role === 'OWNER' && <Badge label="Chủ hộ" tone="amber" dot={false} />}
                </p>
                <p className="text-xs text-muted">
                  {m.relationToOwner} · {ageFrom(m.resident.dateOfBirth)} tuổi{m.resident.phone ? ` · ${maskPhone(m.resident.phone)}` : ''}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {m.role !== 'OWNER' && m.resident.citizenId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Crown}
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Đổi chủ hộ', message: `Đặt ${m.resident.fullName} làm chủ hộ căn ${a.code}?` }))
                        run(() => changeOwner(a.id, m.id), 'Đã đổi chủ hộ.');
                    }}
                  >
                    Làm chủ hộ
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={LogOut}
                  onClick={async () => {
                    if (await confirmDialog({ title: 'Cập nhật chuyển đi', message: `${m.resident.fullName} sẽ được ghi nhận đã chuyển đi khỏi căn ${a.code}.`, destructive: true, confirmText: 'Chuyển đi' }))
                      run(() => moveOut(m.id), 'Đã cập nhật cư dân chuyển đi.');
                  }}
                >
                  Chuyển đi
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div>
        <SectionTitle>Hóa đơn gần đây</SectionTitle>
        <Card padded={false}>
          {invoices
            .filter((i) => i.apartmentId === a.id)
            .sort((x, y) => y.periodId.localeCompare(x.periodId))
            .slice(0, 4)
            .map((i) => (
              <div key={i.id} className="flex items-center justify-between border-b border-line px-4 py-2.5 last:border-0">
                <span className="text-ink-soft">Kỳ {i.periodId.split('-').reverse().join('/')}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular font-medium">{formatMoney(i.totalAmount)}</span>
                  <Badge {...invoiceStatus[i.status]} />
                </span>
              </div>
            ))}
        </Card>
      </div>

      <AddResidentModal open={adding} onClose={() => setAdding(false)} apartmentId={a.id} hasOwner={members.some((m) => m.role === 'OWNER')} />
    </Drawer>
  );
}

const RELATIONS = ['Vợ', 'Chồng', 'Con', 'Bố', 'Mẹ', 'Anh/Chị/Em', 'Người thuê', 'Khác'];

function AddResidentModal({ open, onClose, apartmentId, hasOwner }: { open: boolean; onClose: () => void; apartmentId: string; hasOwner: boolean }) {
  const blank = (): ResidentInput => ({ apartmentId, fullName: '', dateOfBirth: '', gender: 'MALE', citizenId: '', phone: '', email: '', relationToOwner: hasOwner ? 'Con' : 'Chủ hộ', isOwner: !hasOwner });
  const [f, setF] = useState<ResidentInput>(blank);
  const upd = (patch: Partial<ResidentInput>) => setF((x) => ({ ...x, ...patch }));
  const needsId = f.dateOfBirth ? ageFrom(f.dateOfBirth) >= 14 : true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm cư dân"
      width={600}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              if (run(() => addResident(f), `Đã thêm ${f.fullName}.`)) {
                setF(blank());
                onClose();
              }
            }}
          >
            Lưu
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Họ và tên" required>
            <Input value={f.fullName} onChange={(e) => upd({ fullName: e.target.value })} autoFocus />
          </Field>
        </div>
        <Field label="Ngày sinh" required>
          <Input type="date" value={f.dateOfBirth} onChange={(e) => upd({ dateOfBirth: e.target.value })} />
        </Field>
        <Field label="Giới tính">
          <Select value={f.gender} onChange={(e) => upd({ gender: e.target.value as 'MALE' | 'FEMALE' })} options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} />
        </Field>
        <Field label="Số CCCD" required={needsId} hint={needsId ? 'Bắt buộc từ 14 tuổi' : 'Không bắt buộc dưới 14 tuổi'}>
          <Input value={f.citizenId} onChange={(e) => upd({ citizenId: e.target.value })} maxLength={12} inputMode="numeric" />
        </Field>
        <Field label="Số điện thoại">
          <Input value={f.phone} onChange={(e) => upd({ phone: e.target.value })} maxLength={10} inputMode="tel" />
        </Field>
        <div className="col-span-2">
          <Field label="Email">
            <Input type="email" value={f.email} onChange={(e) => upd({ email: e.target.value })} />
          </Field>
        </div>
        <Field label="Vai trò">
          <Select
            value={f.isOwner ? 'owner' : 'member'}
            onChange={(e) => upd({ isOwner: e.target.value === 'owner', relationToOwner: e.target.value === 'owner' ? 'Chủ hộ' : 'Con' })}
            options={[
              { value: 'member', label: 'Thành viên' },
              { value: 'owner', label: hasOwner ? 'Chủ hộ (căn đã có chủ hộ)' : 'Chủ hộ' },
            ]}
          />
        </Field>
        {!f.isOwner && (
          <Field label="Quan hệ với chủ hộ" required>
            <Select value={f.relationToOwner} onChange={(e) => upd({ relationToOwner: e.target.value })} options={RELATIONS.map((r) => ({ value: r, label: r }))} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function ResidentList() {
  const residents = useDb('residents');
  const residencies = useDb('residencies');
  const { aptCode } = useLookups();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'LIVING' | 'MOVED_OUT'>('LIVING');

  const rows = useMemo(
    () =>
      residents
        .filter((r) => r.status === status)
        .map((r) => ({ r, rs: residencies.filter((x) => x.residentId === r.id).sort((a, b) => Number(b.active) - Number(a.active))[0] }))
        .filter(({ r, rs }) => matches(q, r.fullName, r.phone, r.citizenId, aptCode(rs?.apartmentId)))
        .sort((a, b) => aptCode(a.rs?.apartmentId).localeCompare(aptCode(b.rs?.apartmentId))),
    [residents, residencies, q, status, aptCode],
  );

  return (
    <>
      <Toolbar>
        <Pills value={status} onChange={setStatus} items={[{ value: 'LIVING', label: 'Đang ở' }, { value: 'MOVED_OUT', label: 'Đã chuyển đi' }]} />
        <div className="ml-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Tên, SĐT, CCCD, mã căn" />
        </div>
      </Toolbar>
      <Table
        rows={rows}
        rowKey={({ r }) => r.id}
        columns={[
          {
            header: 'Cư dân',
            render: ({ r }) => (
              <span className="flex items-center gap-3">
                <Avatar name={r.fullName} size={32} />
                <span className="font-medium">{r.fullName}</span>
              </span>
            ),
          },
          { header: 'Căn hộ', render: ({ rs }) => <span className="font-medium">{aptCode(rs?.apartmentId)}</span> },
          { header: 'Quan hệ', render: ({ rs }) => (rs?.role === 'OWNER' ? <Badge label="Chủ hộ" tone="amber" dot={false} /> : <span className="text-ink-soft">{rs?.relationToOwner}</span>) },
          { header: 'Ngày sinh', render: ({ r }) => <span className="tabular">{formatDate(r.dateOfBirth)}</span> },
          { header: 'Điện thoại', render: ({ r }) => <span className="tabular">{r.phone ? maskPhone(r.phone) : '—'}</span> },
          { header: 'CCCD', render: ({ r }) => <span className="tabular text-ink-soft">{r.citizenId ?? '—'}</span> },
          { header: 'Từ ngày', render: ({ rs }) => <span className="tabular text-ink-soft">{rs ? formatDate(rs.toDate ?? rs.fromDate) : '—'}</span> },
        ]}
      />
    </>
  );
}
