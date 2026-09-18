# PMS - PEIW — Triển khai trên server nội bộ (offline)

Server **không cần internet** và **không cần `npm install`**. Chỉ cần Node.js 20 trở lên.
Trình duyệt của người dùng phải truy cập được `docs.google.com` và `*.googleusercontent.com` (dữ liệu được tải trực tiếp từ Google Sheet).

## Nội dung gói release

```
release/
├── server.cjs          # Node server đã bundle sẵn mọi thư viện
├── config.json         # Cấu hình — sửa file này, không cần build lại
├── public/             # Giao diện đã build (index.html + assets/)
└── README-deploy.md    # Tài liệu này
```

## Tạo gói (trên máy có internet)

```bash
npm ci
npm run release
```

Copy toàn bộ thư mục `release/` lên server.

## Chạy

```bash
cd release
node server.cjs            # cổng lấy từ config.json ("port"), mặc định 8080
PORT=9000 node server.cjs  # hoặc đặt cổng bằng biến môi trường (Linux/macOS)
```

Windows PowerShell: `$env:PORT=9000; node server.cjs`

Kiểm tra: mở `http://<server>:8080/` và `http://<server>:8080/healthz` (trả `{"ok":true}`).

## Chạy như service

**Windows (NSSM):**

```powershell
nssm install PMS-PEIW "C:\Program Files\nodejs\node.exe" "D:\apps\pms-peiw\server.cjs"
nssm set PMS-PEIW AppDirectory "D:\apps\pms-peiw"
nssm start PMS-PEIW
```

**Linux (systemd)** — `/etc/systemd/system/pms-peiw.service`:

```ini
[Unit]
Description=PMS - PEIW dashboard
After=network.target

[Service]
WorkingDirectory=/opt/pms-peiw
ExecStart=/usr/bin/node /opt/pms-peiw/server.cjs
Restart=always

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable --now pms-peiw`

## config.json

| Khóa | Ý nghĩa |
|---|---|
| `appName` | Tên hiển thị trên header và tab trình duyệt |
| `projectName` | Tên dự án |
| `dataSource.type` | `google-sheet` (trình duyệt tải trực tiếp) hoặc `server` (dành cho v2) |
| `dataSource.url` | Link Google Sheet — dán link edit hoặc link `export?format=xlsx` đều được |
| `dataSource.sheetName` | Tên sheet dữ liệu (mặc định sheet đầu tiên) |
| `dueSoonDays` | Cửa sổ "sắp đến hạn", tính bằng ngày |
| `port` | Cổng server |

Sửa `config.json` rồi tải lại trang là có hiệu lực — không cần khởi động lại server.

## Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| "Nguồn dữ liệu từ chối truy cập" | Sheet không còn chia sẻ "Anyone with the link". Bật lại chia sẻ. |
| "Không kết nối được tới nguồn dữ liệu" | Máy người dùng không ra được Google. Kiểm tra proxy/firewall. |
| "Thiếu cột bắt buộc" | Tiêu đề cột trong sheet bị đổi tên. Cột bắt buộc: `Package Code`, `Facility`, `Date`, và ít nhất một cột mốc. |
| Trang trắng sau khi cập nhật | Tải lại trang (Ctrl+F5). `index.html` không bị cache nên hiếm khi xảy ra. |
