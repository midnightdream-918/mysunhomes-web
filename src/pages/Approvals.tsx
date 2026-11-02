import { Bike, Car, Check, UserCheck, UserPlus, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { Badge, Button, Card, EmptyState, Field, IconTile, Input, Modal, PageHeader, Pills, promptDialog, run, Tabs } from '@/components/ui';
import { ageFrom, formatDate, formatRelative, maskPhone } from '@/lib/format';
import { accountStatus, requestStatus, vehicleStatus, vehicleType } from '@/lib/labels';
import {
  approveAccount,
  approveMemberRequest,
  approveVehicle,
  rejectAccount,
  rejectMemberRequest,
  rejectVehicle,
  useDb,
  useLookups,
} from '@/store';
import type { Vehicle } from '@/types';

type Tab = 'accounts' | 'members' | 'vehicles';

function Row({ icon, title, meta, children, actions }: { icon: ReactNode; title: ReactNode; meta: ReactNode; children?: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-0">
      {icon}
      <div className="min-w-[220px] flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-[13px] text-muted">{meta}</p>
        {children}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

async function askReason(title: string) {
  return promptDialog({ title, confirmText: 'Từ chối', destructive: true, input: { label: 'Lý do', required: true, placeholder: 'Lý do sẽ được gửi tới cư dân' } });
}

export default function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) ?? 'accounts';
  const [show, setShow] = useState<'pending' | 'done'>('pending');
  const [vehicleToApprove, setVehicleToApprove] = useState<Vehicle | null>(null);
  const [cardNumber, setCardNumber] = useState('');

  const accounts = useDb('residentAccounts');
  const members = useDb('memberRequests');
  const vehicles = useDb('vehicles');
  const { aptCode, owner } = useLookups();

  const pending = {
    accounts: accounts.filter((a) => a.status === 'PENDING'),
    members: members.filter((m) => m.status === 'PENDING'),
    vehicles: vehicles.filter((v) => v.status === 'PENDING'),
  };
  const done = useMemo(
    () => ({
      accounts: accounts.filter((a) => a.status === 'REJECTED' || (a.status === 'ACTIVE' && a.createdAt > '2026')),
      members: members.filter((m) => m.status !== 'PENDING'),
      vehicles: vehicles.filter((v) => v.status === 'REJECTED' || (v.status === 'APPROVED' && v.createdAt > '2026')),
    }),
    [accounts, members, vehicles],
  );
  const list = show === 'pending' ? pending : done;

  const actions = (onApprove: () => void, onReject: () => void, isPending: boolean, status: ReactNode) =>
    isPending ? (
      <>
        <Button size="sm" variant="secondary" icon={X} onClick={onReject}>
          Từ chối
        </Button>
        <Button size="sm" icon={Check} onClick={onApprove}>
          Duyệt
        </Button>
      </>
    ) : (
      status
    );

  return (
    <>
      <PageHeader title="Phê duyệt" description="Đối chiếu thông tin cư dân gửi lên trước khi duyệt." />
      <Tabs
        value={tab}
        onChange={(v) => setParams({ tab: v })}
        items={[
          { value: 'accounts', label: 'Tài khoản cư dân', count: pending.accounts.length },
          { value: 'members', label: 'Thêm thành viên', count: pending.members.length },
          { value: 'vehicles', label: 'Đăng ký phương tiện', count: pending.vehicles.length },
        ]}
      />
      <div className="mb-4">
        <Pills value={show} onChange={setShow} items={[{ value: 'pending', label: 'Chờ duyệt' }, { value: 'done', label: 'Đã xử lý' }]} />
      </div>

      <Card padded={false}>
        {tab === 'accounts' &&
          (list.accounts.length === 0 ? (
            <EmptyState icon={UserCheck} title="Không có tài khoản nào" />
          ) : (
            list.accounts.map((a) => (
              <Row
                key={a.id}
                icon={<IconTile icon={UserCheck} />}
                title={a.fullName}
                meta={`${maskPhone(a.phone)} · CCCD ${a.citizenId} · Căn ${a.apartmentCode} · ${formatRelative(a.createdAt)}`}
                actions={actions(
                  () => run(() => approveAccount(a.id), `Đã duyệt tài khoản ${a.fullName}.`),
                  async () => {
                    const r = await askReason(`Từ chối tài khoản ${a.fullName}`);
                    if (r) run(() => rejectAccount(a.id, r), 'Đã từ chối tài khoản.');
                  },
                  a.status === 'PENDING',
                  <Badge {...accountStatus[a.status]} />,
                )}
              >
                {a.rejectReason && <p className="mt-1 text-[13px] text-rose">Lý do: {a.rejectReason}</p>}
              </Row>
            ))
          ))}

        {tab === 'members' &&
          (list.members.length === 0 ? (
            <EmptyState icon={UserPlus} title="Không có yêu cầu nào" />
          ) : (
            list.members.map((m) => (
              <Row
                key={m.id}
                icon={<IconTile icon={UserPlus} tone="blue" />}
                title={m.fullName}
                meta={`${m.relationToOwner} của ${owner(m.apartmentId)?.fullName ?? 'chủ hộ'} · Căn ${aptCode(m.apartmentId)} · ${formatDate(m.dateOfBirth)} (${ageFrom(m.dateOfBirth)} tuổi)${m.citizenId ? ` · CCCD ${m.citizenId}` : ''}`}
                actions={actions(
                  () => run(() => approveMemberRequest(m.id), `Đã thêm ${m.fullName} vào căn hộ.`),
                  async () => {
                    const r = await askReason(`Từ chối thêm ${m.fullName}`);
                    if (r) run(() => rejectMemberRequest(m.id, r), 'Đã từ chối yêu cầu.');
                  },
                  m.status === 'PENDING',
                  <Badge {...requestStatus[m.status]} />,
                )}
              />
            ))
          ))}

        {tab === 'vehicles' &&
          (list.vehicles.length === 0 ? (
            <EmptyState icon={Car} title="Không có đăng ký nào" />
          ) : (
            list.vehicles.map((v) => (
              <Row
                key={v.id}
                icon={<IconTile icon={v.vehicleType === 'CAR' ? Car : Bike} tone="plum" />}
                title={
                  <span className="flex items-center gap-2">
                    {v.brand} {v.model}
                    <span className="rounded-md border-[1.5px] border-ink px-1.5 text-xs font-semibold tracking-wide">{v.plateNumber}</span>
                  </span>
                }
                meta={`${vehicleType[v.vehicleType]} · Căn ${aptCode(v.apartmentId)} · ${v.ownerName} · ${formatRelative(v.createdAt)}`}
                actions={actions(
                  () => {
                    setCardNumber('');
                    setVehicleToApprove(v);
                  },
                  async () => {
                    const r = await askReason(`Từ chối xe ${v.plateNumber}`);
                    if (r) run(() => rejectVehicle(v.id, r), 'Đã từ chối đăng ký.');
                  },
                  v.status === 'PENDING',
                  <Badge {...vehicleStatus[v.status]} />,
                )}
              />
            ))
          ))}
      </Card>

      <Modal
        open={!!vehicleToApprove}
        onClose={() => setVehicleToApprove(null)}
        title="Duyệt đăng ký phương tiện"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVehicleToApprove(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (run(() => approveVehicle(vehicleToApprove!.id, cardNumber), cardNumber ? 'Đã duyệt và cấp thẻ xe.' : 'Đã duyệt, chưa cấp thẻ.')) setVehicleToApprove(null);
              }}
            >
              {cardNumber.trim() ? 'Duyệt và cấp thẻ' : 'Duyệt'}
            </Button>
          </>
        }
      >
        {vehicleToApprove && (
          <div className="space-y-4">
            <p className="text-ink-soft">
              {vehicleToApprove.brand} {vehicleToApprove.model} · {vehicleToApprove.plateNumber} · căn {aptCode(vehicleToApprove.apartmentId)}. Xe được tính phí gửi
              xe từ kỳ hóa đơn kế tiếp.
            </p>
            <Field label="Số thẻ xe" hint="In trên thẻ vật lý. Để trống nếu cấp thẻ sau.">
              <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="VC-00012999" autoFocus />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
