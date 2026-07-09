# Chính sách bảo mật — VietFuelAPI

> Cập nhật lần cuối: 26 tháng 4, 2026

---

## 1. Nguyên tắc cốt lõi

VietFuelAPI được xây dựng trên nguyên tắc **tối giản hóa dữ liệu (Data Minimization)**. Chúng tôi chỉ thu thập những gì thực sự cần thiết để vận hành dịch vụ và không sử dụng bất kỳ dữ liệu nào cho mục đích quảng cáo.

---

## 2. Dữ liệu từ người dùng API

Chúng tôi **KHÔNG** thu thập thông tin cá nhân (tên, email, số điện thoại…). Khi bạn thực hiện yêu cầu đến API, các thông tin kỹ thuật sau có thể được ghi lại tạm thời phục vụ vận hành:

| Thông tin | Mục đích | Thời gian lưu |
|:---|:---|:---|
| Địa chỉ IP | Rate limiting, chặn tấn công DDoS | Tối đa 24 giờ (rolling window) |
| User-Agent | Phân loại client, debug | Tối đa 24 giờ |
| Endpoint & timestamp | Phân tích tải hệ thống | Tối đa 7 ngày |
| HTTP Status Code | Phát hiện lỗi | Tối đa 7 ngày |

Các log này **không được chia sẻ** với bên thứ ba và tự động xóa sau thời hạn trên.

---

## 3. Dữ liệu từ bot scraping

Bot `VietFuelBot/1.0` thu thập dữ liệu từ các nguồn công khai. Chúng tôi cam kết:

- **Không thu thập** bất kỳ thông tin nào ngoài dữ liệu giá xăng dầu công khai.
- **Không yêu cầu xác thực**: API mở công khai.
- **Lưu trữ lịch sử**: Dữ liệu giá các kỳ điều chỉnh được lưu cục bộ trong D1/SQLite để thống kê, không lưu thông tin người truy cập.
- **Không truy cập** các vùng dữ liệu yêu cầu đăng nhập hoặc không công khai.
- **Tuân thủ robots.txt** của các trang nguồn.

---

## 4. Dữ liệu lưu trữ phía trình duyệt

Trang web này có thể lưu các thông tin sau trong **trình duyệt của bạn** (localStorage) — hoàn toàn không gửi về server:

| Khoá localStorage | Nội dung | Mục đích |
|:---|:---|:---|
| `lang` | `"vi"` hoặc `"en"` | Ghi nhớ ngôn ngữ hiển thị |

Bạn có thể xóa thủ công trong DevTools của trình duyệt.

---

## 5. Chia sẻ dữ liệu với bên thứ ba

Chúng tôi **không bao giờ** bán, cho thuê hoặc chia sẻ thông tin người dùng với bên thứ ba, ngoại trừ:

- Yêu cầu bắt buộc chính thức từ cơ quan pháp luật có thẩm quyền theo pháp luật Việt Nam.
- Tình huống cần bảo vệ an toàn hệ thống khỏi tấn công nghiêm trọng (thông báo trước nếu có thể).

---

## 6. Tuân thủ pháp lý

Chính sách này tuân thủ:
- **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân tại Việt Nam.
- **Luật An toàn thông tin mạng 2015**.

---

## 7. Liên hệ về quyền riêng tư

Nếu bạn có câu hỏi hoặc yêu cầu liên quan đến quyền riêng tư, vui lòng tạo issue trên GitHub: [github.com/TranQui004/vietfuel-api/issues](https://github.com/TranQui004/vietfuel-api/issues)

---

🔗 [Trở về chỉ mục pháp lý](README.md) | [English →](../../en/legal/privacy.md)