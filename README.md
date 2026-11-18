# Gym Log

App ghi chép tập gym cho iPhone. Đây là web app cài được lên màn hình chính, chạy toàn màn hình, dùng được khi không có mạng, và dữ liệu chỉ lưu trên điện thoại.

## Tính năng
- Ghi buổi tập: kg × reps cho từng set, tick ✓ khi xong. App hiện số liệu lần trước và tự điền nếu bạn để trống.
- Đồng hồ nghỉ tự chạy khi tick set (chỉnh được ±15s), kêu bíp khi hết giờ. Màn hình được giữ sáng khi đang tập.
- Routine (Push / Pull / Legs…) để bắt đầu bằng 1 chạm. Có thể lưu một buổi cũ thành routine.
- Lịch sử theo tháng, đánh dấu 🏆 PR khi phá kỷ lục mức tạ.
- Tiến độ từng bài: 1RM ước tính, tạ cao nhất, khối lượng.
- Xuất/nhập file sao lưu JSON (qua app Tệp / iCloud Drive).
- **Thư viện bài tập**: 125 bài chia theo nhóm cơ, có cả bài máy, cáp và Cardio (ghi số phút và km). Tìm được bằng tiếng Việt, có dấu hay không dấu đều được ("day nguc", "kéo xô", "mông"). Mỗi bài có hình cơ chính và cơ phụ, các bước thực hiện, lưu ý, và nút mở video mẫu trên YouTube. Trong lúc tập, bấm vào tên bài là xem được.
- **Phục hồi cơ**: hình cơ thể mặt trước và mặt sau tô màu theo mức hồi phục (ước tính theo số set và thời gian nghỉ), kèm gợi ý hôm nay nên tập nhóm nào.
- **Thực đơn**: tính BMR, TDEE, calo và macro theo mục tiêu (giảm mỡ / giữ cân / tăng cơ), rồi gợi ý 3 thực đơn món Việt với định lượng tự điều chỉnh theo mục tiêu.

- **Lịch 5 buổi/tuần**: nút "Nạp lịch 5 buổi" tạo sẵn 5 routine (T2 Đẩy, T3 Kéo, T4 Chân, T6 Thân trên, T7 Thân dưới) có số rep mục tiêu, thời gian nghỉ riêng từng bài và đi bộ dốc cuối buổi. Màn hình chính tự gợi ý đúng buổi theo thứ trong tuần.

