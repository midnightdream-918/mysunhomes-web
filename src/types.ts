/** Domain model — follows the class diagram (Hình 3.2.3.1) and enums (Hình 3.2.3.2). */

export type StaffRole = 'MANAGER' | 'ADMIN' | 'SECURITY' | 'TECHNICIAN';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'LOCKED';
export type ApartmentRole = 'OWNER' | 'MEMBER';
export type ApartmentStatus = 'VACANT' | 'OCCUPIED' | 'RENTED';
export type ResidentStatus = 'LIVING' | 'MOVED_OUT';
export type Gender = 'MALE' | 'FEMALE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type VehicleType = 'CAR' | 'MOTORBIKE';
export type VehicleStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type CardType = 'RESIDENT' | 'VEHICLE';
export type CardStatus = 'ACTIVE' | 'LOCKED';
export type GuestStatus = 'WAITING' | 'INSIDE' | 'LEFT' | 'EXPIRED' | 'CANCELLED';
export type Direction = 'IN' | 'OUT';
export type AccessMethod = 'CARD' | 'QR' | 'WALK_IN';
export type SubjectType = 'RESIDENT' | 'GUEST' | 'VEHICLE';
export type FeeType = 'MANAGEMENT' | 'PARKING_CAR' | 'PARKING_MOTORBIKE' | 'ELECTRIC' | 'WATER' | 'SERVICE' | 'FACILITY';
export type InvoiceStatus = 'UNPAID' | 'OVERDUE' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'GATEWAY' | 'COUNTER';
export type ServiceStatus = 'NEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PayMode = 'ON_INVOICE' | 'PAY_NOW';
export type BookingStatus = 'BOOKED' | 'CANCELLED' | 'PAST';
export type ComplaintCategory = 'TECHNICAL' | 'CLEANING' | 'SECURITY' | 'OTHER';
export type ComplaintStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
export type AnnouncementKind = 'GENERAL' | 'TARGETED';
export type AnnouncementCategory = 'EVENT' | 'NOTICE' | 'PROMOTION' | 'MAINTENANCE';

export interface Staff {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  password: string; // mock only
  role: StaffRole;
  status: 'ACTIVE' | 'LOCKED';
  createdAt: string;
}

export interface ResidentAccount {
  id: string;
  phone: string;
  fullName: string;
  citizenId: string;
  apartmentCode: string;
  status: AccountStatus;
  residentId?: string;
  rejectReason?: string;
  createdAt: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  floors: number;
}

export interface Apartment {
  id: string;
  code: string;
  buildingId: string;
  floor: number;
  type: string;
  area: number;
  bedrooms: number;
  status: ApartmentStatus;
}

export interface Resident {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  citizenId?: string;
  phone?: string;
  email?: string;
  status: ResidentStatus;
}

export interface Residency {
  id: string;
  apartmentId: string;
  residentId: string;
  role: ApartmentRole;
  relationToOwner: string;
  fromDate: string;
  toDate?: string;
  active: boolean;
}

export interface MemberRequest {
  id: string;
  apartmentId: string;
  fullName: string;
  dateOfBirth: string;
  citizenId?: string;
  relationToOwner: string;
  status: RequestStatus;
  rejectReason?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  apartmentId: string;
  ownerName: string;
  plateNumber: string;
  vehicleType: VehicleType;
  brand: string;
  model: string;
  status: VehicleStatus;
  rejectReason?: string;
  createdAt: string;
}

export interface AccessCard {
  id: string;
  cardNumber: string;
  cardType: CardType;
  status: CardStatus;
  issuedAt: string;
  apartmentId: string;
  holderName: string;
  vehicleId?: string;
  note?: string;
}

export interface GuestPass {
  id: string;
  apartmentId: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  createdVia: 'APP' | 'AI' | 'WALK_IN';
  createdAt: string;
}

export interface Guest {
  id: string;
  passId: string;
  fullName: string;
  phone: string;
  qrCode: string;
  status: GuestStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export interface WalkInRequest {
  id: string;
  apartmentId: string;
  guestName: string;
  guestPhone: string;
  gate: string;
  status: RequestStatus;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
}

export interface AccessLog {
  id: string;
  time: string;
  gate: string;
  direction: Direction;
  method: AccessMethod;
  subjectType: SubjectType;
  subjectName: string;
  apartmentId?: string;
  result: 'ACCEPTED' | 'DENIED';
  staffId?: string;
}

export interface MeterReading {
  apartmentId: string;
  period: string; // YYYY-MM
  electricPrev: number;
  electricCurr?: number;
  waterPrev: number;
  waterCurr?: number;
}

export interface PriceConfig {
  feeType: FeeType;
  unitPrice: number;
  unit: string;
  effectiveFrom: string;
}

export interface BillingPeriod {
  id: string; // YYYY-MM
  month: number;
  year: number;
  dueDate: string;
  issuedAt: string;
}

export interface InvoiceItem {
  feeType: FeeType;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  apartmentId: string;
  periodId: string;
  items: InvoiceItem[];
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  active: boolean;
}

export interface StatusStep<S extends string> {
  status: S;
  at: string;
  note?: string;
  by?: string;
}

export interface ServiceRequest {
  id: string;
  apartmentId: string;
  serviceId: string;
  description: string;
  preferredTime: string;
  scheduledTime?: string;
  assignee?: string;
  status: ServiceStatus;
  cancelReason?: string;
  history: StatusStep<ServiceStatus>[];
  createdAt: string;
}

export interface Facility {
  id: string;
  name: string;
  location: string;
  capacityPerSlot: number;
  pricePerBooking: number;
  openHour: number;
  closeHour: number;
  active: boolean;
}

export interface FacilityBooking {
  id: string;
  facilityId: string;
  apartmentId: string;
  date: string;
  slotStart: string;
  people: number;
  payMode: PayMode;
  status: BookingStatus;
  amount: number;
}

export interface Complaint {
  id: string;
  apartmentId: string;
  reporterName: string;
  title: string;
  content: string;
  location: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  assigneeId?: string;
  external?: string;
  resultNote?: string;
  history: StatusStep<ComplaintStatus>[];
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  kind: AnnouncementKind;
  category: AnnouncementCategory;
  scope: string; // "Toàn khu" or building code(s)
  publishedAt: string;
  author: string;
  pinned?: boolean;
}
