import { Lock, LockOpen, Plus } from 'lucide-react';
import { useState } from 'react';

import { Avatar, Badge, Button, confirmDialog, Field, Input, Modal, PageHeader, run, Select, Table } from '@/components/ui';
import { formatDate, maskPhone } from '@/lib/format';
import { staffRole } from '@/lib/labels';
import { createStaff, setStaffStatus, useDb, useMe } from '@/store';
import type { StaffRole } from '@/types';

export default function StaffPage() {
  const staff = useDb('staff');
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', role: 'SECURITY' as StaffRole });

  return (
    <>
      <PageHeader
        title="Nhân viên"
        description="Tài khoản đăng nhập web của Ban quản lý. Mật khẩu mặc định khi tạo mới là 123456."
        actions={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            Tạo tài khoản
          </Button>
        }
      />
      <Table
        rows={staff}
        rowKey={(s) => s.id}
        columns={[
          {
            header: 'Nhân viên',
            render: (s) => (
              <span className="flex items-center gap-3">
                <Avatar name={s.fullName} size={34} />
                <span>
                  <span className="block font-medium">{s.fullName}</span>
                  <span className="block text-xs text-muted">{s.email}</span>
                </span>
              </span>
            ),
          },
          { header: 'Vai trò', render: (s) => staffRole[s.role] },
          { header: 'Điện thoại', render: (s) => <span className="tabular">{maskPhone(s.phone)}</span> },
          { header: 'Ngày tạo', render: (s) => <span className="tabular text-ink-soft">{formatDate(s.createdAt)}</span> },
          { header: 'Trạng thái', render: (s) => <Badge label={s.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'} tone={s.status === 'ACTIVE' ? 'green' : 'neutral'} /> },
          {
            header: '',
            align: 'right',
            render: (s) =>
              s.id !== me?.id &&
              (s.status === 'ACTIVE' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Lock}
                  onClick={async () => {
                    if (await confirmDialog({ title: `Khóa tài khoản ${s.fullName}?`, message: 'Nhân viên sẽ không đăng nhập được cho đến khi được mở khóa.', destructive: true, confirmText: 'Khóa' }))
                      run(() => setStaffStatus(s.id, 'LOCKED'), 'Đã khóa tài khoản.');
                  }}
                >
                  Khóa
                </Button>
              ) : (
                <Button size="sm" variant="ghost" icon={LockOpen} onClick={() => run(() => setStaffStatus(s.id, 'ACTIVE'), 'Đã mở khóa tài khoản.')}>
                  Mở khóa
                </Button>
              )),
          },
        ]}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo tài khoản nhân viên"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (run(() => createStaff(form), `Đã tạo tài khoản cho ${form.fullName}.`)) {
                  setForm({ fullName: '', phone: '', email: '', role: 'SECURITY' });
                  setOpen(false);
                }
              }}
            >
              Tạo tài khoản
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Họ và tên" required>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoFocus />
            </Field>
          </div>
          <Field label="Số điện thoại" required hint="Dùng để đăng nhập">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={10} inputMode="tel" />
          </Field>
          <Field label="Vai trò" required>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })} options={Object.entries(staffRole).map(([k, v]) => ({ value: k, label: v }))} />
          </Field>
          <div className="col-span-2">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
