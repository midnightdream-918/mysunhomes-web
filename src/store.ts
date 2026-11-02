import { useMemo } from 'react';
import { create } from 'zustand';

import { createSeed, VEHICLE_QUOTA, type Db } from '@/data/seed';
import { ageFrom, toDayKey, uid } from '@/lib/format';
import type {
  Announcement,
  ComplaintStatus,
  FeeType,
  InvoiceItem,
  Resident,
  ServiceStatus,
  Staff,
  StaffRole,
} from '@/types';

/**
 * In-memory mock backend. Every action below mirrors a use case from the
 * analysis (activity/sequence diagrams) and enforces its business rules, so
 * swapping it for real API calls later does not change the pages.
 */
interface State {
  db: Db;
  sessionId: string | null;
}

export const useStore = create<State>(() => ({ db: createSeed(), sessionId: null }));

const db = () => useStore.getState().db;
const set = (patch: (d: Db) => Partial<Db>) => useStore.setState((s) => ({ db: { ...s.db, ...patch(s.db) } }));
const nowIso = () => new Date().toISOString();
const fail = (message: string): never => {
  throw new Error(message);
};

export function useDb<K extends keyof Db>(key: K): Db[K] {
  return useStore((s) => s.db[key]);
}

export function useMe() {
  const id = useStore((s) => s.sessionId);
  const staff = useDb('staff');
  return staff.find((s) => s.id === id);
}

export function me(): Staff {
  const s = db().staff.find((x) => x.id === useStore.getState().sessionId);
  return s ?? fail('Phiên đăng nhập đã hết hạn.');
}

/** Lookup helpers shared by many pages. */
export function useLookups() {
  const apartments = useDb('apartments');
  const buildings = useDb('buildings');
  const residents = useDb('residents');
  const residencies = useDb('residencies');
  const staff = useDb('staff');
  return useMemo(() => {
    const aptById = new Map(apartments.map((a) => [a.id, a]));
    const buildingById = new Map(buildings.map((b) => [b.id, b]));
    const ownerByApt = new Map<string, Resident>();
    residencies.forEach((r) => {
      if (r.role === 'OWNER' && r.active) {
        const res = residents.find((x) => x.id === r.residentId);
        if (res) ownerByApt.set(r.apartmentId, res);
      }
    });
    return {
      apt: (id?: string) => (id ? aptById.get(id) : undefined),
      aptCode: (id?: string) => (id ? (aptById.get(id)?.code ?? '—') : '—'),
      building: (id?: string) => (id ? buildingById.get(id) : undefined),
      owner: (aptId?: string) => (aptId ? ownerByApt.get(aptId) : undefined),
      staffName: (id?: string) => staff.find((s) => s.id === id)?.fullName,
    };
  }, [apartments, buildings, residents, residencies, staff]);
}

// ---- Auth (Hình 3.2.2.1) ----------------------------------------------------

export function login(phone: string, password: string) {
  const s = db().staff.find((x) => x.phone === phone.trim());
  if (!s || s.password !== password) fail('Sai số điện thoại hoặc mật khẩu.');
  if (s!.status === 'LOCKED') fail('Tài khoản đã bị khóa. Liên hệ quản trị viên.');
  useStore.setState({ sessionId: s!.id });
}

export function logout() {
  useStore.setState({ sessionId: null });
}

// ---- Resident accounts (Hình 3.2.2.2) ---------------------------------------

export function approveAccount(id: string) {
  const d = db();
  const acc = d.residentAccounts.find((a) => a.id === id) ?? fail('Không tìm thấy tài khoản.');
  const apt = d.apartments.find((a) => a.code === acc.apartmentCode) ?? fail('Mã căn hộ không tồn tại, không thể duyệt.');
  const match = d.residencies
    .filter((r) => r.apartmentId === apt.id && r.active)
    .map((r) => d.residents.find((x) => x.id === r.residentId))
    .find((r) => r?.citizenId === acc.citizenId);
  if (!match) fail('CCCD không khớp với hồ sơ cư dân của căn hộ. Hãy từ chối hoặc thêm cư dân trước.');
  set((x) => ({ residentAccounts: x.residentAccounts.map((a) => (a.id === id ? { ...a, status: 'ACTIVE', residentId: match!.id } : a)) }));
}

