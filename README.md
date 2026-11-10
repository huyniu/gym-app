# Gym Log

App ghi chép tập gym cho iPhone. Đây là web app cài được lên màn hình chính, chạy toàn màn hình, dùng được khi không có mạng, và dữ liệu chỉ lưu trên điện thoại.

## Tính năng
- Ghi buổi tập: kg × reps cho từng set, tick ✓ khi xong. App hiện số liệu lần trước và tự điền nếu bạn để trống.
- Đồng hồ nghỉ tự chạy khi tick set (chỉnh được ±15s), kêu bíp khi hết giờ. Màn hình được giữ sáng khi đang tập.
- Routine (Push / Pull / Legs…) để bắt đầu bằng 1 chạm. Có thể lưu một buổi cũ thành routine.
- Lịch sử theo tháng, đánh dấu 🏆 PR khi phá kỷ lục mức tạ.
- Tiến độ từng bài: 1RM ước tính, tạ cao nhất, khối lượng.
- Xuất/nhập file sao lưu JSON (qua app Tệp / iCloud Drive).
- **Thư viện bài tập**: 40 bài chia theo nhóm cơ. Mỗi bài có hình cơ chính và cơ phụ, các bước thực hiện, lưu ý, và nút mở video mẫu trên YouTube. Trong lúc tập, bấm vào tên bài là xem được.
- **Phục hồi cơ**: hình cơ thể mặt trước và mặt sau tô màu theo mức hồi phục (ước tính theo số set và thời gian nghỉ), kèm gợi ý hôm nay nên tập nhóm nào.
- **Thực đơn**: tính BMR, TDEE, calo và macro theo mục tiêu (giảm mỡ / giữ cân / tăng cơ), rồi gợi ý 3 thực đơn món Việt với định lượng tự điều chỉnh theo mục tiêu.

Dữ liệu bài tập và món ăn nằm trong `data.js`.

### Nguồn ảnh
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
