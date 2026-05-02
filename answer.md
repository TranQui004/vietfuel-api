# Trả lời bình luận J2TEAM (Tự nhiên, dạng hội thoại)

**1. "Cào data có gặp tình trạng chặn không, nguồn proxy của bác ổn định không và tần suất thế nào?"**
> Có bị chặn bác ạ, ví dụ như PVOil xài Cloudflare thỉnh thoảng sẽ block. Nhưng code mình viết có cơ chế dự phòng, lỗi nguồn này thì nó tự động rẽ nhánh đi bốc data từ nguồn trung gian khác về nên không lo API sập. Vụ proxy thì mình không xài luôn vì đỡ tốn tiền. Tần suất thì mình lập trình nương theo lịch Nhà nước: ngày bình thường thì 4 tiếng cào 1 lần cho khoẻ máy, nhưng cứ đến chiều Thứ 5 lúc chuẩn bị đổi giá thì ép máy cào 15 phút/lần để bắt được giá mới nhanh nhất.

**2. "Giá xăng dầu nhà nước quyết định mà... Mình thấy bạn nên cào data từ thông báo nhà nước hay hơn."**
> Bác nói chuẩn, Nhà nước chốt giá cơ sở. Nhưng mỗi hãng phân phối (như Petrolimex, PVOil) lại tự định nghĩa danh sách các tỉnh thuộc Vùng 1 và Vùng 2, với vùng sâu vùng xa được bán cao hơn tối đa 2%. Nếu mình chỉ lấy thông báo từ Bộ Công Thương thì sẽ bị thiếu mất cái giá Vùng 2 thực tế tại các cây xăng. Do đó cào thẳng từ các nhà phân phối là chuẩn bài nhất cho dân làm Logistics.

**3. "Mình tưởng cứ cào data của petrolimex là ra..."**
> Petrolimex chiếm thị phần lớn nhất thật, nhưng mấy công ty vận tải hay nhà xe lớn họ lại hay ký hợp đồng với PVOil, Comeco hoặc SaigonPetro để ép chiết khấu tốt hơn bác ạ. Nên con API này mình gom luôn 11 nguồn để các app đối soát chi phí vận tải của doanh nghiệp có nhiều lựa chọn hơn.

**4. "Đã tốn công code thì bác kiếm vps hoặc con gì free host luôn cho anh em dùng cho tiện bác."**
> Mình cũng mót đẩy lên host lắm, cơ mà chạy giả lập trình duyệt cào data thì RAM nó ngốn khá gắt, mấy con free host yếu sinh lý gánh không nổi bác ạ 😅. Tạm thời mình để open source để anh em nào công ty đang cần thì kéo về cắm lên VPS công ty tự xài cho nó chủ động và bảo mật nhé.

**5. "Em góp ý tí, thay vì 'Lần cập nhật giá cuối' thì bác đổi thành 'kì điều chỉnh xx giờ, ngày xx' thì ổn hơn đó"**
> Góp ý của bác xịn quá, nghe đúng chuẩn văn phong chuyên ngành xăng dầu luôn! Mình đã note lại để update cái giao diện trong bản tới nhé. Cảm ơn bác nhiều nha!

**6. "Chiết khấu thì doanh nghiệp phải tự deal với bên xd chứ. mình chưa hiểu lắm api này có ứng dụng gì... lớn thì có giá riêng, nhỏ thì giá nhà nước..."**
> Bác nói rất đúng về việc phần trăm chiết khấu là do doanh nghiệp tự thoả thuận. Về mặt pháp lý thì Nhà nước chỉ điều hành "Giá cơ sở", sau đó các Thương nhân đầu mối mới dựa vào đó để ban hành "Giá bán lẻ niêm yết" riêng cho hệ thống của họ. Trong các hợp đồng vận tải, giá thanh toán cuối cùng thường được chốt bằng cách lấy Giá bán lẻ niêm yết tại thời điểm đổ trừ đi mức chiết khấu đã deal. Vì thế con API này sinh ra là để tuồn thẳng cái dữ liệu Giá bán lẻ niêm yết tự động vào phần mềm Kế toán. Nó làm mốc giá gốc chuẩn xác cho từng hãng. Nếu không có nó, cứ mỗi chiều Thứ 5 đổi giá là kế toán lại phải đi dò bảng giá bằng mắt để chốt công nợ thì cực kỳ mất thời gian và dễ sai lệch.

