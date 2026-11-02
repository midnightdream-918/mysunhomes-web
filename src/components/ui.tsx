import { CircleAlert, CircleCheck, Inbox, Search, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { create } from 'zustand';

import { formatDateTime, initials } from '@/lib/format';
import type { Tone } from '@/lib/labels';
import type { StatusStep } from '@/types';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');
export { cx };

// ---- Buttons & badges -------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-ink hover:bg-primary-pressed',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-warm',
  ghost: 'text-ink-soft hover:bg-bg-deep',
  danger: 'bg-rose-soft text-rose hover:bg-[#f1d3d3]',
  dark: 'bg-ink text-white hover:bg-black',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3.5 text-[13px]' : 'h-10 px-5 text-sm',
        variants[variant],
        className,
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, onClick, className }: { icon: LucideIcon; label: string; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-bg-deep', className)}
    >
      <Icon size={18} strokeWidth={1.8} />
    </button>
  );
}

export const toneClass: Record<Tone, { text: string; bg: string; dot: string }> = {
  neutral: { text: 'text-ink-soft', bg: 'bg-bg-deep', dot: 'bg-muted' },
  amber: { text: 'text-gold', bg: 'bg-primary-soft', dot: 'bg-gold' },
  green: { text: 'text-sage', bg: 'bg-sage-soft', dot: 'bg-sage' },
  blue: { text: 'text-slate', bg: 'bg-slate-soft', dot: 'bg-slate' },
  red: { text: 'text-rose', bg: 'bg-rose-soft', dot: 'bg-rose' },
  terracotta: { text: 'text-terracotta', bg: 'bg-terracotta-soft', dot: 'bg-terracotta' },
  plum: { text: 'text-plum', bg: 'bg-plum-soft', dot: 'bg-plum' },
};

export function Badge({ label, tone = 'neutral', dot = true }: { label: string; tone?: Tone; dot?: boolean }) {
  const t = toneClass[tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', t.bg, t.text)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {label}
    </span>
  );
}