export function rejectAccount(id: string, reason: string) {
  if (!reason.trim()) fail('Vui lòng nhập lý do từ chối.');
  set((x) => ({ residentAccounts: x.residentAccounts.map((a) => (a.id === id ? { ...a, status: 'REJECTED', rejectReason: reason } : a)) }));
}

// ---- Residents (Hình 3.2.2.3, 3.2.2.4) ---------------------------------------

export interface ResidentInput {
  apartmentId: string;
  fullName: string;
  dateOfBirth: string;
  gender: Resident['gender'];
  citizenId?: string;
  phone?: string;
  email?: string;
  relationToOwner: string;
  isOwner: boolean;
}

export function addResident(input: ResidentInput) {
  const d = db();
  if (!input.fullName.trim() || !input.dateOfBirth || !input.relationToOwner.trim()) fail('Vui lòng nhập đủ các trường bắt buộc.');
  if (ageFrom(input.dateOfBirth) >= 14 && !input.citizenId) fail('Cư dân từ 14 tuổi trở lên bắt buộc có CCCD.');
  if (input.citizenId && !/^\d{12}$/.test(input.citizenId)) fail('Số CCCD gồm 12 chữ số.');
  if (input.citizenId && d.residents.some((r) => r.citizenId === input.citizenId && r.status === 'LIVING')) fail('CCCD đã tồn tại trong hệ thống.');
  if (input.isOwner && d.residencies.some((r) => r.apartmentId === input.apartmentId && r.role === 'OWNER' && r.active)) {
    fail('Mỗi căn hộ chỉ có 1 chủ hộ. Dùng chức năng Đổi chủ hộ nếu cần.');
  }
  const res: Resident = {
    id: uid('r'),
    fullName: input.fullName.trim(),
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    citizenId: input.citizenId || undefined,
    phone: input.phone || undefined,
    email: input.email || undefined,
    status: 'LIVING',
  };
  set((x) => ({
    residents: [...x.residents, res],
    residencies: [
      ...x.residencies,
      { id: uid('rs'), apartmentId: input.apartmentId, residentId: res.id, role: input.isOwner ? 'OWNER' : 'MEMBER', relationToOwner: input.isOwner ? 'Chủ hộ' : input.relationToOwner, fromDate: toDayKey(new Date()), active: true },
    ],
    apartments: x.apartments.map((a) => (a.id === input.apartmentId && a.status === 'VACANT' ? { ...a, status: 'OCCUPIED' } : a)),
  }));
}

export function moveOut(residencyId: string) {
  const d = db();
  const rs = d.residencies.find((r) => r.id === residencyId) ?? fail('Không tìm thấy cư dân.');
  const others = d.residencies.filter((r) => r.apartmentId === rs.apartmentId && r.active && r.id !== rs.id);
  if (rs.role === 'OWNER' && others.length > 0) fail('Hãy đổi chủ hộ trước khi cập nhật chủ hộ chuyển đi.');
  set((x) => ({
    residencies: x.residencies.map((r) => (r.id === residencyId ? { ...r, active: false, toDate: toDayKey(new Date()) } : r)),
    residents: x.residents.map((r) => (r.id === rs.residentId ? { ...r, status: 'MOVED_OUT' } : r)),
    apartments: others.length === 0 ? x.apartments.map((a) => (a.id === rs.apartmentId ? { ...a, status: 'VACANT' } : a)) : x.apartments,
  }));
}

export function changeOwner(apartmentId: string, newOwnerResidencyId: string) {
  set((x) => ({
    residencies: x.residencies.map((r) => {
      if (r.apartmentId !== apartmentId || !r.active) return r;
      if (r.id === newOwnerResidencyId) return { ...r, role: 'OWNER', relationToOwner: 'Chủ hộ' };
      if (r.role === 'OWNER') return { ...r, role: 'MEMBER', relationToOwner: 'Thành viên' };
      return r;
    }),
  }));
}

export function setApartmentStatus(id: string, status: 'VACANT' | 'OCCUPIED' | 'RENTED') {
  set((x) => ({ apartments: x.apartments.map((a) => (a.id === id ? { ...a, status } : a)) }));
}

