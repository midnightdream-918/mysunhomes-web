import { addDays, toDayKey } from '@/lib/format';
import type {
  AccessCard,
  AccessLog,
  Announcement,
  Apartment,
  BillingPeriod,
  Building,
  Complaint,
  Facility,
  FacilityBooking,
  Guest,
  GuestPass,
  Invoice,
  InvoiceItem,
  MemberRequest,
  MeterReading,
  PriceConfig,
  Residency,
  Resident,
  ResidentAccount,
  Service,
  ServiceRequest,
  Staff,
  Vehicle,
  WalkInRequest,
} from '@/types';

export interface Db {
  staff: Staff[];
  residentAccounts: ResidentAccount[];
  buildings: Building[];
  apartments: Apartment[];
  residents: Resident[];
  residencies: Residency[];
  memberRequests: MemberRequest[];
  vehicles: Vehicle[];
  cards: AccessCard[];
  guestPasses: GuestPass[];
  guests: Guest[];
  walkIns: WalkInRequest[];
  accessLogs: AccessLog[];
  prices: PriceConfig[];
  periods: BillingPeriod[];
  readings: MeterReading[];
  invoices: Invoice[];
  services: Service[];
  serviceRequests: ServiceRequest[];
  facilities: Facility[];
  bookings: FacilityBooking[];
  complaints: Complaint[];
  announcements: Announcement[];
}

export const VEHICLE_QUOTA = { CAR: 2, MOTORBIKE: 4 } as const;

// Deterministic PRNG so the demo data is the same on every load.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20261102);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM_M = ['Văn', 'Minh', 'Quốc', 'Đức', 'Thành', 'Hữu', 'Gia', 'Tuấn'];
const DEM_F = ['Thị', 'Thu', 'Ngọc', 'Thanh', 'Minh', 'Phương', 'Bảo'];
const TEN_M = ['Anh', 'Hùng', 'Nam', 'Long', 'Khoa', 'Tâm', 'Huy', 'Phong', 'Dũng', 'Quân', 'Sơn', 'Bảo', 'Khánh'];
const TEN_F = ['Hà', 'Lan', 'Mai', 'Linh', 'Trang', 'Yến', 'Hương', 'Ngân', 'Thảo', 'Vy', 'Hạnh', 'Nhung'];

const name = (g: 'MALE' | 'FEMALE', ho = pick(HO)) =>
  g === 'MALE' ? `${ho} ${pick(DEM_M)} ${pick(TEN_M)}` : `${ho} ${pick(DEM_F)} ${pick(TEN_F)}`;
const phone = () => `09${int(0, 9)}${pad(int(0, 9999999), 7)}`;
const cccd = (year: number) => `0${pad(int(1, 99))}${int(0, 1)}${String(year).slice(2)}${pad(int(0, 999999), 6)}`;

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const day = (offset: number) => toDayKey(addDays(now, offset));

export const DEMO_QR = 'MSH-DEMO-0001';

