import { Lock, Phone } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { Button, Field, Input } from '@/components/ui';
import { homeFor } from '@/layout/nav';
import { staffRole } from '@/lib/labels';
import { login, useMe, useStore } from '@/store';
import type { StaffRole } from '@/types';

const DEMO: { role: StaffRole; phone: string }[] = [
  { role: 'MANAGER', phone: '0900000001' },
  { role: 'ADMIN', phone: '0900000000' },
  { role: 'SECURITY', phone: '0900000002' },
  { role: 'TECHNICIAN', phone: '0900000003' },
];

/** Quiet skyline used on the brand panel — same motif as the resident app header. */
function Skyline() {
  return (
    <svg viewBox="0 0 600 360" className="absolute inset-x-0 bottom-0 w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#DDBB8E" stopOpacity="0.8" />
          <stop offset="1" stopColor="#F6E9D7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD58A" />
          <stop offset="1" stopColor="#F7B85A" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle cx="430" cy="130" r="80" fill="url(#sun)" />
      <g fill="url(#t)">
        <rect x="40" y="150" width="70" height="210" rx="4" />
        <rect x="125" y="90" width="60" height="270" rx="4" />
        <rect x="200" y="60" width="84" height="300" rx="4" />
        <rect x="300" y="130" width="64" height="230" rx="4" />
        <rect x="470" y="100" width="76" height="260" rx="4" />
      </g>
      <g stroke="#fff" strokeOpacity="0.55">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="208" x2="276" y1={84 + i * 22} y2={84 + i * 22} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`b${i}`} x1="478" x2="538" y1={124 + i * 22} y2={124 + i * 22} />
        ))}
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const me = useMe();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (me) return <Navigate to={homeFor(me.role)} replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      login(phone, password);
      const s = useStore.getState();
      const role = s.db.staff.find((x) => x.id === s.sessionId)!.role;
      navigate(homeFor(role), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="grid h-full lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-[#f6e3c6] via-[#f9ebd6] to-bg lg:block">
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="h-11 w-11" />
            <div className="leading-tight">
              <p className="text-xs font-semibold tracking-[0.18em] text-gold">MY SUNHOME</p>
              <p className="text-sm text-ink-soft">Hệ thống quản lý tòa nhà</p>
            </div>
          </div>
          <h1 className="mt-20 max-w-md text-4xl leading-tight font-bold tracking-tight">Vận hành khu căn hộ, gọn gàng trong một nơi.</h1>
          <p className="mt-4 max-w-md text-ink-soft">Cư dân, hóa đơn, ra vào, dịch vụ và phản ánh — cập nhật theo thời gian thực cho Ban quản lý.</p>
        </div>
        <Skyline />
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight">Đăng nhập</h2>
          <p className="mt-1 text-muted">Dành cho nhân viên Ban quản lý.</p>

          <div className="mt-8 space-y-4">
            <Field label="Số điện thoại">
              <div className="relative">
                <Phone size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0900 000 001" className="pl-10" autoComplete="username" />
              </div>
            </Field>
            <Field label="Mật khẩu">
              <div className="relative">
                <Lock size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" className="pl-10" autoComplete="current-password" />
              </div>
            </Field>
            {error && <p className="text-[13px] text-rose">{error}</p>}
            <Button type="submit" className="w-full">
              Đăng nhập
            </Button>
          </div>

          <div className="mt-10">
            <p className="text-center text-[11px] font-medium tracking-wider text-muted uppercase">Tài khoản dùng thử · mật khẩu 123456</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => {
                    setPhone(d.phone);
                    setPassword('123456');
                    setError('');
                  }}
                  className="rounded-xl border border-dashed border-line-strong px-3 py-2 text-left transition-colors hover:bg-bg-deep"
                >
                  <p className="text-sm font-medium">{staffRole[d.role]}</p>
                  <p className="tabular text-xs text-muted">{d.phone}</p>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