export function approveMemberRequest(id: string) {
  const req = db().memberRequests.find((m) => m.id === id) ?? fail('Không tìm thấy yêu cầu.');
  addResident({
    apartmentId: req.apartmentId,
    fullName: req.fullName,
    dateOfBirth: req.dateOfBirth,
    gender: 'FEMALE',
    citizenId: req.citizenId,
    relationToOwner: req.relationToOwner,
    isOwner: false,
  });
  set((x) => ({ memberRequests: x.memberRequests.map((m) => (m.id === id ? { ...m, status: 'APPROVED' } : m)) }));
}

export function rejectMemberRequest(id: string, reason: string) {
  if (!reason.trim()) fail('Vui lòng nhập lý do từ chối.');
  set((x) => ({ memberRequests: x.memberRequests.map((m) => (m.id === id ? { ...m, status: 'REJECTED', rejectReason: reason } : m)) }));
}

// ---- Vehicles & cards (Hình 3.2.2.5) -----------------------------------------

export function approveVehicle(id: string, cardNumber?: string) {
  const d = db();
  const v = d.vehicles.find((x) => x.id === id) ?? fail('Không tìm thấy phương tiện.');
  const approved = d.vehicles.filter((x) => x.apartmentId === v.apartmentId && x.vehicleType === v.vehicleType && x.status === 'APPROVED').length;
  if (approved >= VEHICLE_QUOTA[v.vehicleType]) fail('Căn hộ đã đạt hạn mức phương tiện loại này.');
  const num = cardNumber?.trim();
  if (num && d.cards.some((c) => c.cardNumber === num)) fail('Số thẻ đã tồn tại.');
  set((x) => ({
    vehicles: x.vehicles.map((y) => (y.id === id ? { ...y, status: 'APPROVED' } : y)),
    cards: num
      ? [...x.cards, { id: uid('c'), cardNumber: num, cardType: 'VEHICLE', status: 'ACTIVE', issuedAt: nowIso(), apartmentId: v.apartmentId, holderName: `${v.brand} ${v.model} · ${v.plateNumber}`, vehicleId: v.id }]
      : x.cards,
  }));
}

export function rejectVehicle(id: string, reason: string) {
  if (!reason.trim()) fail('Vui lòng nhập lý do từ chối.');
  set((x) => ({ vehicles: x.vehicles.map((v) => (v.id === id ? { ...v, status: 'REJECTED', rejectReason: reason } : v)) }));
}

export function cancelVehicle(id: string) {
  set((x) => ({
    vehicles: x.vehicles.map((v) => (v.id === id ? { ...v, status: 'CANCELLED' } : v)),
    cards: x.cards.map((c) => (c.vehicleId === id ? { ...c, status: 'LOCKED', note: 'Hủy đăng ký xe' } : c)),
  }));
}

export function issueCard(input: { apartmentId: string; cardNumber: string; holderName: string; cardType: 'RESIDENT' | 'VEHICLE'; vehicleId?: string }) {
  const num = input.cardNumber.trim();
  if (!input.apartmentId) fail('Vui lòng chọn căn hộ.');
  if (!num || !input.holderName.trim()) fail('Vui lòng nhập số thẻ và chủ thẻ.');
  if (db().cards.some((c) => c.cardNumber === num)) fail('Số thẻ đã tồn tại.');
  set((x) => ({ cards: [...x.cards, { id: uid('c'), ...input, cardNumber: num, status: 'ACTIVE', issuedAt: nowIso() }] }));
}

export function setCardStatus(id: string, status: 'ACTIVE' | 'LOCKED', note?: string) {
  set((x) => ({ cards: x.cards.map((c) => (c.id === id ? { ...c, status, note } : c)) }));
}

export function reissueCard(id: string, newNumber: string) {
  const d = db();
  const old = d.cards.find((c) => c.id === id) ?? fail('Không tìm thấy thẻ.');
  if (!newNumber.trim()) fail('Vui lòng nhập số thẻ mới.');
  if (d.cards.some((c) => c.cardNumber === newNumber.trim())) fail('Số thẻ đã tồn tại.');
  set((x) => ({
    cards: [
      ...x.cards.map((c) => (c.id === id ? { ...c, status: 'LOCKED' as const, note: `Cấp lại thành ${newNumber.trim()}` } : c)),
      { ...old, id: uid('c'), cardNumber: newNumber.trim(), status: 'ACTIVE', issuedAt: nowIso(), note: undefined },
    ],
  }));
}

