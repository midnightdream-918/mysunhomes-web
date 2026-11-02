# My SunHome — Web quản lý

Web dành cho nhân viên Ban quản lý (Quản lý, Quản trị viên, An ninh, Kỹ thuật viên) của hệ thống My SunHome. Dùng chung hệ màu và font với ứng dụng cư dân `mysunhomes-app`.

React 19 + Vite + TypeScript, Tailwind CSS 4, React Router, Zustand, Recharts.

## Chạy

Yêu cầu Node.js 22.13 trở lên.

```bash
npm install
npm run dev      # mở http://localhost:5173
```

`npm run build` kiểm tra kiểu và đóng gói vào `dist/`.

Tài khoản dùng thử (mật khẩu `123456`), có nút điền nhanh ở trang đăng nhập:

| Vai trò | Số điện thoại | Thấy gì |
| --- | --- | --- |
| Quản lý | 0900000001 | Toàn bộ nghiệp vụ trừ quản lý nhân viên |
| Quản trị viên | 0900000000 | Như Quản lý, thêm trang Nhân viên |
| An ninh | 0900000002 | Chỉ trang Ra vào & khách |
| Kỹ thuật viên | 0900000003 | Chỉ phản ánh được giao cho mình |

## Chức năng

| Trang | Nội dung |
| --- | --- |
| Tổng quan | 4 chỉ số chính, việc cần xử lý, thu phí 6 kỳ, lượt ra vào 14 ngày |
| Phê duyệt | Tài khoản cư dân (đối chiếu CCCD), thêm thành viên, đăng ký xe kèm cấp thẻ |
| Căn hộ & cư dân | Danh sách căn hộ, chi tiết căn, thêm cư dân, chuyển đi, đổi chủ hộ |
| Phương tiện & thẻ | Xe đã đăng ký, hủy đăng ký; cấp, khóa, cấp lại thẻ |
| Ra vào & khách | Kiểm tra mã QR (gõ tay, máy quét USB hoặc camera), khách walk-in 30 phút, nhật ký ra vào |
| Hóa đơn & thu phí | Hóa đơn theo kỳ, ghi nhận thu tại quầy, hủy và phát hành lại; nhập chỉ số công tơ; phát hành kỳ; bảng đơn giá |
| Dịch vụ | Bảng theo trạng thái: tiếp nhận, phân người, hẹn lịch, hoàn thành; danh mục dịch vụ |
| Tiện ích | Sức chứa, giá, mở/đóng tiện ích; lịch đặt |
| Phản ánh | Phân công, nhận việc, hoàn tất, đóng hoặc mở lại; lịch sử trạng thái |
| Bảng tin | Đăng tin toàn khu hoặc theo tòa, ghim, sửa, gỡ |
| Báo cáo | Thu phí & công nợ, ra vào & khách, xử lý phản ánh; xuất Excel (CSV) |
| Nhân viên | Tạo tài khoản, khóa/mở khóa (chỉ Quản trị viên) |

Mã QR thử ở trang Ra vào: `MSH-DEMO-0001`. Khách walk-in có nút giả lập cư dân đồng ý/từ chối, vì phản hồi thật đến từ ứng dụng cư dân.

## Cấu trúc

```
src/
  pages/           Mỗi trang một file
  layout/          Khung chính, menu theo vai trò
  components/      ui.tsx (nút, bảng, hộp thoại, ngăn kéo...), charts.tsx
  store.ts         Dữ liệu và các nghiệp vụ (backend giả lập)
  data/seed.ts     Dữ liệu mẫu, sinh cố định mỗi lần tải
  types.ts         Kiểu dữ liệu theo biểu đồ lớp
  lib/             Định dạng tiếng Việt, nhãn trạng thái
```

Dữ liệu nằm trong bộ nhớ trình duyệt nên tải lại trang sẽ về dữ liệu mẫu ban đầu. Mỗi hàm trong `src/store.ts` tương ứng một ca sử dụng trong bản phân tích; khi có backend, thay thân các hàm đó bằng lời gọi API.
