import { Camera, CircleCheck, CircleX, Download, LogIn, LogOut, QrCode, Timer, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Pills,
  run,
  SearchInput,
  SectionTitle,
  Select,
  Table,
  Tabs,
  toast,
  Toolbar,
} from '@/components/ui';
import { DEMO_QR } from '@/data/seed';
import { downloadCsv, formatDate, formatDateTime, formatTime, maskPhone, matches, toDayKey } from '@/lib/format';
import { accessMethod, guestStatus, requestStatus } from '@/lib/labels';
import { confirmGuest, createWalkIn, simulateWalkInAnswer, useDb, useLookups, verifyQr, type ScanResult } from '@/store';

const GATES = ['Cổng chính', 'Sảnh tòa T1', 'Sảnh tòa T2', 'Sảnh chính tòa T3', 'Hầm B1'];

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function AccessPage() {
  const [tab, setTab] = useState<'today' | 'logs'>('today');
  const [gate, setGate] = useState(GATES[3]);
  const [walkInPrefill, setWalkInPrefill] = useState<{ name: string; phone: string } | null>(null);

  return (
    <>
      <PageHeader
        title="Ra vào & khách"
        description="Kiểm tra mã QR khách, tiếp nhận khách không đăng ký và tra cứu nhật ký."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted">Vị trí trực</span>
            <div className="w-48">
              <Select value={gate} onChange={(e) => setGate(e.target.value)} options={GATES.map((g) => ({ value: g, label: g }))} />
            </div>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <QrCheck gate={gate} onWalkIn={(p) => setWalkInPrefill(p)} />
        <WalkIns gate={gate} prefill={walkInPrefill} onPrefillUsed={() => setWalkInPrefill(null)} />
      </div>
      <div className="mt-8">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'today', label: 'Khách hôm nay' }, { value: 'logs', label: 'Nhật ký ra vào' }]} />
        {tab === 'today' ? <TodayGuests gate={gate} /> : <AccessLogs />}
      </div>
    </>
  );
}

// ---- QR check ------------------------------------------------------------------

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