// ---- Access & guests (Hình 3.2.2.7, 3.2.4.4) ---------------------------------

export type ScanResult =
  | { ok: true; guestId: string; direction: 'IN' | 'OUT' }
  | { ok: false; reason: string };

export function verifyQr(code: string): ScanResult {
  const d = db();
  const g = d.guests.find((x) => x.qrCode.toUpperCase() === code.trim().toUpperCase());
  if (!g) return { ok: false, reason: 'Mã QR không tồn tại.' };
  const p = d.guestPasses.find((x) => x.id === g.passId)!;
  if (g.status === 'CANCELLED') return { ok: false, reason: 'Khách đã bị cư dân hủy.' };
  if (g.status === 'LEFT') return { ok: false, reason: 'Mã đã được sử dụng, khách đã ra khỏi khu.' };
  if (g.status === 'INSIDE') return { ok: true, guestId: g.id, direction: 'OUT' };
  const today = toDayKey(new Date());
  if (p.visitDate !== today) return { ok: false, reason: `Mã chỉ có hiệu lực ngày ${p.visitDate.split('-').reverse().join('/')}.` };
  const hm = new Date().toTimeString().slice(0, 5);
  if (hm < p.startTime || hm > p.endTime) return { ok: false, reason: `Ngoài khung giờ ${p.startTime}–${p.endTime}.` };
  return { ok: true, guestId: g.id, direction: 'IN' };
}

export function confirmGuest(guestId: string, direction: 'IN' | 'OUT', gate: string) {
  const d = db();
  const g = d.guests.find((x) => x.id === guestId) ?? fail('Không tìm thấy khách.');
  const p = d.guestPasses.find((x) => x.id === g.passId)!;
  const time = nowIso();
  set((x) => ({
    guests: x.guests.map((y) =>
      y.id === guestId ? { ...y, status: direction === 'IN' ? 'INSIDE' : 'LEFT', ...(direction === 'IN' ? { checkedInAt: time } : { checkedOutAt: time }) } : y,
    ),
    accessLogs: [
      { id: uid('log'), time, gate, direction, method: p.createdVia === 'WALK_IN' ? 'WALK_IN' : 'QR', subjectType: 'GUEST', subjectName: g.fullName, apartmentId: p.apartmentId, result: 'ACCEPTED', staffId: me().id },
      ...x.accessLogs,
    ],
  }));
}

export function createWalkIn(input: { apartmentCode: string; guestName: string; guestPhone: string; gate: string }) {
  const apt = db().apartments.find((a) => a.code.toLowerCase() === input.apartmentCode.trim().toLowerCase()) ?? fail('Không tìm thấy căn hộ.');
  if (apt.status === 'VACANT') fail('Căn hộ đang trống, không có cư dân để xác nhận.');
  if (!input.guestName.trim() || !/^0\d{9}$/.test(input.guestPhone.trim())) fail('Vui lòng nhập họ tên và số điện thoại hợp lệ.');
  set((x) => ({
    walkIns: [
      { id: uid('w'), apartmentId: apt.id, guestName: input.guestName.trim(), guestPhone: input.guestPhone.trim(), gate: input.gate, status: 'PENDING', createdAt: nowIso(), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), createdBy: me().id },
      ...x.walkIns,
    ],
  }));
}