export function IconTile({ icon: Icon, tone = 'amber', size = 40 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  const t = toneClass[tone];
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-xl', t.bg, t.text)} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.48)} strokeWidth={1.8} />
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-gold"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

// ---- Layout pieces ---------------------------------------------------------

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={cx('rounded-2xl border border-line bg-surface shadow-soft', padded && 'p-5', className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }: { icon?: LucideIcon; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <IconTile icon={Icon} size={52} />
      <p className="mt-2 font-semibold">{title}</p>
      {message && <p className="max-w-sm text-[13px] text-muted">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'amber',
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left shadow-soft',
        onClick && 'transition-shadow hover:shadow-card',
      )}
    >
      <IconTile icon={icon} tone={tone} size={44} />
      <div className="min-w-0">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="tabular mt-0.5 text-2xl font-bold tracking-tight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </Tag>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cx(
              '-mb-px flex items-center gap-2 border-b-2 px-3 pt-1 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors',
              on ? 'border-primary text-ink' : 'border-transparent text-muted hover:text-ink-soft',
            )}
          >
            {it.label}
            {!!it.count && (
              <span className={cx('rounded-full px-1.5 text-[11px] font-semibold', on ? 'bg-primary text-ink' : 'bg-bg-deep text-ink-soft')}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Pills<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-full bg-bg-deep p-1">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          className={cx('rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors', it.value === value ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink-soft')}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ---- Form controls -----------------------------------------------------------

const inputBase =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-primary focus:bg-[#fffdf8]';

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-soft">
        {label}
        {required && <span className="text-terracotta"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: React.ComponentProps<'input'>) {
  return <input {...props} className={cx(inputBase, 'h-10', props.className)} />;
}

export function Textarea(props: React.ComponentProps<'textarea'>) {
  return <textarea rows={4} {...props} className={cx(inputBase, 'py-2.5', props.className)} />;
}

export function Select({ options, className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...rest} className={cx(inputBase, 'h-10 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%238C8174%27 stroke-width=%272%27><path d=%27M4 6l4 4 4-4%27/></svg>")] bg-[right_12px_center] bg-no-repeat pr-9', className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputBase, 'h-10 rounded-full pl-10')} />
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3">{children}</div>;
}

// ---- Table ---------------------------------------------------------------------

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Table<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  empty = 'Không có dữ liệu',
  pageSize = 12,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = useMemo(() => rows.slice(current * pageSize, (current + 1) * pageSize), [rows, current, pageSize]);
  const align = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-warm">
              {columns.map((c, i) => (
                <th key={i} className={cx('px-4 py-3 text-xs font-medium tracking-wide whitespace-nowrap text-muted uppercase', align(c.align), c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cx('border-b border-line last:border-0', onRowClick && 'cursor-pointer transition-colors hover:bg-surface-warm')}
              >
                {columns.map((c, i) => (
                  <td key={i} className={cx('px-4 py-3 align-middle', align(c.align), c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <EmptyState title={empty} />}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[13px] text-muted">
          <span className="tabular">
            {current * pageSize + 1}–{Math.min(rows.length, (current + 1) * pageSize)} / {rows.length}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Trước
            </Button>
            <Button size="sm" variant="ghost" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Overlays ---------------------------------------------------------------------

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onMouseDown={onClose}>
      <div className="anim-pop flex max-h-[90vh] w-full flex-col rounded-3xl bg-surface shadow-pop" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <IconButton icon={X} label="Đóng" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-6 pb-2">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 pt-3 pb-5">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="anim-fade fixed inset-0 z-40 flex justify-end bg-ink/30" onMouseDown={onClose}>
      <aside className="anim-slide flex h-full w-full max-w-[520px] flex-col bg-bg shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <div className="mt-0.5 text-[13px] text-muted">{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Đóng" onClick={onClose} />
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function Timeline<S extends string>({ steps, meta }: { steps: StatusStep<S>[]; meta: Record<S, { label: string; tone: Tone }> }) {
  return (
    <ol>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute top-4 left-[5px] h-full w-0.5 bg-line" />}
            <span className={cx('relative mt-1.5 h-3 w-3 shrink-0 rounded-full', last ? toneClass[meta[s.status].tone].dot : 'bg-line-strong')} />
            <div>
              <p className={cx('font-medium', !last && 'text-ink-soft')}>{meta[s.status].label}</p>
              <p className="text-xs text-muted">
                {formatDateTime(s.at)}
                {s.by ? ` · ${s.by}` : ''}
              </p>
              {s.note && <p className="mt-0.5 text-[13px] text-ink-soft">{s.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---- Toasts, confirm and prompt dialogs ------------------------------------------

interface DialogReq {
  title: string;
  message?: string;
  confirmText?: string;
  destructive?: boolean;
  input?: { label: string; placeholder?: string; required?: boolean };
  resolve: (v: string | null) => void;
}

const useOverlay = create<{ toasts: { id: number; text: string; ok: boolean }[]; dialog: DialogReq | null }>(() => ({ toasts: [], dialog: null }));

export function toast(text: string, ok = true) {
  const id = Date.now() + Math.random();
  useOverlay.setState((s) => ({ toasts: [...s.toasts, { id, text, ok }] }));
  setTimeout(() => useOverlay.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
}

/** Runs a store action, toasting the success message or the thrown error. Returns true on success. */
export function run(fn: () => unknown, success?: string) {
  try {
    fn();
    if (success) toast(success);
    return true;
  } catch (e) {
    toast((e as Error).message, false);
    return false;
  }
}

export function confirmDialog(opts: Omit<DialogReq, 'resolve' | 'input'>) {
  return new Promise<boolean>((resolve) => useOverlay.setState({ dialog: { ...opts, resolve: (v) => resolve(v !== null) } }));
}

/** Asks for a short text (e.g. a rejection reason). Resolves null when cancelled. */
export function promptDialog(opts: Omit<DialogReq, 'resolve'> & { input: NonNullable<DialogReq['input']> }) {
  return new Promise<string | null>((resolve) => useOverlay.setState({ dialog: { ...opts, resolve } }));
}

function DialogHost() {
  const d = useOverlay((s) => s.dialog);
  const [text, setText] = useState('');
  const close = (v: string | null) => {
    d?.resolve(v);
    setText('');
    useOverlay.setState({ dialog: null });
  };
  if (!d) return null;
  const blocked = !!d.input?.required && !text.trim();
  return (
    <Modal
      open
      onClose={() => close(null)}
      title={d.title}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={() => close(null)}>
            Hủy
          </Button>
          <Button variant={d.destructive ? 'danger' : 'primary'} disabled={blocked} onClick={() => close(text)}>
            {d.confirmText ?? 'Xác nhận'}
          </Button>
        </>
      }
    >
      {d.message && <p className="text-ink-soft">{d.message}</p>}
      {d.input && (
        <div className="mt-3">
          <Field label={d.input.label} required={d.input.required}>
            <Textarea rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={d.input.placeholder} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

export function OverlayHost() {
  const toasts = useOverlay((s) => s.toasts);
  return (
    <>
      <DialogHost />
      <div className="pointer-events-none fixed right-6 bottom-6 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="anim-pop flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-pop">
            {t.ok ? <CircleCheck size={18} className="text-[#9bd3ae]" /> : <CircleAlert size={18} className="text-[#f2a9a9]" />}
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
