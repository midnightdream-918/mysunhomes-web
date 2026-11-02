import { CheckCheck, Lock, MapPin, Play, RotateCcw, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  Field,
  Input,
  Modal,
  PageHeader,
  Pills,
  promptDialog,
  run,
  SearchInput,
  SectionTitle,
  Select,
  Table,
  Timeline,
  Toolbar,
} from '@/components/ui';
import { formatDateTime, formatRelative, matches } from '@/lib/format';
import { complaintCategory, complaintStatus } from '@/lib/labels';
import { advanceComplaint, assignComplaint, useDb, useLookups, useMe } from '@/store';
import type { Complaint, ComplaintStatus } from '@/types';

const GROUPS: Record<string, ComplaintStatus[]> = {
  todo: ['NEW', 'REOPENED'],
  doing: ['ASSIGNED', 'IN_PROGRESS'],
  resolved: ['RESOLVED'],
  closed: ['CLOSED'],
};

export default function ComplaintsPage() {
  const me = useMe()!;
  const isTech = me.role === 'TECHNICIAN';
  const complaints = useDb('complaints');
  const { aptCode, staffName } = useLookups();
  const [group, setGroup] = useState(isTech ? 'doing' : 'todo');
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const scoped = useMemo(() => (isTech ? complaints.filter((c) => c.assigneeId === me.id) : complaints), [complaints, isTech, me.id]);
  const count = (g: string) => scoped.filter((c) => (g === 'all' ? true : g === 'doing' && isTech ? [...GROUPS.doing, 'REOPENED'].includes(c.status) : GROUPS[g].includes(c.status))).length;
  const rows = scoped
    .filter((c) => (group === 'all' ? true : group === 'doing' && isTech ? [...GROUPS.doing, 'REOPENED'].includes(c.status) : GROUPS[group].includes(c.status)))
    .filter((c) => (category === 'all' || c.category === category) && matches(q, c.title, c.reporterName, aptCode(c.apartmentId)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = complaints.find((c) => c.id === openId);

  const groupItems = isTech
    ? [
        { value: 'doing', label: `Việc của tôi (${count('doing')})` },
        { value: 'resolved', label: 'Đã xử lý' },
        { value: 'closed', label: 'Đã đóng' },
      ]
    : [
        { value: 'todo', label: `Cần phân công (${count('todo')})` },
        { value: 'doing', label: `Đang xử lý (${count('doing')})` },
        { value: 'resolved', label: 'Chờ cư dân xác nhận' },
        { value: 'closed', label: 'Đã đóng' },
        { value: 'all', label: 'Tất cả' },
      ];

  return (
    <>
      <PageHeader title="Phản ánh" description={isTech ? 'Các phản ánh được giao cho bạn.' : 'Phân công và theo dõi xử lý phản ánh của cư dân.'} />
      <Toolbar>
        <Pills value={group} onChange={setGroup} items={groupItems} />
        <div className="w-36">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: 'all', label: 'Mọi loại' }, ...Object.entries(complaintCategory).map(([k, v]) => ({ value: k, label: v }))]} />
        </div>
        <div className="ml-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Tiêu đề, người gửi, mã căn" />
        </div>
      </Toolbar>
      <Table
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => setOpenId(c.id)}
        empty="Không có phản ánh"
        columns={[
          {
            header: 'Phản ánh',
            render: (c) => (
              <div className="max-w-md">
                <p className="font-medium">{c.title}</p>
                <p className="truncate text-xs text-muted">{c.location}</p>
              </div>
            ),
          },
          { header: 'Loại', render: (c) => <span className="text-ink-soft">{complaintCategory[c.category]}</span> },
          { header: 'Căn · Người gửi', render: (c) => <span>{aptCode(c.apartmentId)} · {c.reporterName}</span> },
          { header: 'Người xử lý', render: (c) => <span className="text-ink-soft">{staffName(c.assigneeId) ?? c.external ?? '—'}</span> },
          { header: 'Gửi lúc', render: (c) => <span className="text-ink-soft">{formatRelative(c.createdAt)}</span> },
          { header: 'Trạng thái', render: (c) => <Badge {...complaintStatus[c.status]} /> },
        ]}
      />
      {open && <ComplaintDrawer complaint={open} onClose={() => setOpenId(null)} isTech={isTech} />}
    </>
  );
}

