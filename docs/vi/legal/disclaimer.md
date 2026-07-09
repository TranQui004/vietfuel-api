# Tuyên bố từ chối trách nhiệm — VietFuelAPI

> Cập nhật lần cuối: 26 tháng 4, 2026

---

## 1. Tính chất dự án

VietFuelAPI là dự án **cộng đồng, phi lợi nhuận**, được xây dựng và duy trì bởi các lập trình viên tình nguyện. Dự án không có bất kỳ mối liên hệ chính thức nào với Petrolimex, PVOil, Mipec, Bộ Công Thương, hay bất kỳ cơ quan nhà nước nào tại Việt Nam.

---

## 2. Giới hạn độ chính xác của dữ liệu

Dữ liệu do VietFuelAPI cung cấp được tổng hợp tự động từ **11 nguồn công khai**. Chúng tôi cam kết cố gắng tối đa để dữ liệu phản ánh đúng thực tế, nhưng **không thể đảm bảo**:

- **Tính chính xác tuyệt đối**: Dữ liệu có thể sai lệch do lỗi scraping hoặc thay đổi cấu trúc website nguồn.
- **Tính đầy đủ**: Một số kỳ điều chỉnh giá có thể phản ánh chậm (độ trễ tối đa ~15 phút vào Thứ Năm, tối đa 6 tiếng các ngày còn lại).
- **Tính liên tục**: Dịch vụ có thể gián đoạn khi nguồn gốc triển khai biện pháp chặn hoặc thay đổi cấu trúc dữ liệu.

Khi nguồn gặp sự cố, API sẽ phục vụ **Stale Cache** và đánh dấu rõ ràng bằng cờ `"isStale": true` trong phản hồi JSON.

---

## 3. Miễn trừ trách nhiệm sử dụng

Người dùng **tự chịu hoàn toàn trách nhiệm** khi sử dụng dữ liệu từ VietFuelAPI cho các quyết định:

- Tài chính và đầu tư
- Kinh doanh và thương mại
- Pháp lý và hành chính
- Vận tải và logistics

**Để tra cứu giá chính thức**, vui lòng truy cập:
- Petrolimex: [petrolimex.com.vn](https://www.petrolimex.com.vn)
- PVOil: [pvoil.com.vn](https://www.pvoil.com.vn)
- Cổng thông tin Bộ Công Thương: [moit.gov.vn](https://www.moit.gov.vn)

---

## 4. Phương thức thu thập dữ liệu

VietFuelAPI thu thập dữ liệu theo phương thức:

- **Bot User-Agent công khai**: `VietFuelBot/1.0 (Community non-profit; +https://github.com/TranQui004/vietfuel-api)` — cho phép quản trị viên nguồn nhận diện và liên hệ.
- **Tần suất hợp lý**: Theo lịch adaptive căn chỉnh theo Nghị định 80/2023/NĐ-CP (tối đa 15 phút/lần vào Thứ Năm, 4–6 tiếng các ngày khác).
- **Lưu trữ lịch sử**: Dữ liệu giá các kỳ điều chỉnh được lưu cục bộ trong D1/SQLite để thống kê và phân tích.

---

## 5. Nhãn hiệu và thương hiệu

Tất cả tên thương mại, logo và nhãn hiệu xuất hiện trong dự án (Petrolimex, PVOil, Mipec, COMECO, Saigon Petro,…) là **tài sản của chủ sở hữu tương ứng**. VietFuelAPI chỉ sử dụng các tên gọi này để nhận diện nguồn dữ liệu, không tuyên bố quyền sở hữu hay liên kết thương mại.

---

## 6. Liên hệ

Nếu bạn là quản trị viên của một nguồn dữ liệu và muốn yêu cầu loại bỏ hoặc điều chỉnh cách thu thập, vui lòng liên hệ qua **GitHub Issues**: [github.com/TranQui004/vietfuel-api/issues](https://github.com/TranQui004/vietfuel-api/issues).

Chúng tôi cam kết phản hồi trong vòng 72 giờ.

---

🔗 [Trở về chỉ mục pháp lý](README.md) | [English →](../../en/legal/disclaimer.md)