/** Demo helper: stands in for the resident answering the push on their phone. */
export function simulateWalkInAnswer(id: string, accept: boolean) {
  const w = db().walkIns.find((x) => x.id === id) ?? fail('Không tìm thấy yêu cầu.');
  if (!accept) {
    set((x) => ({ walkIns: x.walkIns.map((y) => (y.id === id ? { ...y, status: 'REJECTED' } : y)) }));
    return;
  }
  const passId = uid('gp');
  const hm = new Date().toTimeString().slice(0, 5);
  set((x) => ({
    walkIns: x.walkIns.map((y) => (y.id === id ? { ...y, status: 'APPROVED' } : y)),
    guestPasses: [...x.guestPasses, { id: passId, apartmentId: w.apartmentId, visitDate: toDayKey(new Date()), startTime: hm, endTime: '23:59', createdVia: 'WALK_IN', createdAt: nowIso() }],
    guests: [...x.guests, { id: uid('g'), passId, fullName: w.guestName, phone: w.guestPhone, qrCode: `WI-${id}`, status: 'WAITING' }],
  }));
}

export function expireWalkIns() {
  const now = Date.now();
  if (!db().walkIns.some((w) => w.status === 'PENDING' && new Date(w.expiresAt).getTime() < now)) return;
  set((x) => ({ walkIns: x.walkIns.map((w) => (w.status === 'PENDING' && new Date(w.expiresAt).getTime() < now ? { ...w, status: 'EXPIRED' } : w)) }));
}

// ---- Billing (Hình 3.2.2.8) ---------------------------------------------------

export function updatePrice(feeType: FeeType, unitPrice: number) {
  if (!(unitPrice > 0)) fail('Đơn giá phải lớn hơn 0.');
  set((x) => ({ prices: x.prices.map((p) => (p.feeType === feeType ? { ...p, unitPrice, effectiveFrom: toDayKey(new Date()) } : p)) }));
}

export function saveReading(apartmentId: string, period: string, electricCurr?: number, waterCurr?: number) {
  const r = db().readings.find((x) => x.apartmentId === apartmentId && x.period === period) ?? fail('Không có công tơ cho căn này.');
  if (electricCurr !== undefined && electricCurr < r.electricPrev) fail('Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ.');
  if (waterCurr !== undefined && waterCurr < r.waterPrev) fail('Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ.');
  set((x) => ({
    readings: x.readings.map((y) => (y.apartmentId === apartmentId && y.period === period ? { ...y, electricCurr, waterCurr } : y)),
  }));
}

export function issuePeriod(period: string, dueDate: string) {
  const d = db();
  if (d.periods.some((p) => p.id === period)) fail('Kỳ này đã được phát hành.');
  const rows = d.readings.filter((r) => r.period === period);
  const missing = rows.filter((r) => r.electricCurr === undefined || r.waterCurr === undefined);
  if (missing.length) fail(`Còn ${missing.length} căn chưa có chỉ số công tơ.`);
  const price = (f: FeeType) => d.prices.find((p) => p.feeType === f)!.unitPrice;
  const [y, m] = period.split('-').map(Number);
  const newInvoices = rows.map((r, i) => {
    const a = d.apartments.find((x) => x.id === r.apartmentId)!;
    const cars = d.vehicles.filter((v) => v.apartmentId === a.id && v.status === 'APPROVED' && v.vehicleType === 'CAR').length;
    const bikes = d.vehicles.filter((v) => v.apartmentId === a.id && v.status === 'APPROVED' && v.vehicleType === 'MOTORBIKE').length;
    const kwh = r.electricCurr! - r.electricPrev;
    const m3 = r.waterCurr! - r.waterPrev;
    const services = d.serviceRequests.filter((s) => s.apartmentId === a.id && s.status === 'COMPLETED');
    const bookingsOnInvoice = d.bookings.filter((b) => b.apartmentId === a.id && b.payMode === 'ON_INVOICE' && b.amount > 0 && b.status !== 'CANCELLED');
    const items: InvoiceItem[] = [
      { feeType: 'MANAGEMENT', description: `${a.area} m²`, quantity: a.area, unitPrice: price('MANAGEMENT'), amount: Math.round(a.area * price('MANAGEMENT')) },
      ...(cars ? [{ feeType: 'PARKING_CAR' as const, description: `${cars} xe`, quantity: cars, unitPrice: price('PARKING_CAR'), amount: cars * price('PARKING_CAR') }] : []),
      ...(bikes ? [{ feeType: 'PARKING_MOTORBIKE' as const, description: `${bikes} xe`, quantity: bikes, unitPrice: price('PARKING_MOTORBIKE'), amount: bikes * price('PARKING_MOTORBIKE') }] : []),
      { feeType: 'ELECTRIC', description: `${kwh} kWh`, quantity: kwh, unitPrice: price('ELECTRIC'), amount: kwh * price('ELECTRIC') },
      { feeType: 'WATER', description: `${m3} m³`, quantity: m3, unitPrice: price('WATER'), amount: m3 * price('WATER') },
      ...services.slice(0, 2).map((s) => {
        const sv = d.services.find((x) => x.id === s.serviceId)!;
        return { feeType: 'SERVICE' as const, description: sv.name, quantity: 1, unitPrice: sv.price, amount: sv.price };
      }),
      ...bookingsOnInvoice.slice(0, 2).map((b) => ({
        feeType: 'FACILITY' as const,
        description: d.facilities.find((f) => f.id === b.facilityId)!.name,
        quantity: 1,
        unitPrice: b.amount,
        amount: b.amount,
      })),
    ];
    return {
      id: `inv-${period}-${i}-${Date.now().toString(36)}`,
      apartmentId: a.id,
      periodId: period,
      items,
      totalAmount: items.reduce((s, x) => s + x.amount, 0),
      status: 'UNPAID' as const,
      dueDate,
    };
  });
  set((x) => ({
    periods: [...x.periods, { id: period, month: m, year: y, dueDate, issuedAt: nowIso() }],
    invoices: [...x.invoices, ...newInvoices],
  }));
  return newInvoices.length;
}