**7. "Nếu mà là cào từ petrolimex thì chỉ cần 1 lệnh là ra mà: https://gist.github.com/..."**
> Chuẩn luôn bác ơi, Petrolimex thì họ mở sẵn cái API dạng JSON nên mình gõ 1 lệnh fetch là ra ngay. Nhưng ngặt nỗi API của mình không chỉ chơi với mỗi ông Petrolimex, mà phải đi gom và chuẩn hoá tận 11 nguồn phân phối khác nhau. Các hãng kia làm gì có API dọn sẵn, toàn phải cào thô HTML, có bên còn bật cả khiên chống bot. Giá trị cốt lõi của project này là mình gom hết mớ bòng bong đó, xử lý dữ liệu sạch sẽ về 1 định dạng duy nhất, kẹp thêm cơ chế tự động chạy ngầm và lưu Cache. Nhờ vậy anh em dev lấy về xài đỡ được cả chục tiếng đồng hồ ngồi code lại mấy cái logic lấy data cồng kềnh.

**8. "Này mình ứng dụng lấy số liệu vào phân tích mấy cái chỉ số kinh doanh của công ty được không?"**
> Hoàn toàn được bác nhé, nhưng bác sẽ cần thao tác thêm một chút. Project này hiện tại đóng vai trò là một "nguồn cấp dữ liệu" (Data Source) chuyên trả về giá xăng dầu hiện tại (real-time). API không tự động lưu lịch sử hay vẽ biểu đồ sẵn. Nên nếu công ty bác muốn phân tích chi phí, bác chỉ cần dùng API này để tự động kéo dữ liệu về, lưu vào Database của công ty mỗi kỳ thay đổi giá. Từ cái Database đó, bác đẩy lên PowerBI hay nạp vào ERP để phân tích thì bao chuẩn luôn.

**9. "Có dữ liệu lịch sử không hay chỉ cào dữ liệu realtime thôi bác."**
> Ở phiên bản hiện tại, mục tiêu cốt lõi của project chỉ là lấy được giá hiện tại chuẩn xác và nhanh nhất thôi. Mình chưa kẹp thêm Database vào để giữ cho mã nguồn thật gọn nhẹ. Nếu bác cần data lịch sử thì có thể thiết lập cho code tự chạy, sau đó lưu cái file JSON đầu ra vào hệ thống lưu trữ của bác để tự build thành kho dữ liệu lịch sử riêng nhé.

**10. "Em cào pvoil bị chặn. E muốn cào sử dụng dữ liệu lịch sử của giá xăng dầu."**
> Vụ PVOil bọc Cloudflare chặn bot thì mình cũng từng dính rồi bác. Cách xử lý trong project này là mình đi đường vòng, thiết lập cơ chế dự phòng để khi cào trực tiếp PVOil bị chặn thì hệ thống tự động nhảy sang bốc giá PVOil thông qua mấy trang tổng hợp trung gian. Còn về khoản dữ liệu lịch sử thì giống như mình có chia sẻ ở trên, mã nguồn hiện tại chỉ chuyên trị giá mới nhất thôi. Bác có thể tận dụng API này làm đầu vào để tự xây data lịch sử cho mình nhé.

**11. "Thú vị quá vậy dùng Puppeteer để cào data từ hơn 11 nguồn thì bác xử lý vụ block IP hay timeout thì như thế nào."**
> Đính chính nhẹ với bác là project mình xài Playwright thay vì Puppeteer cho nó nhẹ và ổn định. Để trị vụ block IP và Timeout, mình xài kết hợp nhiều chiêu. Đầu tiên là kiến trúc Fallback đa tầng, tức là nguồn chính sập thì code tự động nhảy sang cào nguồn phụ, mạng sập hẳn thì bốc dữ liệu từ Cache lên nên API luôn giữ HTTP 200. Thứ hai là lập lịch thông minh, mình không spam request dồn dập mà nương theo lịch Nhà nước: ngày thường thì 4 tiếng cào 1 lần, chỉ đúng khung giờ vàng chiều Thứ 5 mới ép cào liên tục 15 phút/lần. Cuối cùng là kết hợp bật chế độ tàng hình Stealth và chặn load ảnh, css để cào siêu tốc, giảm tối đa tỷ lệ dính timeout.

**12. "windows muốn cài thì phải chạy cái subsystem for linux mới đc đúng không bác."**
> Không cần phức tạp thế đâu bác ơi! Project này viết bằng Node.js thuần nên nó tương thích đa nền tảng. Bác cứ chạy trực tiếp trên Windows thoải mái, bản thân mình cũng đang code và test thẳng trên Windows mà. Cái thư viện Playwright đi kèm nó cũng khôn lắm, tự động tải bản Chrome ảo dành riêng cho Windows luôn. Bác chỉ việc cài Node.js, tải code về mở cửa sổ lệnh lên gõ `npm install`, tiếp theo gõ `npx playwright install chromium` rồi gõ `npm start` là server API chạy mượt mà ngay.