function QrCheck({ gate, onWalkIn }: { gate: string; onWalkIn: (p: { name: string; phone: string }) => void }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<(ScanResult & { code: string }) | null>(null);
  const [camera, setCamera] = useState(false);
  const guests = useDb('guests');
  const passes = useDb('guestPasses');
  const { aptCode } = useLookups();

  const check = (value = code) => {
    if (!value.trim()) return;
    setResult({ ...verifyQr(value), code: value.trim() });
  };

  const guest = result?.ok ? guests.find((g) => g.id === result.guestId) : undefined;
  const pass = guest ? passes.find((p) => p.id === guest.passId) : undefined;

  return (
    <Card>
      <SectionTitle>Kiểm tra mã QR</SectionTitle>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <div className="relative flex-1">
          <QrCode size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Quét hoặc nhập mã khách" className="pl-10 [&:not(:placeholder-shown)]:uppercase" autoFocus />
        </div>
        <Button type="submit">Kiểm tra</Button>
        <Button variant="secondary" icon={Camera} onClick={() => setCamera(true)}>
          Camera
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted">
        Máy quét USB tự gõ mã và nhấn Enter. Mã thử: <button className="font-medium text-gold underline-offset-2 hover:underline" onClick={() => { setCode(DEMO_QR); check(DEMO_QR); }}>{DEMO_QR}</button>
      </p>

      {result && (
        <div className="anim-pop mt-5">
          {result.ok && guest && pass ? (
            <div className="rounded-2xl border border-sage/30 bg-sage-soft/60 p-5">
              <div className="flex items-start gap-3">
                <CircleCheck className="mt-0.5 text-sage" size={22} />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{guest.fullName}</p>
                  <p className="text-[13px] text-ink-soft">
                    {maskPhone(guest.phone)} · đến căn <span className="font-semibold text-ink">{aptCode(pass.apartmentId)}</span> · {pass.startTime}–{pass.endTime}
                  </p>
                </div>
                <Badge label={result.direction === 'IN' ? 'Vào khu' : 'Ra khỏi khu'} tone={result.direction === 'IN' ? 'green' : 'blue'} />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setResult(null)}>
                  Bỏ qua
                </Button>
                <Button
                  icon={result.direction === 'IN' ? LogIn : LogOut}
                  onClick={() => {
                    if (run(() => confirmGuest(guest.id, result.direction, gate), result.direction === 'IN' ? `Đã check-in ${guest.fullName}. Cư dân đã được báo.` : `Đã check-out ${guest.fullName}.`)) {
                      setResult(null);
                      setCode('');
                    }
                  }}
                >
                  {result.direction === 'IN' ? 'Xác nhận check-in' : 'Xác nhận check-out'}
                </Button>
              </div>
            </div>
          ) : (
            !result.ok && (
              <div className="rounded-2xl border border-rose/25 bg-rose-soft/60 p-5">
                <div className="flex items-start gap-3">
                  <CircleX className="mt-0.5 text-rose" size={22} />
                  <div className="flex-1">
                    <p className="font-semibold">Không cho vào bằng mã này</p>
                    <p className="text-[13px] text-ink-soft">{result.reason}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" icon={UserPlus} onClick={() => onWalkIn({ name: '', phone: '' })}>
                    Chuyển sang walk-in
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <CameraScanner
        open={camera}
        onClose={() => setCamera(false)}
        onCode={(v) => {
          setCamera(false);
          setCode(v);
          check(v);
        }}
      />
    </Card>
  );
}

function CameraScanner({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (v: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    let stream: MediaStream | undefined;
    let stop = false;
    (async () => {
      if (!Detector) {
        setError('Trình duyệt này chưa hỗ trợ quét QR bằng camera. Hãy dùng Chrome hoặc Edge, hoặc nhập mã thủ công.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new Detector({ formats: ['qr_code'] });
        while (!stop) {
          const found = await detector.detect(video.current).catch(() => []);
          if (found[0]?.rawValue) {
            onCode(found[0].rawValue);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setError('Không mở được camera. Kiểm tra quyền truy cập camera của trình duyệt.');
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
      setError('');
    };
  }, [open, onCode]);

  return (
    <Modal open={open} onClose={onClose} title="Quét mã QR bằng camera">
      {error ? (
        <p className="pb-4 text-ink-soft">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-ink">
          <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline />
        </div>
      )}
      <p className="py-3 text-center text-[13px] text-muted">Đưa mã QR của khách vào khung hình.</p>
    </Modal>
  );
}

// ---- Walk-in ---------------------------------------------------------------------

function WalkIns({ gate, prefill, onPrefillUsed }: { gate: string; prefill: { name: string; phone: string } | null; onPrefillUsed: () => void }) {
  const walkIns = useDb('walkIns');
  const guests = useDb('guests');
  const passes = useDb('guestPasses');
  const { aptCode } = useLookups();
  const now = useNow();
  const [form, setForm] = useState({ apartmentCode: '', guestName: '', guestPhone: '' });
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefill) {
      nameRef.current?.focus();
      onPrefillUsed();
    }
  }, [prefill, onPrefillUsed]);

  const recent = walkIns.filter((w) => now - new Date(w.createdAt).getTime() < 6 * 3_600_000).slice(0, 4);
  // An approved walk-in becomes a guest record waiting to be checked in.
  const guestFor = (id: string) => guests.find((g) => g.qrCode === `WI-${id}`);

  return (
    <Card>
      <SectionTitle>Khách walk-in</SectionTitle>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (run(() => createWalkIn({ ...form, gate }), 'Đã gửi yêu cầu xác nhận tới cư dân.')) setForm({ apartmentCode: '', guestName: '', guestPhone: '' });
        }}
      >
        <Field label="Họ tên khách">
          <Input ref={nameRef} value={form.guestName} onChange={(e) => setForm({ ...form, guestName: e.target.value })} />
        </Field>
        <Field label="Số điện thoại">
          <Input value={form.guestPhone} onChange={(e) => setForm({ ...form, guestPhone: e.target.value })} maxLength={10} inputMode="tel" />
        </Field>
        <Field label="Căn hộ muốn đến">
          <Input value={form.apartmentCode} onChange={(e) => setForm({ ...form, apartmentCode: e.target.value })} placeholder="S1-12A05" className="[&:not(:placeholder-shown)]:uppercase" />
        </Field>
        <div className="flex items-end">
          <Button type="submit" icon={UserPlus} className="w-full">
            Gửi cư dân xác nhận
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {recent.length === 0 && <p className="text-[13px] text-muted">Chưa có khách walk-in trong ca.</p>}
        {recent.map((w) => {
          const left = new Date(w.expiresAt).getTime() - now;
          const g = guestFor(w.id);
          const pass = g && passes.find((p) => p.id === g.passId);
          return (
            <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{w.guestName}</p>
                <p className="text-xs text-muted">
                  Căn {aptCode(w.apartmentId)} · {maskPhone(w.guestPhone)} · {formatTime(w.createdAt)}
                </p>
              </div>
              {w.status === 'PENDING' ? (
                <>
                  <span className="tabular flex items-center gap-1 text-[13px] text-terracotta">
                    <Timer size={14} />
                    {Math.max(0, Math.floor(left / 60000))}:{String(Math.max(0, Math.floor((left % 60000) / 1000))).padStart(2, '0')}
                  </span>
                  {/* Demo only: stands in for the resident answering on the app. */}
                  <span className="flex gap-1" title="Giả lập phản hồi của cư dân trên app">
                    <Button size="sm" variant="ghost" onClick={() => run(() => simulateWalkInAnswer(w.id, false), 'Cư dân đã từ chối.')}>
                      Cư dân từ chối
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => run(() => simulateWalkInAnswer(w.id, true), 'Cư dân đã đồng ý.')}>
                      Cư dân đồng ý
                    </Button>
                  </span>
                </>
              ) : g && g.status === 'WAITING' && pass ? (
                <Button size="sm" icon={LogIn} onClick={() => run(() => confirmGuest(g.id, 'IN', gate), `Đã check-in ${g.fullName}.`)}>
                  Check-in
                </Button>
              ) : (
                <Badge {...(g?.status === 'INSIDE' ? guestStatus.INSIDE : requestStatus[w.status])} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---- Tables ----------------------------------------------------------------------

function TodayGuests({ gate }: { gate: string }) {
  const passes = useDb('guestPasses');
  const guests = useDb('guests');
  const { aptCode } = useLookups();
  const [q, setQ] = useState('');
  const today = toDayKey(new Date());
  const rows = useMemo(
    () =>
      guests
        .map((g) => ({ g, p: passes.find((p) => p.id === g.passId)! }))
        .filter(({ g, p }) => p.visitDate === today && matches(q, g.fullName, g.phone, aptCode(p.apartmentId)))
        .sort((a, b) => a.p.startTime.localeCompare(b.p.startTime)),
    [guests, passes, q, today, aptCode],
  );

  return (
    <>
      <Toolbar>
        <span className="text-[13px] text-muted">
          {rows.filter((r) => r.g.status === 'INSIDE').length} khách đang trong khu · {rows.filter((r) => r.g.status === 'WAITING').length} khách chờ đến
        </span>
        <div className="ml-auto">
          <SearchInput value={q} onChange={setQ} placeholder="Tên khách, SĐT, mã căn" />
        </div>
      </Toolbar>
      <Table
        rows={rows}
        rowKey={({ g }) => g.id}
        empty="Hôm nay chưa có khách đăng ký"
        columns={[
          { header: 'Khách', render: ({ g }) => <span className="font-medium">{g.fullName}</span> },
          { header: 'Điện thoại', render: ({ g }) => <span className="tabular">{maskPhone(g.phone)}</span> },
          { header: 'Căn hộ', render: ({ p }) => <span className="font-medium">{aptCode(p.apartmentId)}</span> },
          { header: 'Khung giờ', render: ({ p }) => <span className="tabular">{p.startTime}–{p.endTime}</span> },
          { header: 'Nguồn', render: ({ p }) => <span className="text-ink-soft">{p.createdVia === 'AI' ? 'Trợ lý AI' : p.createdVia === 'WALK_IN' ? 'Walk-in' : 'Ứng dụng'}</span> },
          {
            header: 'Vào / ra',
            render: ({ g }) => <span className="tabular text-ink-soft">{g.checkedInAt ? formatTime(g.checkedInAt) : '—'} / {g.checkedOutAt ? formatTime(g.checkedOutAt) : '—'}</span>,
          },
          { header: 'Trạng thái', render: ({ g }) => <Badge {...guestStatus[g.status]} /> },
          {
            header: '',
            align: 'right',
            render: ({ g }) =>
              g.status === 'INSIDE' ? (
                <Button size="sm" variant="secondary" icon={LogOut} onClick={() => run(() => confirmGuest(g.id, 'OUT', gate), `Đã check-out ${g.fullName}.`)}>
                  Check-out
                </Button>
              ) : null,
          },
        ]}
      />
    </>
  );
}

function AccessLogs() {
  const logs = useDb('accessLogs');
  const { aptCode, staffName } = useLookups();
  const [method, setMethod] = useState('all');
  const [day, setDay] = useState(toDayKey(new Date()));
  const [q, setQ] = useState('');
  const rows = useMemo(
    () => logs.filter((l) => toDayKey(new Date(l.time)) === day && (method === 'all' || l.method === method) && matches(q, l.subjectName, l.gate, aptCode(l.apartmentId))),
    [logs, day, method, q, aptCode],
  );

  return (
    <>
      <Toolbar>
        <Pills value={method} onChange={setMethod} items={[{ value: 'all', label: 'Tất cả' }, ...Object.entries(accessMethod).map(([k, v]) => ({ value: k, label: v }))]} />
        <div className="w-44">
          <Input type="date" value={day} max={toDayKey(new Date())} onChange={(e) => setDay(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Tên, cổng, mã căn" />
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => {
              downloadCsv(`nhat-ky-ra-vao-${day}.csv`, [
                ['Thời gian', 'Cổng', 'Hướng', 'Phương thức', 'Đối tượng', 'Căn hộ', 'Kết quả'],
                ...rows.map((l) => [formatDateTime(l.time), l.gate, l.direction === 'IN' ? 'Vào' : 'Ra', accessMethod[l.method], l.subjectName, aptCode(l.apartmentId), l.result === 'ACCEPTED' ? 'Chấp nhận' : 'Từ chối']),
              ]);
              toast(`Đã xuất ${rows.length} dòng.`);
            }}
          >
            Xuất Excel
          </Button>
        </div>
      </Toolbar>
      <Table
        rows={rows}
        rowKey={(l) => l.id}
        pageSize={15}
        empty={`Không có lượt ra vào ngày ${formatDate(day)}`}
        columns={[
          { header: 'Thời gian', render: (l) => <span className="tabular">{formatTime(l.time)}</span> },
          {
            header: 'Hướng',
            render: (l) => (
              <span className="flex items-center gap-1.5 text-ink-soft">
                {l.direction === 'IN' ? <LogIn size={15} /> : <LogOut size={15} />}
                {l.direction === 'IN' ? 'Vào' : 'Ra'}
              </span>
            ),
          },
          { header: 'Đối tượng', render: (l) => <span className="font-medium">{l.subjectName}</span> },
          { header: 'Loại', render: (l) => <span className="text-ink-soft">{l.subjectType === 'GUEST' ? 'Khách' : l.subjectType === 'VEHICLE' ? 'Xe' : 'Cư dân'}</span> },
          { header: 'Căn hộ', render: (l) => aptCode(l.apartmentId) },
          { header: 'Cổng', render: (l) => <span className="text-ink-soft">{l.gate}</span> },
          { header: 'Phương thức', render: (l) => accessMethod[l.method] },
          { header: 'Xác nhận', render: (l) => <span className="text-ink-soft">{staffName(l.staffId) ?? 'Trạm tự động'}</span> },
          { header: 'Kết quả', render: (l) => <Badge label={l.result === 'ACCEPTED' ? 'Chấp nhận' : 'Từ chối'} tone={l.result === 'ACCEPTED' ? 'green' : 'red'} /> },
        ]}
      />
    </>
  );
}