export function recordCounterPayment(id: string) {
  set((x) => ({ invoices: x.invoices.map((i) => (i.id === id ? { ...i, status: 'PAID', paidAt: nowIso(), paymentMethod: 'COUNTER' } : i)) }));
}

export function cancelInvoice(id: string) {
  const inv = db().invoices.find((i) => i.id === id) ?? fail('Không tìm thấy hóa đơn.');
  if (inv.status === 'PAID') fail('Không thể hủy hóa đơn đã thanh toán.');
  set((x) => ({ invoices: x.invoices.map((i) => (i.id === id ? { ...i, status: 'CANCELLED' } : i)) }));
}

/** Phát hành lại cho căn hộ — re-creates a cancelled invoice with fresh totals. */
export function reissueInvoice(id: string) {
  const inv = db().invoices.find((i) => i.id === id) ?? fail('Không tìm thấy hóa đơn.');
  if (inv.status !== 'CANCELLED') fail('Chỉ phát hành lại hóa đơn đã hủy.');
  set((x) => ({ invoices: [...x.invoices, { ...inv, id: uid('inv'), status: 'UNPAID', paidAt: undefined, paymentMethod: undefined }] }));
}

// ---- Services & facilities (Hình 3.2.2.10, 3.2.2.11) --------------------------

const serviceFlow: Record<ServiceStatus, ServiceStatus[]> = {
  NEW: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};
export const nextServiceStatuses = (s: ServiceStatus) => serviceFlow[s];

export function advanceService(id: string, to: ServiceStatus, extra: { note?: string; assignee?: string; scheduledTime?: string } = {}) {
  const r = db().serviceRequests.find((x) => x.id === id) ?? fail('Không tìm thấy yêu cầu.');
  if (!serviceFlow[r.status].includes(to)) fail('Không thể chuyển sang trạng thái này.');
  if (to === 'CANCELLED' && !extra.note?.trim()) fail('Vui lòng nhập lý do từ chối.');
  if (to === 'ACCEPTED' && !extra.assignee?.trim()) fail('Vui lòng chọn người thực hiện.');
  set((x) => ({
    serviceRequests: x.serviceRequests.map((y) =>
      y.id === id
        ? {
            ...y,
            status: to,
            assignee: extra.assignee ?? y.assignee,
            scheduledTime: extra.scheduledTime ?? y.scheduledTime,
            cancelReason: to === 'CANCELLED' ? extra.note : y.cancelReason,
            history: [...y.history, { status: to, at: nowIso(), note: extra.note, by: me().fullName }],
          }
        : y,
    ),
  }));
}

