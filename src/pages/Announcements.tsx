import { Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, Card, confirmDialog, EmptyState, Field, IconButton, Input, Modal, PageHeader, Pills, run, Select, Textarea } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { announcementCategory, type Tone } from '@/lib/labels';
import { deleteAnnouncement, saveAnnouncement, useDb } from '@/store';
import type { Announcement, AnnouncementCategory } from '@/types';

const CATEGORY_TONE: Record<AnnouncementCategory, Tone> = { EVENT: 'plum', NOTICE: 'blue', PROMOTION: 'terracotta', MAINTENANCE: 'green' };

type Draft = Omit<Announcement, 'id' | 'publishedAt' | 'author'> & { id?: string };
const blank: Draft = { title: '', content: '', kind: 'GENERAL', category: 'NOTICE', scope: 'Toàn khu', pinned: false };

export default function AnnouncementsPage() {
  const announcements = useDb('announcements');
  const buildings = useDb('buildings');
  const [cat, setCat] = useState<'all' | AnnouncementCategory>('all');
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = announcements
    .filter((a) => cat === 'all' || a.category === cat)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.publishedAt.localeCompare(a.publishedAt));

  return (
    <>
      <PageHeader
        title="Bảng tin"
        description="Tin chung hiển thị cho toàn khu; thông báo có đối tượng chỉ gửi tới tòa được chọn."
        actions={
          <Button icon={Plus} onClick={() => setDraft(blank)}>
            Đăng tin
          </Button>
        }
      />
      <div className="mb-5">
        <Pills value={cat} onChange={setCat} items={[{ value: 'all', label: 'Tất cả' }, ...Object.entries(announcementCategory).map(([k, v]) => ({ value: k as AnnouncementCategory, label: v }))]} />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState title="Chưa có tin nào" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge label={announcementCategory[a.category]} tone={CATEGORY_TONE[a.category]} dot={false} />
                <span className="text-xs text-muted">{a.kind === 'TARGETED' ? `Gửi tới ${a.scope}` : 'Toàn khu'}</span>
                {a.pinned && <Pin size={14} className="text-terracotta" />}
                <span className="ml-auto flex">
                  <IconButton icon={Pencil} label="Sửa" onClick={() => setDraft(a)} />
                  <IconButton
                    icon={Trash2}
                    label="Gỡ tin"
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Gỡ tin này?', message: `“${a.title}” sẽ không còn hiển thị với cư dân.`, destructive: true, confirmText: 'Gỡ tin' }))
                        run(() => deleteAnnouncement(a.id), 'Đã gỡ tin.');
                    }}
                  />
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{a.title}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-ink-soft">{a.content}</p>
              <p className="mt-3 text-xs text-muted">
                {a.author} · {formatDateTime(a.publishedAt)}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Sửa tin' : 'Đăng tin mới'}
        width={600}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Hủy
            </Button>
            <Button onClick={() => draft && run(() => saveAnnouncement(draft), draft.id ? 'Đã cập nhật tin.' : 'Đã đăng tin và gửi thông báo tới cư dân.') && setDraft(null)}>
              {draft?.id ? 'Lưu' : 'Đăng tin'}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Tiêu đề" required>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
              </Field>
            </div>
            <Field label="Danh mục">
              <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as AnnouncementCategory })} options={Object.entries(announcementCategory).map(([k, v]) => ({ value: k, label: v }))} />
            </Field>
            <Field label="Đối tượng nhận">
              <Select
                value={draft.kind === 'GENERAL' ? 'all' : draft.scope}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value === 'all' ? 'GENERAL' : 'TARGETED', scope: e.target.value === 'all' ? 'Toàn khu' : e.target.value })}
                options={[{ value: 'all', label: 'Toàn khu' }, ...buildings.map((b) => ({ value: b.name, label: b.name }))]}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Nội dung" required>
                <Textarea rows={6} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              </Field>
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#f2a516]" checked={!!draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
              Ghim lên đầu bảng tin
            </label>
          </div>
        )}
      </Modal>
    </>
  );
}