- **Chấm điểm buổi tập**: bấm "Xong" là có điểm 0–100 và nhận xét: đạt rep mục tiêu thì gợi ý lên tạ buổi sau, bài nào bỏ hoặc thiếu set, mạnh/yếu hơn lần trước, số set mỗi nhóm cơ trong 7 ngày. Mức tạ gợi ý hiện luôn trên thẻ bài khi tập.
- **Nhật ký ăn uống**: chụp ảnh bữa ăn để AI liệt kê món, số gram và calo (sửa lại được trước khi lưu), hoặc nhập tay. Thanh "đã ăn / còn lại" và số kcal thâm hụt so với mức tiêu hao trong ngày.
- **AI (Gemini hoặc Claude)**: chọn trong Thêm → Cài đặt. **Gemini** dùng key miễn phí từ aistudio.google.com (có giới hạn lượt mỗi phút/ngày; ở gói miễn phí Google có thể dùng dữ liệu gửi lên để cải thiện sản phẩm). **Claude** dùng key từ console.anthropic.com, trả theo lượt (khoảng 500đ/ảnh, 750đ/lần nhận xét). Key chỉ lưu trên máy và không nằm trong file sao lưu. Ảnh bữa ăn và dữ liệu buổi tập chỉ được gửi đi khi bạn bấm dùng AI. AI được dặn nhận xét phũ, không khen xã giao, chấm Đạt / Tạm / Không đạt; khi tính calo thì ước theo mức cao nếu không chắc. Thêm → Cài đặt → Thử kết nối kiểm tra từng bước nếu AI báo lỗi.
- **Lịch tự lùi khi bận**: các buổi trong tuần chạy theo thứ tự. Lỡ một ngày thì hôm sau app gợi ý bù buổi bị lỡ, các buổi sau lùi theo; dải tuần hiện buổi dự kiến mỗi ngày. Có nút "Hoặc theo lịch" và "Bỏ qua buổi này". Mỗi tuần mới bắt đầu lại từ buổi đầu; buổi không kịp được gợi ý bù vào ngày nghỉ.
- **Điểm mỗi ngày (0–100)**: tập luyện 35 + ăn uống 35 + giấc ngủ 15 + theo dõi 15; không ghi bữa = 0 điểm ăn uống. Trang chủ có "Tổng kết hôm qua" và "Hôm nay đến giờ", bấm vào để xem thiếu gì, ghi bù và nhờ AI chấm ngày (phũ). Biểu đồ điểm 30 ngày trong trang Cơ thể.
- **Giấc ngủ**: mỗi sáng trang chủ hỏi giờ ngủ và giờ dậy (ghi bù được). Ngủ dưới 6 tiếng thì màn hình tập cảnh báo giữ mức tạ; AI chấm buổi tập và chấm ngày đều biết giấc ngủ. Mục tiêu giờ ngủ và số tiếng đặt trong Cài đặt, biểu đồ 14 đêm trong trang Cơ thể.
- **Món Việt có sẵn**: phần Nhập tay có hơn 100 món (kèm ảnh): xôi, bánh mì, phở, bún, miến, cơm, lẩu, đồ nướng, ăn vặt, chè, nước uống, hoa quả, món Hàn/Nhật/Âu với calo cho 1 phần, chọn số phần; món không có thì bấm "Hỏi AI" để ước tính theo tên món.
- **Ảnh và giờ**: mỗi món trong nhật ký có ảnh (ảnh món, hoặc ảnh thu nhỏ của bữa đã chụp, giữ 60 ngày) và giờ ăn; buổi tập hiện giờ bắt đầu–kết thúc.
- **Ghi bù**: buổi tập bị lỡ ghi bù từ bảng tổng kết ngày; bữa ăn chụp/chọn ảnh hoặc nhập tay đều chọn được ngày (7 ngày gần nhất) và bữa; ảnh cũ từ thư viện được tự đoán ngày và bữa theo giờ chụp.
- **Nhắc 23:55**: dùng app Phím tắt của iPhone (hướng dẫn trong Cài đặt). Mở app sau 21:00 mà hôm nay còn thiếu thì app tự hiện bảng kiểm tra.
- **Chấm từng bài ngay khi xong**: tick set cuối là có điểm bài đó. Thiếu set, thiếu tổng rep tối thiểu (số set × rep thấp nhất) hoặc yếu hơn buổi trước thì app bắt tập thêm 1 set (giảm ~10% tạ); bỏ qua thì ghi vào đánh giá. Nhập mức tạ bất thường (trên 300 kg hoặc gấp 3 lần cũ) app hỏi lại.
- **Kho ảnh body** (Cơ thể → Mở kho ảnh): ảnh trước/nghiêng/sau mỗi tuần, so sánh 2 tuần, mã hóa AES-256-GCM bằng mật khẩu bạn đặt (PBKDF2, mật khẩu không được lưu). Quên mật khẩu là mất ảnh. Kho ảnh không nằm trong file sao lưu thường: dùng Xuất/Nhập kho ảnh (file vẫn mã hóa). Tự khóa khi rời trang hoặc thoát app.
- **Cơ thể** (Thêm → Cơ thể): ghi cân nặng và vòng bụng, biểu đồ, đếm ngược đến Tết (6/2/2027), nhắc đo vòng bụng mỗi 2 tuần và chụp ảnh body mỗi tuần. Cân ít nhất 3 lần/tuần trong 2 tuần thì app so xu hướng cân với mục tiêu và gợi ý chỉnh ±150 kcal (tối đa 1 lần/tuần, không xuống dưới mức an toàn).
- **Ghi chú cách ghi kg** trên từng bài (tổng cả thanh, 1 quả tạ, số trên cọc tạ…) để mọi buổi ghi giống nhau.
- **Giao diện** theo thiết kế làm bằng Google Stitch (nền tối, nhấn màu xanh chanh, font Space Grotesk + Inter tải sẵn trong `fonts/` để dùng khi không có mạng).

