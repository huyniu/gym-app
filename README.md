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