function ComplaintDrawer({ complaint: c, onClose, isTech }: { complaint: Complaint; onClose: () => void; isTech: boolean }) {
  const staff = useDb('staff');
  const { aptCode, staffName } = useLookups();
  const techs = staff.filter((s) => s.role === 'TECHNICIAN' && s.status === 'ACTIVE');
  const [assigning, setAssigning] = useState(false);
  const [target, setTarget] = useState(c.category === 'TECHNICAL' ? techs[0]?.id ?? '' : 'external');
  const [external, setExternal] = useState(c.category === 'CLEANING' ? 'Đội vệ sinh' : c.category === 'SECURITY' ? 'Đội bảo vệ' : '');

  const resolve = async () => {
    const note = await promptDialog({ title: 'Hoàn tất xử lý', message: 'Cư dân sẽ được thông báo để kiểm tra và đóng phản ánh.', confirmText: 'Hoàn tất', input: { label: 'Kết quả xử lý', required: true, placeholder: 'Đã thay bóng đèn, kiểm tra lại cảm biến...' } });
    if (note) run(() => advanceComplaint(c.id, 'RESOLVED', note), 'Đã cập nhật kết quả xử lý.');
  };

  const canAssign = !isTech && (c.status === 'NEW' || c.status === 'REOPENED' || c.status === 'ASSIGNED');
  const canStart = c.status === 'ASSIGNED' || (c.status === 'REOPENED' && (c.assigneeId || c.external));

  return (
    <Drawer
      open
      onClose={onClose}
      title={c.title}
      subtitle={`${complaintCategory[c.category]} · Căn ${aptCode(c.apartmentId)} · ${c.reporterName}`}
      footer={
        <>
          {canAssign && (
            <Button variant={c.status === 'NEW' ? 'primary' : 'secondary'} icon={UserPlus} onClick={() => setAssigning(true)}>
              {c.status === 'NEW' ? 'Phân công' : 'Giao lại'}
            </Button>
          )}
          {canStart && (
            <Button icon={Play} onClick={() => run(() => advanceComplaint(c.id, 'IN_PROGRESS'), 'Đã nhận việc.')}>
              Nhận việc
            </Button>
          )}
          {c.status === 'IN_PROGRESS' && (
            <Button icon={CheckCheck} onClick={resolve}>
              Hoàn tất xử lý
            </Button>
          )}
          {c.status === 'RESOLVED' && (
            <>
              <Button variant="secondary" icon={RotateCcw} onClick={() => run(() => advanceComplaint(c.id, 'REOPENED', 'Mở lại theo phản hồi của cư dân'), 'Đã mở lại phản ánh.')}>
                Mở lại
              </Button>
              <Button icon={Lock} onClick={() => run(() => advanceComplaint(c.id, 'CLOSED', 'Đóng theo xác nhận của cư dân'), 'Đã đóng phản ánh.')}>
                Đóng
              </Button>
            </>
          )}
        </>
      }
    >
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Badge {...complaintStatus[c.status]} />
          <span className="text-xs text-muted">{formatDateTime(c.createdAt)}</span>
        </div>
        <p>{c.content}</p>
        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted">
          <MapPin size={14} />
          {c.location}
        </p>
        <p className="mt-1 text-[13px] text-muted">Người xử lý: <span className="text-ink">{staffName(c.assigneeId) ?? c.external ?? 'Chưa phân công'}</span></p>
      </Card>
      {c.resultNote && (
        <div className="rounded-2xl bg-sage-soft p-4">
          <p className="text-[13px] font-medium text-sage">Kết quả xử lý</p>
          <p className="mt-0.5">{c.resultNote}</p>
        </div>
      )}
      <div>
        <SectionTitle>Lịch sử trạng thái</SectionTitle>
        <Card>
          <Timeline steps={c.history} meta={complaintStatus} />
        </Card>
      </div>

      <Modal
        open={assigning}
        onClose={() => setAssigning(false)}
        title="Phân công xử lý"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssigning(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (run(() => assignComplaint(c.id, target === 'external' ? { external } : { staffId: target }), 'Đã phân công và thông báo cho người được giao.')) setAssigning(false);
              }}
            >
              Phân công
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Giao cho" hint="Phản ánh kỹ thuật giao cho kỹ thuật viên. Loại khác giao bộ phận bên ngoài, Quản lý tự cập nhật.">
            <Select value={target} onChange={(e) => setTarget(e.target.value)} options={[...techs.map((t) => ({ value: t.id, label: `${t.fullName} · Kỹ thuật viên` })), { value: 'external', label: 'Bộ phận khác / bên ngoài' }]} />
          </Field>
          {target === 'external' && (
            <Field label="Tên bộ phận" required>
              <Input value={external} onChange={(e) => setExternal(e.target.value)} placeholder="Đội vệ sinh, Đội bảo vệ..." />
            </Field>
          )}
        </div>
      </Modal>
    </Drawer>
  );
}