Dữ liệu bài tập, lịch tập và món ăn nằm trong `data.js`.

### Nguồn ảnh
Ảnh món ăn trong `img/food/` (thu nhỏ, cắt vuông) lấy từ Wikimedia Commons và Openverse (chỉ ảnh CC0, public domain, CC BY, CC BY-SA); tác giả và giấy phép từng ảnh (CC BY, CC BY-SA, CC0, public domain) nằm trong `DISH_SRC` của `data.js` và mục **Nguồn ảnh** trong Cài đặt.

Ảnh demo bài tập trong `img/ex/` (đã nén còn 360px) lấy từ [free-exercise-db](https://github.com/yuhonas/free-exercise-db). Repo này dùng giấy phép Unlicense (miễn phí bản quyền) và không ghi giấy phép riêng cho phần ảnh. Nếu sau này muốn phát hành app công khai, nên kiểm tra lại nguồn gốc ảnh.

## Cài lên iPhone bằng GitHub Pages (khuyên dùng)
1. Tạo một repo **public** trên GitHub, ví dụ `gym-app`.
2. Push code lên:
   ```bash
   git remote add origin https://github.com/<tên-bạn>/gym-app.git
   git push -u origin main
   ```
3. Trên GitHub, vào **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
4. Chờ khoảng 1 phút, sau đó mở `https://<tên-bạn>.github.io/gym-app/` bằng **Safari** trên iPhone.
5. Bấm nút **Chia sẻ** → **Thêm vào MH chính** → **Thêm**.
6. Mở app từ icon trên màn hình chính một lần khi đang có mạng. Từ lần sau app dùng được cả khi không có mạng.

## Kiểm tra trong buổi tập đầu tiên
Mở app từ icon trên màn hình chính (không mở trong Safari) rồi thử lần lượt:
- [ ] **Bật chế độ máy bay** rồi mở app: app vẫn chạy, ảnh bài tập vẫn hiện.
- [ ] Bắt đầu buổi tập, đặt iPhone xuống khoảng 1 phút: **màn hình không tự tắt**.
- [ ] Tick ✓ một set rồi chờ hết giờ nghỉ: **nghe tiếng bíp** và **màn hình nháy xanh**. Nhớ tắt chế độ im lặng (công tắc bên hông máy), vì khi bật im lặng sẽ không nghe tiếng bíp.
- [ ] Tick ✓ một set, chuyển sang app khác khoảng 2 phút rồi quay lại: app báo **"Đã hết giờ nghỉ … trước"**.
- [ ] Vuốt tắt hẳn app giữa buổi rồi mở lại: **buổi đang tập vẫn còn**.
- [ ] Kết thúc buổi, vào **Thêm → Lịch sử → ✏️ Sửa**: đổi một mức tạ rồi lưu.
- [ ] **Cài đặt → Xuất dữ liệu → Lưu vào Tệp → iCloud Drive**: file sao lưu nằm trong app Tệp.

Mục nào không đúng như mô tả thì chụp màn hình lại để sửa.

Giới hạn của web app trên iOS: không rung được, và không gửi được thông báo khi app chạy nền. Vì vậy app giữ màn hình luôn sáng trong lúc tập.

## Chạy thử trên máy tính
```bash
node serve.js
```
Lệnh sẽ in ra địa chỉ `http://192.168.x.x:8000`. Mở địa chỉ này trên iPhone khi cùng Wi-Fi với máy tính. Cách này chỉ để thử: dùng HTTP thường nên iOS không cho chạy offline.

## Cập nhật app
Sửa code, `git push`, rồi đổi `CACHE = 'gymlog-vN'` trong `sw.js` sang số mới. Mở app khi có mạng là iPhone tự nhận bản mới.

## Lưu ý về dữ liệu
- Dữ liệu nằm trong bộ nhớ của app trên iPhone. **Xóa app khỏi màn hình chính là mất dữ liệu.**
- Thỉnh thoảng vào **Cài đặt → Xuất dữ liệu** để sao lưu.
