import type {
  AccessMethod,
  AccountStatus,
  AnnouncementCategory,
  ApartmentStatus,
  BookingStatus,
  CardStatus,
  ComplaintCategory,
  ComplaintStatus,
  FeeType,
  GuestStatus,
  InvoiceStatus,
  RequestStatus,
  ServiceStatus,
  StaffRole,
  VehicleStatus,
  VehicleType,
} from '@/types';

export type Tone = 'neutral' | 'amber' | 'green' | 'blue' | 'red' | 'terracotta' | 'plum';
type Meta = { label: string; tone: Tone };

export const staffRole: Record<StaffRole, string> = {
  MANAGER: 'Quản lý',
  ADMIN: 'Quản trị viên',
  SECURITY: 'An ninh',
  TECHNICIAN: 'Kỹ thuật viên',
};

export const accountStatus: Record<AccountStatus, Meta> = {
  PENDING: { label: 'Chờ duyệt', tone: 'amber' },
  ACTIVE: { label: 'Hoạt động', tone: 'green' },
  REJECTED: { label: 'Bị từ chối', tone: 'red' },
  LOCKED: { label: 'Đã khóa', tone: 'neutral' },
};

export const apartmentStatus: Record<ApartmentStatus, Meta> = {
  VACANT: { label: 'Trống', tone: 'neutral' },
  OCCUPIED: { label: 'Đang ở', tone: 'green' },
  RENTED: { label: 'Cho thuê', tone: 'blue' },
};

export const requestStatus: Record<RequestStatus, Meta> = {
  PENDING: { label: 'Chờ duyệt', tone: 'amber' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
  REJECTED: { label: 'Bị từ chối', tone: 'red' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
};

export const vehicleStatus: Record<VehicleStatus, Meta> = {
  PENDING: { label: 'Chờ duyệt', tone: 'amber' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
  REJECTED: { label: 'Bị từ chối', tone: 'red' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
};

export const vehicleType: Record<VehicleType, string> = { CAR: 'Ô tô', MOTORBIKE: 'Xe máy' };

export const cardStatus: Record<CardStatus, Meta> = {
  ACTIVE: { label: 'Hoạt động', tone: 'green' },
  LOCKED: { label: 'Đã khóa', tone: 'red' },
};

export const guestStatus: Record<GuestStatus, Meta> = {
  WAITING: { label: 'Chờ đến', tone: 'amber' },
  INSIDE: { label: 'Đang trong khu', tone: 'green' },
  LEFT: { label: 'Đã ra', tone: 'blue' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
};

export const accessMethod: Record<AccessMethod, string> = { CARD: 'Quẹt thẻ', QR: 'Mã QR', WALK_IN: 'Walk-in' };

export const invoiceStatus: Record<InvoiceStatus, Meta> = {
  UNPAID: { label: 'Chưa thanh toán', tone: 'amber' },
  OVERDUE: { label: 'Quá hạn', tone: 'red' },
  PAID: { label: 'Đã thanh toán', tone: 'green' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
};

export const feeType: Record<FeeType, string> = {
  MANAGEMENT: 'Phí quản lý',
  PARKING_CAR: 'Gửi xe ô tô',
  PARKING_MOTORBIKE: 'Gửi xe máy',
  ELECTRIC: 'Tiền điện',
  WATER: 'Tiền nước',
  SERVICE: 'Dịch vụ',
  FACILITY: 'Tiện ích',
};

export const serviceStatus: Record<ServiceStatus, Meta> = {
  NEW: { label: 'Mới', tone: 'amber' },
  ACCEPTED: { label: 'Đã tiếp nhận', tone: 'blue' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'plum' },
  COMPLETED: { label: 'Hoàn thành', tone: 'green' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
};

export const bookingStatus: Record<BookingStatus, Meta> = {
  BOOKED: { label: 'Đã đặt', tone: 'green' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  PAST: { label: 'Đã qua', tone: 'blue' },
};

export const complaintStatus: Record<ComplaintStatus, Meta> = {
  NEW: { label: 'Mới', tone: 'amber' },
  ASSIGNED: { label: 'Đã phân công', tone: 'blue' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'plum' },
  RESOLVED: { label: 'Đã xử lý', tone: 'green' },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' },
  REOPENED: { label: 'Mở lại', tone: 'red' },
};

export const complaintCategory: Record<ComplaintCategory, string> = {
  TECHNICAL: 'Kỹ thuật',
  CLEANING: 'Vệ sinh',
  SECURITY: 'An ninh',
  OTHER: 'Khác',
};

export const announcementCategory: Record<AnnouncementCategory, string> = {
  EVENT: 'Sự kiện',
  NOTICE: 'Thông báo',
  PROMOTION: 'Ưu đãi',
  MAINTENANCE: 'Bảo trì',
};