export function saveService(input: { id?: string; name: string; description: string; price: number; unit: string; active: boolean }) {
  if (!input.name.trim() || !(input.price >= 0) || !input.unit.trim()) fail('Vui lòng nhập tên, đơn giá và đơn vị.');
  set((x) => ({
    services: input.id
      ? x.services.map((s) => (s.id === input.id ? { ...s, ...input, id: s.id } : s))
      : [...x.services, { ...input, id: uid('s') }],
  }));
}

export function saveFacility(id: string, patch: { capacityPerSlot: number; pricePerBooking: number; active: boolean }) {
  if (!(patch.capacityPerSlot > 0)) fail('Sức chứa phải lớn hơn 0.');
  set((x) => ({ facilities: x.facilities.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
}

export function cancelBooking(id: string) {
  set((x) => ({ bookings: x.bookings.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' } : b)) }));
}

// ---- Complaints (Hình 3.2.2.13) ------------------------------------------------

export function assignComplaint(id: string, target: { staffId?: string; external?: string }) {
  if (!target.staffId && !target.external?.trim()) fail('Vui lòng chọn người xử lý.');
  const who = target.staffId ? db().staff.find((s) => s.id === target.staffId)?.fullName : target.external;
  set((x) => ({
    complaints: x.complaints.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'ASSIGNED',
            assigneeId: target.staffId,
            external: target.staffId ? undefined : target.external,
            history: [...c.history, { status: 'ASSIGNED', at: nowIso(), note: `Giao cho ${who}`, by: me().fullName }],
          }
        : c,
    ),
  }));
}

const complaintFlow: Record<ComplaintStatus, ComplaintStatus[]> = {
  NEW: [],
  ASSIGNED: ['IN_PROGRESS'],
  REOPENED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
};
export const nextComplaintStatuses = (s: ComplaintStatus) => complaintFlow[s];

export function advanceComplaint(id: string, to: ComplaintStatus, note?: string) {
  const c = db().complaints.find((x) => x.id === id) ?? fail('Không tìm thấy phản ánh.');
  if (!complaintFlow[c.status].includes(to)) fail('Không thể chuyển sang trạng thái này.');
  if (to === 'RESOLVED' && !note?.trim()) fail('Vui lòng mô tả kết quả xử lý.');
  set((x) => ({
    complaints: x.complaints.map((y) =>
      y.id === id
        ? { ...y, status: to, resultNote: to === 'RESOLVED' ? note : y.resultNote, history: [...y.history, { status: to, at: nowIso(), note, by: me().fullName }] }
        : y,
    ),
  }));
}

// ---- Announcements -------------------------------------------------------------

export function saveAnnouncement(input: Omit<Announcement, 'id' | 'publishedAt' | 'author'> & { id?: string }) {
  if (!input.title.trim() || !input.content.trim()) fail('Vui lòng nhập tiêu đề và nội dung.');
  if (input.kind === 'TARGETED' && !input.scope.trim()) fail('Vui lòng chọn đối tượng nhận.');
  set((x) => ({
    announcements: input.id
      ? x.announcements.map((a) => (a.id === input.id ? { ...a, ...input, id: a.id } : a))
      : [{ ...input, id: uid('an'), publishedAt: nowIso(), author: me().fullName }, ...x.announcements],
  }));
}

export function deleteAnnouncement(id: string) {
  set((x) => ({ announcements: x.announcements.filter((a) => a.id !== id) }));
}

// ---- Staff accounts (Admin) ------------------------------------------------------

export function createStaff(input: { fullName: string; phone: string; email: string; role: StaffRole }) {
  if (!input.fullName.trim() || !/^0\d{9}$/.test(input.phone.trim())) fail('Vui lòng nhập họ tên và số điện thoại hợp lệ.');
  if (db().staff.some((s) => s.phone === input.phone.trim())) fail('Số điện thoại đã được dùng.');
  set((x) => ({
    staff: [...x.staff, { id: uid('st'), ...input, phone: input.phone.trim(), password: '123456', status: 'ACTIVE', createdAt: nowIso() }],
  }));
}

export function setStaffStatus(id: string, status: 'ACTIVE' | 'LOCKED') {
  if (id === me().id) fail('Không thể tự khóa tài khoản của mình.');
  set((x) => ({ staff: x.staff.map((s) => (s.id === id ? { ...s, status } : s)) }));
}