export function createSeed(): Db {
  const staff: Staff[] = [
    { id: 'st-admin', fullName: 'Phạm Quang Huy', phone: '0900000000', email: 'huy.pq@sunhome.vn', password: '123456', role: 'ADMIN', status: 'ACTIVE', createdAt: '2024-01-02T08:00:00Z' },
    { id: 'st-mgr', fullName: 'Lê Thu Trang', phone: '0900000001', email: 'trang.lt@sunhome.vn', password: '123456', role: 'MANAGER', status: 'ACTIVE', createdAt: '2024-01-05T08:00:00Z' },
    { id: 'st-sec', fullName: 'Trần Văn Bình', phone: '0900000002', email: 'binh.tv@sunhome.vn', password: '123456', role: 'SECURITY', status: 'ACTIVE', createdAt: '2024-02-01T08:00:00Z' },
    { id: 'st-sec2', fullName: 'Ngô Đức Thắng', phone: '0900000005', email: 'thang.nd@sunhome.vn', password: '123456', role: 'SECURITY', status: 'ACTIVE', createdAt: '2024-03-11T08:00:00Z' },
    { id: 'st-tech', fullName: 'Lê Hoàng', phone: '0900000003', email: 'hoang.l@sunhome.vn', password: '123456', role: 'TECHNICIAN', status: 'ACTIVE', createdAt: '2024-02-10T08:00:00Z' },
    { id: 'st-tech2', fullName: 'Đỗ Minh Khoa', phone: '0900000004', email: 'khoa.dm@sunhome.vn', password: '123456', role: 'TECHNICIAN', status: 'ACTIVE', createdAt: '2024-04-20T08:00:00Z' },
  ];

  const buildings: Building[] = [
    { id: 'b1', code: 'T1', name: 'Tòa T1', floors: 12 },
    { id: 'b2', code: 'T2', name: 'Tòa T2', floors: 12 },
    { id: 'b3', code: 'T3', name: 'Tòa T3', floors: 12 },
  ];

  const apartments: Apartment[] = [];
  const residents: Resident[] = [];
  const residencies: Residency[] = [];
  const vehicles: Vehicle[] = [];
  const cards: AccessCard[] = [];

  const TYPES = [
    { type: 'Studio', area: 42.5, bedrooms: 1 },
    { type: '2 phòng ngủ', area: 78.5, bedrooms: 2 },
    { type: '3 phòng ngủ', area: 102, bedrooms: 3 },
  ];
  const BRANDS: Record<'CAR' | 'MOTORBIKE', readonly (readonly [string, string])[]> = {
    CAR: [['Toyota', 'Camry'], ['Mazda', 'CX-5'], ['Honda', 'CR-V'], ['Hyundai', 'Tucson'], ['Kia', 'Seltos'], ['VinFast', 'VF 8']],
    MOTORBIKE: [['Honda', 'SH 150i'], ['Honda', 'Vision'], ['Yamaha', 'Grande'], ['Honda', 'Air Blade'], ['Piaggio', 'Liberty']],
  };

  let rCount = 0;
  let cardSeq = 12000;
  buildings.forEach((b, bi) => {
    for (const floor of [4, 6, 8, 10, 12, 14].map((f) => Math.min(f, 12)).filter((v, i, a) => a.indexOf(v) === i)) {
      for (let u = 1; u <= 5; u++) {
        const t = TYPES[(u + floor) % 3];
        const id = `a-${b.code}-${floor}-${u}`;
        const code = `S${bi === 2 ? 1 : bi + 2}-${pad(floor)}A${pad(u)}`;
        const occupied = rand() > 0.12;
        apartments.push({ id, code, buildingId: b.id, floor, type: t.type, area: t.area, bedrooms: t.bedrooms, status: occupied ? (rand() > 0.82 ? 'RENTED' : 'OCCUPIED') : 'VACANT' });
        if (!occupied) continue;

        const ho = pick(HO);
        const ownerG = rand() > 0.4 ? 'MALE' : 'FEMALE';
        const ownerYear = int(1965, 1992);
        const family: Resident[] = [
          { id: `r${++rCount}`, fullName: name(ownerG, ho), dateOfBirth: `${ownerYear}-${pad(int(1, 12))}-${pad(int(1, 28))}`, gender: ownerG, citizenId: cccd(ownerYear), phone: phone(), status: 'LIVING' },
        ];
        const relations: string[] = ['Chủ hộ'];
        if (rand() > 0.3) {
          const g = ownerG === 'MALE' ? 'FEMALE' : 'MALE';
          const y = ownerYear + int(-2, 4);
          family.push({ id: `r${++rCount}`, fullName: name(g), dateOfBirth: `${y}-${pad(int(1, 12))}-${pad(int(1, 28))}`, gender: g, citizenId: cccd(y), phone: phone(), status: 'LIVING' });
          relations.push(g === 'FEMALE' ? 'Vợ' : 'Chồng');
        }
        for (let k = 0; k < int(0, 2); k++) {
          const g = rand() > 0.5 ? 'MALE' : 'FEMALE';
          const y = int(2008, 2020);
          family.push({ id: `r${++rCount}`, fullName: name(g, ho), dateOfBirth: `${y}-${pad(int(1, 12))}-${pad(int(1, 28))}`, gender: g, citizenId: y <= 2011 ? cccd(y) : undefined, status: 'LIVING' });
          relations.push('Con');
        }
        family.forEach((r, i) => {
          residents.push(r);
          residencies.push({ id: `rs-${r.id}`, apartmentId: id, residentId: r.id, role: i === 0 ? 'OWNER' : 'MEMBER', relationToOwner: relations[i], fromDate: `${int(2019, 2025)}-${pad(int(1, 12))}-01`, active: true });
          if (r.citizenId) {
            cards.push({ id: `c${++cardSeq}`, cardNumber: `RC-${pad(cardSeq, 8)}`, cardType: 'RESIDENT', status: 'ACTIVE', issuedAt: '2024-03-02T08:00:00Z', apartmentId: id, holderName: r.fullName });
          }
        });

        const nCar = rand() > 0.55 ? 1 : 0;
        const nBike = int(0, 2);
        for (const [type, n] of [['CAR', nCar], ['MOTORBIKE', nBike]] as const) {
          for (let k = 0; k < n; k++) {
            const [brand, model] = pick(BRANDS[type]);
            const vid = `v-${id}-${type}-${k}`;
            const plate = type === 'CAR' ? `30${pick(['A', 'G', 'K'])}-${int(100, 999)}.${pad(int(0, 99))}` : `29${pick(['B1', 'H1', 'X3'])}-${int(100, 999)}.${pad(int(0, 99))}`;
            vehicles.push({ id: vid, apartmentId: id, ownerName: family[0].fullName, plateNumber: plate, vehicleType: type, brand, model, status: 'APPROVED', createdAt: '2024-03-05T09:00:00Z' });
            cards.push({ id: `c${++cardSeq}`, cardNumber: `VC-${pad(cardSeq, 8)}`, cardType: 'VEHICLE', status: 'ACTIVE', issuedAt: '2024-03-06T08:00:00Z', apartmentId: id, holderName: `${brand} ${model} · ${plate}`, vehicleId: vid });
          }
        }
      }
    }
  });

  // The resident from the mobile app demo lives in S1-12A05.
  const appApt = apartments.find((a) => a.code === 'S1-12A05')!;
  appApt.status = 'OCCUPIED';
  const appOwner = residencies.find((r) => r.apartmentId === appApt.id && r.role === 'OWNER');
  if (appOwner) {
    const res = residents.find((r) => r.id === appOwner.residentId)!;
    Object.assign(res, { fullName: 'Nguyễn Minh Anh', phone: '0901234567', citizenId: '001090012345', dateOfBirth: '1990-04-16', gender: 'MALE' });
  }

  const occupied = apartments.filter((a) => a.status !== 'VACANT');
  const ownerOf = (aptId: string) => {
    const rs = residencies.find((r) => r.apartmentId === aptId && r.role === 'OWNER' && r.active);
    return residents.find((r) => r.id === rs?.residentId);
  };

  // Pending vehicle registrations
  vehicles.push(
    { id: 'v-p1', apartmentId: appApt.id, ownerName: 'Nguyễn Minh Anh', plateNumber: '29H1-246.80', vehicleType: 'MOTORBIKE', brand: 'Yamaha', model: 'Grande', status: 'PENDING', createdAt: hoursAgo(20) },
    { id: 'v-p2', apartmentId: occupied[3].id, ownerName: ownerOf(occupied[3].id)!.fullName, plateNumber: '30K-552.18', vehicleType: 'CAR', brand: 'VinFast', model: 'VF 6', status: 'PENDING', createdAt: hoursAgo(6) },
    { id: 'v-p3', apartmentId: occupied[11].id, ownerName: ownerOf(occupied[11].id)!.fullName, plateNumber: '29X3-118.04', vehicleType: 'MOTORBIKE', brand: 'Honda', model: 'Vision', status: 'PENDING', createdAt: hoursAgo(2) },
  );

  const residentAccounts: ResidentAccount[] = [
    { id: 'ra1', phone: '0933000111', fullName: 'Hoàng Thị Yến', citizenId: '001192077777', apartmentCode: occupied[5].code, status: 'PENDING', createdAt: hoursAgo(3) },
    { id: 'ra2', phone: '0977123456', fullName: 'Vũ Đức Long', citizenId: '001088055555', apartmentCode: occupied[8].code, status: 'PENDING', createdAt: hoursAgo(9) },
    { id: 'ra3', phone: '0912777888', fullName: 'Lý Gia Bảo', citizenId: '001095033333', apartmentCode: 'S3-99Z99', status: 'PENDING', createdAt: hoursAgo(27) },
    { id: 'ra4', phone: '0901234567', fullName: 'Nguyễn Minh Anh', citizenId: '001090012345', apartmentCode: 'S1-12A05', status: 'ACTIVE', createdAt: '2024-03-02T08:00:00Z' },
  ];

  const memberRequests: MemberRequest[] = [
    { id: 'mr1', apartmentId: appApt.id, fullName: 'Nguyễn Thị Hồng', dateOfBirth: '1963-02-11', citizenId: '001163044444', relationToOwner: 'Mẹ', status: 'PENDING', createdAt: hoursAgo(12) },
    { id: 'mr2', apartmentId: occupied[14].id, fullName: 'Đặng Bảo Ngọc', dateOfBirth: '2019-08-30', relationToOwner: 'Con', status: 'PENDING', createdAt: hoursAgo(30) },
  ];

  // ---- Billing: six issued periods + the next one open for meter input ----
  const prices: PriceConfig[] = [
    { feeType: 'MANAGEMENT', unitPrice: 16_500, unit: 'đ/m²', effectiveFrom: '2026-01-01' },
    { feeType: 'PARKING_CAR', unitPrice: 1_500_000, unit: 'đ/xe/tháng', effectiveFrom: '2026-01-01' },
    { feeType: 'PARKING_MOTORBIKE', unitPrice: 120_000, unit: 'đ/xe/tháng', effectiveFrom: '2026-01-01' },
    { feeType: 'ELECTRIC', unitPrice: 2_950, unit: 'đ/kWh', effectiveFrom: '2026-01-01' },
    { feeType: 'WATER', unitPrice: 12_500, unit: 'đ/m³', effectiveFrom: '2026-01-01' },
  ];
  const price = (f: string) => prices.find((p) => p.feeType === f)!.unitPrice;

  const periods: BillingPeriod[] = [];
  const invoices: Invoice[] = [];
  const readings: MeterReading[] = [];
  const meter: Record<string, { e: number; w: number }> = {};
  occupied.forEach((a) => (meter[a.id] = { e: int(8000, 20000), w: int(400, 1200) }));

  for (let back = 6; back >= 1; back--) {
    const p = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const id = `${p.getFullYear()}-${pad(p.getMonth() + 1)}`;
    const issued = new Date(p.getFullYear(), p.getMonth() + 1, 1, 9);
    const due = toDayKey(new Date(p.getFullYear(), p.getMonth() + 1, 15));
    periods.push({ id, month: p.getMonth() + 1, year: p.getFullYear(), dueDate: due, issuedAt: issued.toISOString() });
    const dueDate = new Date(p.getFullYear(), p.getMonth() + 1, 15);
    occupied.forEach((a, i) => {
      const kwh = int(180, 480);
      const m3 = int(8, 24);
      meter[a.id].e += kwh;
      meter[a.id].w += m3;
      const cars = vehicles.filter((v) => v.apartmentId === a.id && v.status === 'APPROVED' && v.vehicleType === 'CAR').length;
      const bikes = vehicles.filter((v) => v.apartmentId === a.id && v.status === 'APPROVED' && v.vehicleType === 'MOTORBIKE').length;
      const items: InvoiceItem[] = [
        { feeType: 'MANAGEMENT', description: `${a.area} m²`, quantity: a.area, unitPrice: price('MANAGEMENT'), amount: Math.round(a.area * price('MANAGEMENT')) },
        ...(cars ? [{ feeType: 'PARKING_CAR' as const, description: `${cars} xe`, quantity: cars, unitPrice: price('PARKING_CAR'), amount: cars * price('PARKING_CAR') }] : []),
        ...(bikes ? [{ feeType: 'PARKING_MOTORBIKE' as const, description: `${bikes} xe`, quantity: bikes, unitPrice: price('PARKING_MOTORBIKE'), amount: bikes * price('PARKING_MOTORBIKE') }] : []),
        { feeType: 'ELECTRIC', description: `${kwh} kWh`, quantity: kwh, unitPrice: price('ELECTRIC'), amount: kwh * price('ELECTRIC') },
        { feeType: 'WATER', description: `${m3} m³`, quantity: m3, unitPrice: price('WATER'), amount: m3 * price('WATER') },
      ];
      if (rand() > 0.85) items.push({ feeType: 'SERVICE', description: 'Dọn dẹp căn hộ', quantity: 1, unitPrice: 250_000, amount: 250_000 });
      const total = items.reduce((s, x) => s + x.amount, 0);
      // Older periods are mostly paid; the latest period is still being collected.
      const paidChance = back === 1 ? 0.45 : back === 2 ? 0.88 : 0.97;
      const paid = rand() < paidChance;
      const status = paid ? 'PAID' : dueDate < now ? 'OVERDUE' : 'UNPAID';
      invoices.push({
        id: `inv-${id}-${i}`,
        apartmentId: a.id,
        periodId: id,
        items,
        totalAmount: total,
        status,
        dueDate: due,
        paidAt: paid ? new Date(issued.getTime() + int(1, 13) * 86_400_000).toISOString() : undefined,
        paymentMethod: paid ? (rand() > 0.3 ? 'GATEWAY' : 'COUNTER') : undefined,
      });
    });
  }
  const next = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextId = `${next.getFullYear()}-${pad(next.getMonth() + 1)}`;
  occupied.forEach((a, i) => {
    // About a third of the meters for the open period are already read.
    const done = i % 3 === 0;
    readings.push({
      apartmentId: a.id,
      period: nextId,
      electricPrev: meter[a.id].e,
      waterPrev: meter[a.id].w,
      electricCurr: done ? meter[a.id].e + int(180, 460) : undefined,
      waterCurr: done ? meter[a.id].w + int(8, 22) : undefined,
    });
  });

  // ---- Guests & access ----
  const guestPasses: GuestPass[] = [];
  const guests: Guest[] = [];
  const mkPass = (aptId: string, offset: number, start: string, end: string, list: [string, string, Guest['status'], string?][], via: GuestPass['createdVia'] = 'APP') => {
    const id = `gp${guestPasses.length + 1}`;
    guestPasses.push({ id, apartmentId: aptId, visitDate: day(offset), startTime: start, endTime: end, createdVia: via, createdAt: hoursAgo(20) });
    list.forEach(([n, p, s, qr], k) =>
      guests.push({
        id: `${id}-g${k}`,
        passId: id,
        fullName: n,
        phone: p,
        qrCode: qr ?? `MSH-${id.toUpperCase()}-${k}${int(1000, 9999)}`,
        status: s,
        checkedInAt: s === 'INSIDE' || s === 'LEFT' ? hoursAgo(int(1, 3)) : undefined,
        checkedOutAt: s === 'LEFT' ? hoursAgo(0.5) : undefined,
      }),
    );
  };
  mkPass(appApt.id, 0, '08:00', '22:00', [['Phạm Quốc Nam', '0912678345', 'WAITING', DEMO_QR], ['Đỗ Thanh Mai', '0987456123', 'WAITING']]);
  mkPass(occupied[2].id, 0, '09:00', '12:00', [['Vũ Đức Long', '0977222333', 'INSIDE']], 'AI');
  mkPass(occupied[7].id, 0, '14:00', '18:00', [['Bùi Thị Hạnh', '0903111222', 'WAITING'], ['Lê Văn Sơn', '0903111333', 'WAITING'], ['Lê Gia Huy', '0903111444', 'WAITING']]);
  mkPass(occupied[9].id, 0, '07:00', '10:00', [['Ngô Thanh Tùng', '0939555666', 'LEFT']]);
  mkPass(occupied[16].id, 1, '18:00', '21:00', [['Hồ Ngọc Ánh', '0905888999', 'WAITING']]);

  const walkIns: WalkInRequest[] = [
    { id: 'w1', apartmentId: appApt.id, guestName: 'Bùi Văn Tâm', guestPhone: '0934567890', gate: 'Sảnh chính tòa T3', status: 'PENDING', createdAt: hoursAgo(0.07), expiresAt: new Date(now.getTime() + 26 * 60_000).toISOString(), createdBy: 'st-sec' },
    { id: 'w2', apartmentId: occupied[4].id, guestName: 'Shipper Giao Hàng Nhanh', guestPhone: '0966111000', gate: 'Sảnh tòa T1', status: 'APPROVED', createdAt: hoursAgo(2), expiresAt: hoursAgo(1.5), createdBy: 'st-sec' },
  ];

  const GATES = ['Cổng chính', 'Sảnh tòa T1', 'Sảnh tòa T2', 'Sảnh chính tòa T3', 'Hầm B1'];
  const accessLogs: AccessLog[] = [];
  for (let d = 13; d >= 0; d--) {
    const weekend = [0, 6].includes(addDays(now, -d).getDay());
    const n = int(weekend ? 150 : 110, weekend ? 210 : 170);
    for (let k = 0; k < n; k++) {
      const t = new Date(addDays(now, -d));
      t.setHours(int(6, 22), int(0, 59), 0, 0);
      if (t > now) continue;
      const kind = rand();
      const method = kind < 0.82 ? 'CARD' : kind < 0.95 ? 'QR' : 'WALK_IN';
      const apt = pick(occupied);
      const vehicle = method === 'CARD' && rand() > 0.6;
      accessLogs.push({
        id: `log${accessLogs.length}`,
        time: t.toISOString(),
        gate: vehicle ? 'Hầm B1' : pick(GATES.slice(0, 4)),
        direction: rand() > 0.5 ? 'IN' : 'OUT',
        method,
        subjectType: method === 'CARD' ? (vehicle ? 'VEHICLE' : 'RESIDENT') : 'GUEST',
        subjectName: method === 'CARD' ? (ownerOf(apt.id)?.fullName ?? 'Cư dân') : name(rand() > 0.5 ? 'MALE' : 'FEMALE'),
        apartmentId: apt.id,
        result: rand() > 0.985 ? 'DENIED' : 'ACCEPTED',
        staffId: method === 'CARD' ? undefined : 'st-sec',
      });
    }
  }
  accessLogs.sort((a, b) => b.time.localeCompare(a.time));

  // ---- Services, facilities, complaints ----
  const services: Service[] = [
    { id: 's1', name: 'Dọn dẹp căn hộ', description: 'Vệ sinh tổng thể, khoảng 3 giờ', price: 250_000, unit: 'lượt', active: true },
    { id: 's2', name: 'Vệ sinh điều hòa', description: 'Tháo rửa dàn lạnh, kiểm tra gas', price: 300_000, unit: 'máy', active: true },
    { id: 's3', name: 'Sửa chữa điện nước', description: 'Khắc phục sự cố điện, nước trong căn hộ', price: 150_000, unit: 'lượt', active: true },
    { id: 's4', name: 'Giặt sofa, rèm cửa', description: 'Giặt hơi nước tại chỗ', price: 450_000, unit: 'bộ', active: true },
    { id: 's5', name: 'Hỗ trợ chuyển đồ', description: 'Thang máy chở hàng và nhân sự hỗ trợ', price: 500_000, unit: 'lượt', active: true },
    { id: 's6', name: 'Diệt côn trùng', description: 'Phun xử lý muỗi, gián, kiến', price: 350_000, unit: 'lượt', active: false },
  ];

  const SR_DESC: Record<string, string[]> = {
    s1: ['Dọn dẹp tổng thể trước Tết', 'Dọn dẹp sau khi sửa nhà'],
    s2: ['Vệ sinh 2 máy điều hòa phòng ngủ', 'Điều hòa phòng khách chảy nước'],
    s3: ['Vòi sen phòng tắm rỉ nước', 'Ổ cắm bếp bị chập'],
    s4: ['Giặt bộ sofa 3 chỗ', 'Giặt rèm phòng khách'],
    s5: ['Chuyển đồ vào căn hộ mới'],
  };
  const srStatuses: ServiceRequest['status'][] = ['NEW', 'NEW', 'NEW', 'ACCEPTED', 'ACCEPTED', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
  const serviceRequests: ServiceRequest[] = srStatuses.map((status, i) => {
    const sid = pick(['s1', 's2', 's3', 's4', 's5']);
    const created = 6 + i * 13;
    const flow: ServiceRequest['status'][] = ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
    const steps = status === 'CANCELLED' ? ['NEW', 'CANCELLED'] : flow.slice(0, flow.indexOf(status) + 1);
    return {
      id: `sr${i + 1}`,
      apartmentId: i === 5 ? appApt.id : pick(occupied).id,
      serviceId: sid,
      description: pick(SR_DESC[sid]),
      preferredTime: new Date(now.getTime() + (24 - i * 9) * 3_600_000).toISOString(),
      scheduledTime: status !== 'NEW' && status !== 'CANCELLED' ? new Date(now.getTime() + (26 - i * 9) * 3_600_000).toISOString() : undefined,
      assignee: status !== 'NEW' && status !== 'CANCELLED' ? pick(['Lê Hoàng', 'Đỗ Minh Khoa', 'Đội vệ sinh']) : undefined,
      status,
      cancelReason: status === 'CANCELLED' ? 'Không bố trí được nhân sự trong khung giờ yêu cầu' : undefined,
      history: steps.map((s, k) => ({ status: s as ServiceRequest['status'], at: hoursAgo(created - k * 3) })),
      createdAt: hoursAgo(created),
    };
  });

  const facilities: Facility[] = [
    { id: 'f1', name: 'Hồ bơi bốn mùa', location: 'Tầng 5, tòa T1', capacityPerSlot: 30, pricePerBooking: 0, openHour: 8, closeHour: 17, active: true },
    { id: 'f2', name: 'Phòng gym', location: 'Tầng 3, tòa T3', capacityPerSlot: 20, pricePerBooking: 0, openHour: 8, closeHour: 17, active: true },
    { id: 'f3', name: 'Sân pickleball', location: 'Khu thể thao phía Đông', capacityPerSlot: 4, pricePerBooking: 120_000, openHour: 8, closeHour: 17, active: true },
    { id: 'f4', name: 'Sân tennis', location: 'Khu thể thao phía Đông', capacityPerSlot: 4, pricePerBooking: 150_000, openHour: 8, closeHour: 17, active: true },
    { id: 'f5', name: 'Khu BBQ ven hồ', location: 'Công viên nội khu', capacityPerSlot: 10, pricePerBooking: 300_000, openHour: 8, closeHour: 17, active: true },
    { id: 'f6', name: 'Phòng sinh hoạt cộng đồng', location: 'Tầng 2, tòa T1', capacityPerSlot: 40, pricePerBooking: 500_000, openHour: 8, closeHour: 17, active: true },
  ];
  const bookings: FacilityBooking[] = Array.from({ length: 22 }, (_, i) => {
    const f = facilities[i % facilities.length];
    const offset = int(-4, 5);
    return {
      id: `bk${i + 1}`,
      facilityId: f.id,
      apartmentId: i === 0 ? appApt.id : pick(occupied).id,
      date: day(offset),
      slotStart: `${pad(int(8, 16))}:00`,
      people: f.capacityPerSlot <= 4 ? 4 : int(1, Math.min(8, f.capacityPerSlot)),
      payMode: f.pricePerBooking && rand() > 0.5 ? 'PAY_NOW' : 'ON_INVOICE',
      status: offset < 0 ? 'PAST' : rand() > 0.9 ? 'CANCELLED' : 'BOOKED',
      amount: f.pricePerBooking,
    };
  });

  const CP: [Complaint['category'], string, string, string][] = [
    ['TECHNICAL', 'Đèn hành lang tầng 12 không sáng', 'Hai bóng đèn gần thang máy số 2 tắt từ tối qua.', 'Hành lang tầng 12, tòa T3'],
    ['SECURITY', 'Tiếng ồn sửa chữa sau 22 giờ', 'Căn tầng trên khoan tường sau 22 giờ nhiều ngày liên tiếp.', 'Tầng 13, tòa T3'],
    ['CLEANING', 'Thùng rác tầng hầm B1 đầy', 'Khu tập kết rác B1 chưa được thu gom.', 'Hầm B1, tòa T3'],
    ['TECHNICAL', 'Thang máy số 1 tòa T2 rung lắc', 'Thang rung mạnh khi dừng ở tầng 8.', 'Thang máy số 1, tòa T2'],
    ['TECHNICAL', 'Rò nước trần nhà tắm', 'Trần nhà tắm có vết thấm, nghi rò từ căn trên.', 'Căn hộ'],
    ['CLEANING', 'Sảnh tòa T1 có mùi ẩm', 'Thảm sảnh ẩm, mùi khó chịu buổi sáng.', 'Sảnh tòa T1'],
    ['OTHER', 'Đề xuất thêm giá để xe đạp', 'Khu để xe đạp hầm B1 đã kín chỗ.', 'Hầm B1'],
    ['SECURITY', 'Người lạ ra vào hầm xe', 'Thấy người không quẹt thẻ đi theo xe vào hầm.', 'Hầm B1, cổng phụ'],
    ['TECHNICAL', 'Vòi nước khu BBQ hỏng', 'Vòi rửa tại khu BBQ không đóng được.', 'Khu BBQ ven hồ'],
    ['CLEANING', 'Lá cây ứ đọng lối đi công viên', 'Lối đi bộ quanh hồ nhiều lá, trơn trượt.', 'Công viên nội khu'],
  ];
  const cpStatuses: Complaint['status'][] = ['RESOLVED', 'ASSIGNED', 'CLOSED', 'NEW', 'IN_PROGRESS', 'NEW', 'NEW', 'IN_PROGRESS', 'REOPENED', 'CLOSED'];
  const complaints: Complaint[] = CP.map(([category, title, content, location], i) => {
    const status = cpStatuses[i];
    const flow: Complaint['status'][] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const created = 4 + i * 17;
    const steps: Complaint['status'][] = status === 'REOPENED' ? ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED'] : flow.slice(0, flow.indexOf(status) + 1);
    const apt = i < 3 ? appApt : pick(occupied);
    const tech = category === 'TECHNICAL';
    return {
      id: `cp${i + 1}`,
      apartmentId: apt.id,
      reporterName: ownerOf(apt.id)?.fullName ?? 'Cư dân',
      title,
      content,
      location,
      category,
      status,
      assigneeId: status !== 'NEW' && tech ? (i % 2 === 0 ? 'st-tech' : 'st-tech2') : undefined,
      external: status !== 'NEW' && !tech ? pick(['Đội vệ sinh', 'Đội bảo vệ', 'Ban quản lý']) : undefined,
      resultNote: ['RESOLVED', 'CLOSED', 'REOPENED'].includes(status) ? 'Đã xử lý và kiểm tra lại hiện trường.' : undefined,
      history: steps.map((s, k) => ({ status: s, at: hoursAgo(created - k * Math.min(3, created / 6)) })),
      createdAt: hoursAgo(created),
    };
  });

  const announcements: Announcement[] = [
    { id: 'an1', kind: 'TARGETED', category: 'MAINTENANCE', scope: 'Tòa T3', pinned: true, publishedAt: hoursAgo(5), author: 'Lê Thu Trang', title: 'Bảo trì thang máy tòa T3', content: 'Thang máy số 3 tòa T3 tạm dừng từ 08:00 đến 11:00 để bảo trì định kỳ. Cư dân vui lòng sử dụng thang số 1 và 2.' },
    { id: 'an2', kind: 'GENERAL', category: 'EVENT', scope: 'Toàn khu', publishedAt: hoursAgo(28), author: 'Lê Thu Trang', title: 'Đêm nhạc acoustic cuối tuần', content: 'Mời cư dân tham gia đêm nhạc acoustic lúc 19:30 tối thứ Bảy tại quảng trường trung tâm.' },
    { id: 'an3', kind: 'GENERAL', category: 'PROMOTION', scope: 'Toàn khu', publishedAt: hoursAgo(50), author: 'Lê Thu Trang', title: 'Ưu đãi cư dân tháng 11', content: 'Giảm 20% dịch vụ dọn dẹp căn hộ và giặt sofa khi đặt qua ứng dụng.' },
    { id: 'an4', kind: 'TARGETED', category: 'NOTICE', scope: 'Tòa T3', publishedAt: hoursAgo(75), author: 'Lê Thu Trang', title: 'Phun thuốc muỗi định kỳ', content: 'Phun thuốc phòng muỗi tại công viên và hành lang tòa T3 từ 07:00 đến 09:00 sáng Chủ nhật.' },
  ];

  return {
    staff, residentAccounts, buildings, apartments, residents, residencies, memberRequests, vehicles, cards,
    guestPasses, guests, walkIns, accessLogs, prices, periods, readings, invoices, services, serviceRequests,
    facilities, bookings, complaints, announcements,
  };
}
