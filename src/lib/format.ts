const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

/** 4.610.650 đ → "4,6 tr" for compact tiles and chart axes. */
export function formatMoneyShort(value: number) {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}k`;
  return String(value);
}

export function parseDay(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function asDate(v: string | Date) {
  if (v instanceof Date) return v;
  return v.length === 10 ? parseDay(v) : new Date(v);
}

/** ISO timestamp → value for <input type="datetime-local"> in local time (toISOString would give UTC). */
export function toLocalInput(v: string | Date) {
  const d = asDate(v);
  return `${toDayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(v: string | Date) {
  const d = asDate(v);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDayShort(v: string | Date) {
  const d = asDate(v);
  return `${WEEKDAYS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatTime(v: string | Date) {
  const d = asDate(v);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(v: string | Date) {
  return `${formatTime(v)} ${formatDate(v)}`;
}

export function formatRelative(v: string) {
  const min = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (min < 1) return 'Vừa xong';
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(v);
}

export function periodLabel(periodId: string) {
  const [y, m] = periodId.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

export function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p.length > 1 ? p[0][0] : '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase();
}

export function maskPhone(phone: string) {
  return phone.length === 10 ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}` : phone;
}

export function ageFrom(dob: string) {
  const b = parseDay(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

/** Accent/case-insensitive search for Vietnamese text. */
export function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export function matches(query: string, ...fields: (string | undefined)[]) {
  if (!query.trim()) return true;
  const q = normalize(query.trim());
  return fields.some((f) => f && normalize(f).includes(q));
}

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  // BOM so Excel opens UTF-8 Vietnamese correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
