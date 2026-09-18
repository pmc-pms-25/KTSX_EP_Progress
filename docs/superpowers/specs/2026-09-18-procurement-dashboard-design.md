# PMS - PEIW — Procurement Plan Dashboard: Design Spec

- **Ngày:** 2026-09-18
- **Dự án nghiệp vụ:** Maydan Mahzam — Procurement Plan
- **Trạng thái:** Đã duyệt thiết kế, chờ review spec
- **Phạm vi spec này:** v1 (MVP). Các giai đoạn sau chỉ được mô tả ở mức định hướng để bảo đảm kiến trúc mở rộng được.

## 1. Mục tiêu

File Excel Procurement Plan khó xem tổng thể và khó trả lời nhanh các câu hỏi phục vụ ra quyết định. Webapp responsive đọc dữ liệu từ Google Sheet và trình bày dạng dashboard:

- **Lãnh đạo / PM:** tổng quan sức khỏe kế hoạch, rủi ro theo discipline/facility, số gói trượt, rủi ro ROS.
- **Procurement team:** drill-down tới từng package, mốc sắp đến hạn, chi tiết Plan/Forecast/Actual.
- **Truyền thông:** giao diện chuyên nghiệp mang dấu hiệu "có áp dụng AI" rõ ràng nhưng trung thực (insight dựa trên dữ liệu thật, kiểm chứng được).

### Tiêu chí thành công v1
1. Mở app → thấy dashboard Overview trong < 3 giây (mạng văn phòng bình thường).
2. Số liệu khớp nguồn (dữ liệu ngày 18-Sep-2026): 8 discipline, 141 package có code hợp lệ, 573 dòng Package × Facility (trong đó 11 dòng code lỗi, 3 dòng thiếu facility), 7 dòng slipped (Forecast muộn hơn Plan ở ít nhất 1 mốc), 2 dòng có mốc Forecast sớm hơn Plan.
3. Từ Overview đến chi tiết một package trong ≤ 2 thao tác.
4. Dùng được trên desktop, tablet, mobile.
5. Thêm nguồn dữ liệu mới (server) không cần sửa code UI.

### Ngoài phạm vi v1
Đăng nhập/phân quyền; lưu snapshot/lịch sử; forecast; LLM hỏi đáp; export/download dữ liệu; chỉnh sửa dữ liệu từ app.

## 2. Ràng buộc

| Ràng buộc | Hệ quả thiết kế |
|---|---|
| Server nội bộ (LAN/VPN), **không có internet** | Server không fetch được Google Sheet; không `npm install` trên server; không dùng CDN (font, thư viện đóng gói sẵn). |
| Máy người dùng có internet | Trình duyệt fetch trực tiếp Google Sheet. |
| Không cung cấp chức năng tải file về | App không có nút download/export. Lưu ý: dữ liệu đã tải về trình duyệt thì vẫn xem được qua DevTools — đây không phải cơ chế bảo mật. |
| Không cần đăng nhập (v1) | Không có auth. |
| Cần ra sản phẩm nhanh | MVP gọn; mở rộng bằng cách thêm module. |

## 3. Nguồn dữ liệu

### 3.1 Google Sheet
- Sheet ID: `1oygbFq6v3j0NThuZ9Zmf8noHm5jwPr_YSvDvXHT8FPQ`
- Endpoint dùng: `https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx`
- Đã kiểm chứng (18-Sep-2026): endpoint redirect 307 sang `*.googleusercontent.com`, cả hai trả `Access-Control-Allow-Origin` hợp lệ → trình duyệt gọi trực tiếp được.
- Điều kiện: sheet đang chia sẻ **"Anyone with the link"** (chưa "Publish to web"; endpoint `pub` trả 401). Nếu quyền chia sẻ bị thu hồi, app phải báo lỗi rõ ràng.
- Chọn XLSX (không CSV) vì giữ kiểu ngày/số; CSV trộn nhiều định dạng ngày (`05-Feb-27`, `09/Oct/27`).

### 3.2 Cấu trúc sheet (nguồn chuẩn)
Workbook có 1 sheet `ALL`, header ở dòng 1, 54 cột:

- Cột định danh: `Package Code`, `Package Name`, `Facility`, `Tagged/ Bulk`, `Date` (giá trị `PLANNED` | `FORECAST` | `ACTUAL`).
- Cột mốc (ngày), xen kẽ các cột `Duration (Days)`: MTO/ TR Approval, RFQ/TP Submission, Approval of RFQ/TP with Bidder List, RFQ Issue, Bids Due, TBE Submission, TBE Approval, MTO for Purchase, Commercial/Cost Impact Due Date, CBE & AR Submission, CBE & AR Approval, LOA Effective Date, PO Effective Date, Critical VD Approval, Raw Material/ Equipment PO Placed, SPIR Submitted, SPIR Approved, 50% Manufacturing Completed, FAT/ Final Inspection Completed, Shipped from Port, Received and Inspected at Worksite.
- Cột số: `Delivery (Weeks)`, `Transportation (Days)`, `Buffer`.
- `ROS` (ngày), `Remark`, `%`, `% MTO`, các cột số lượng (hiện trống).
- Lịch sử ROS: các cột có tiêu đề bắt đầu bằng `Old ED` hoặc `ED ` (ví dụ `ED 01-Nov-2026 (plus 16 days)`).
- **Dòng tiêu đề discipline:** dòng chỉ có giá trị ở cột 1 (ví dụ `MECHANICAL`, `PIPING`, …, 8 discipline). Mọi dòng sau nó thuộc discipline đó đến khi gặp dòng tiêu đề kế tiếp.
- Mỗi dòng Package × Facility gồm **3 dòng liên tiếp** PLANNED/FORECAST/ACTUAL, sau đó thường là 1 dòng trống.

File Excel gốc (`MM - Procurement Plan (13-Sep-2026).xlsx`) chỉ dùng để tham khảo nghiệp vụ; không được commit (dữ liệu dự án).

### 3.3 Quy tắc map cột
- Map theo **tên header** (chuẩn hóa: trim, gộp khoảng trắng, không phân biệt hoa thường), không theo vị trí.
- Cột `Duration (Days)` trùng tên: gán cho mốc đứng **ngay trước** nó.
- Cột bắt buộc: `Package Code`, `Facility`, `Date`, và ít nhất 1 cột mốc. Thiếu → lỗi nguồn (không hiển thị dashboard sai).
- Cột không nhận diện được → bỏ qua, ghi cảnh báo mức info.

## 4. Kiến trúc

```
Browser
  UI (React) ─► Analytics selectors ─► Store (Zustand)
                        ▲
               Normalized Plan model
                        ▲
               Parser (SheetJS)
                        ▲
  DataSource: GoogleSheetSource | ServerSource (v2)
                        │ fetch XLSX
Node server (Fastify, offline)
  - serve dist/ tĩnh
  - GET /config.json
  - (v2) /api/data, (v3) /api/ask
```

### 4.1 Công nghệ
Vite + React + TypeScript; Tailwind CSS; ECharts (echarts-for-react); Framer Motion; Zustand; SheetJS (`xlsx`); React Router (hash routing); Vitest + Testing Library; Fastify cho server; esbuild để bundle server thành 1 file.

### 4.2 Các đơn vị và ranh giới

| Đơn vị | Trách nhiệm | Interface |
|---|---|---|
| `config` | Đọc `/config.json` lúc khởi động | `loadConfig(): Promise<AppConfig>` |
| `data/sources/*` | Lấy bytes của workbook | `interface DataSource { load(signal): Promise<ArrayBuffer> }` |
| `data/milestones.ts` | Danh mục mốc: key, nhãn, header, phase, thứ tự | hằng số |
| `data/parser` | Workbook → `Plan` + cảnh báo. Hàm thuần. | `parsePlan(buf, opts): ParseResult` |
| `analytics/*` | Selector thuần: KPI, trạng thái, slippage, ROS float, phân bố, insight | `(plan, filters, cutOff) => …` |
| `analytics/insights/*` | Registry các insight rule | `interface InsightRule { id; evaluate(ctx): Insight[] }` |
| `store` | Plan hiện tại, trạng thái tải, filter, cut-off, theme | Zustand hooks |
| `ui/*` | Hiển thị; không tự tính toán nghiệp vụ | React components |
| `server` | Phục vụ file tĩnh + config | Fastify |

Nguyên tắc: mỗi tầng chỉ phụ thuộc tầng ngay dưới; parser và analytics không import React.

## 5. Mô hình dữ liệu

```ts
type MilestoneKey = 'trApproval' | 'rfqSubmission' | 'rfqApproval' | 'rfqIssue' | 'bidsDue'
  | 'tbeSubmission' | 'tbeApproval' | 'mtoPurchase' | 'commercialImpact'
  | 'cbeSubmission' | 'cbeApproval' | 'loa' | 'po' | 'criticalVd' | 'rawMaterialPo'
  | 'spirSubmitted' | 'spirApproved' | 'mfg50' | 'fat' | 'shipped' | 'received';

type PhaseKey = 'tr' | 'rfq' | 'evaluation' | 'award' | 'manufacturing' | 'logistics';

interface MilestoneDates { plan?: Date; forecast?: Date; actual?: Date; durationDays?: number }

interface Line {
  id: string;                 // `${packageCode}|${facility}|${rowIndex}`
  discipline: string;
  packageCode: string;
  packageName: string;
  facility: string;
  itemType: 'Tagged' | 'Bulk' | 'Unknown';
  milestones: Partial<Record<MilestoneKey, MilestoneDates>>;
  ros?: Date;
  rosHistory: { label: string; date: Date }[];
  deliveryWeeks?: number;
  transportDays?: number;
  bufferDays?: number;
  remark?: string;
  sourceRow: number;          // dòng PLANNED trong sheet (1-based), phục vụ "Why?"
}

interface Package { code: string; name: string; discipline: string; lines: Line[] }
interface Discipline { name: string; packages: Package[] }

interface Plan {
  project: string;
  loadedAt: Date;
  disciplines: Discipline[];
  lines: Line[];
  warnings: DataWarning[];
}

interface DataWarning { level: 'info' | 'warn' | 'error'; code: string; message: string; row?: number }
```

### 5.1 Nhóm phase

| Phase | Mốc |
|---|---|
| TR / Pre-RFQ | trApproval, rfqSubmission, rfqApproval |
| RFQ / Bidding | rfqIssue, bidsDue |
| Evaluation | tbeSubmission, tbeApproval, mtoPurchase, commercialImpact, cbeSubmission, cbeApproval |
| Award | loa, po |
| Manufacturing | criticalVd, rawMaterialPo, spirSubmitted, spirApproved, mfg50, fat |
| Logistics | shipped, received |

"Delivered" = `received` có actual.

### 5.2 Quy tắc parse
- Gom 3 dòng theo thứ tự đọc: gặp `PLANNED` mở nhóm mới; `FORECAST`/`ACTUAL` kế tiếp gắn vào nhóm nếu cùng `Package Code` + `Facility`. Thiếu dòng → cảnh báo `INCOMPLETE_TRIPLET`, vẫn giữ dữ liệu có được.
- Thông tin định danh (tên, facility, loại, ROS, remark, lịch sử ROS) lấy từ dòng PLANNED. Dòng FORECAST/ACTUAL chỉ đóng góp ngày mốc (dữ liệu thật có ROS/Remark khác nhau giữa PLANNED và FORECAST; ROS ở dòng FORECAST đôi khi là chuỗi rác `00/Jan/00`).
- Ô ngày: chấp nhận Date của SheetJS (`cellDates: true`); bỏ phần giờ (chuẩn hóa về ngày, UTC-safe). Ô chứa chuỗi không phải ngày hợp lệ (ví dụ `00/Jan/00`) → coi như trống, ghi cảnh báo `INVALID_DATE` mức info.
- Package Code rỗng / `0` / `None` → cảnh báo `INVALID_PACKAGE_CODE`; dòng vẫn được tính với code `UNCODED-<row>` để không mất dữ liệu.
- Facility rỗng / `0` → cảnh báo `MISSING_FACILITY`; facility = `Unassigned`.
- Dòng trước dòng tiêu đề discipline đầu tiên → discipline = `Unassigned` + cảnh báo.

## 6. Chỉ số dẫn xuất

- **Cut-off date:** mặc định ngày hiện tại; người dùng chọn được trên header.
- **Ngày hiệu lực của mốc:** `actual ?? forecast ?? plan`.
- **Trạng thái mốc** (theo cut-off `C`, ngưỡng `dueSoonDays` mặc định 30):
  - `done`: có actual.
  - `overdue`: không actual, forecast (hoặc plan nếu không có forecast) < C.
  - `dueSoon`: không actual, ngày đó trong [C, C + dueSoonDays].
  - `future`: còn lại. `noDate`: không có ngày nào.
- **Slippage mốc** (ngày) = forecast − plan (khi có cả hai). Dòng "slipped" = có ít nhất 1 mốc slippage > 0.
- **ROS float** (ngày) = ROS − ngày hiệu lực của `received`. `< 0` → **ROS at risk**.
- **Phase hiện tại của dòng:** phase của mốc đầu tiên (theo thứ tự) chưa có actual; tất cả có actual → Delivered.
- **Mốc tiếp theo:** mốc đầu tiên chưa có actual, kèm ngày hiệu lực.
- **Tổng hợp package:** phase = phase sớm nhất trong các dòng; slippage = max; ROS float = min.
- **Điểm rủi ro discipline** (để tô màu health grid): tỷ lệ dòng (ROS at risk × 2 + overdue × 1.5 + slipped × 1) / số dòng, chia 3 mức ngưỡng (xanh/vàng/đỏ). Ngưỡng đặt trong một hằng số để chỉnh sau.

## 7. Màn hình

Routing hash: `#/`, `#/discipline/:name`, drawer package qua query `?pkg=MEC-001`. Filter lưu trên URL (`?facility=PS2R&type=Tagged&phase=award&q=...`) để chia sẻ được góc nhìn.

### 7.1 App shell
- Header: logo + tên app (từ config), tên dự án, ô "Ask PMS - PEIW…" (v1: tìm kiếm thông minh; có nhãn "AI chat coming soon"), chọn cut-off, trạng thái đồng bộ ("Synced 2m ago"), nút tải lại, nút dark/light, nút Data Health (có badge số cảnh báo).
- Filter bar (sticky): Discipline, Facility, Tagged/Bulk, Phase (multi-select), ô search. Nút xóa filter.
- Ô search thông minh: tách token; token khớp tên facility/discipline/phase/loại → áp filter tương ứng; token dạng năm/quý/tháng (`2027`, `Q2-2027`, `Mar-2027`) → lọc dòng có mốc tiếp theo trong khoảng đó; token còn lại → tìm trong code/tên package.

### 7.2 Overview
1. **KPI strip (5):** Packages, Lines, Slipped lines, ROS at risk, Mốc đến hạn trong `dueSoonDays`. Click KPI → áp filter tương ứng và chuyển tới danh sách.
2. **AI Insights:** 3–5 thẻ từ insight registry, sắp theo mức độ quan trọng.
3. **Phase funnel:** số dòng theo phase hiện tại.
4. **Discipline health grid:** 8 ô; mỗi ô có số package, số dòng rủi ro, màu theo điểm rủi ro; click → Discipline view.
5. **Monthly workload:** cột chồng số mốc đến hạn mỗi tháng cho 6 mốc chính (TR Approval, TBE Approval, CBE & AR Approval, LOA, FAT/EXW, Received at site) theo ngày hiệu lực; vạch cut-off; zoom theo khoảng thời gian.
6. **Heatmap Facility × Tháng:** số mốc đến hạn (tất cả mốc hoặc mốc chọn từ dropdown).

Mọi widget phản ứng theo filter chung.

### 7.3 Discipline view
- KPI strip riêng cho discipline.
- Bảng package: Code, Name, số facility, phase hiện tại (chip màu), mốc tiếp theo + ngày, max slippage, min ROS float, trạng thái. Mặc định sắp theo rủi ro. Dòng rủi ro được highlight. Sắp xếp theo cột; tìm kiếm.
- Click dòng → Package drawer.

### 7.4 Package drawer
- Header: code, tên, discipline, loại, chip trạng thái.
- Mini Gantt: mỗi facility 1 hàng; mỗi mốc hiển thị plan (viền mờ), forecast (đặc), actual (dấu ✓); vạch cut-off và vạch ROS; tooltip chi tiết.
- Bảng mốc theo facility: Plan / Forecast / Actual / Δ ngày, tô màu theo trạng thái.
- Lịch sử ROS: đường bậc thang qua các lần ED.
- Remark.

### 7.5 Data Health panel
Danh sách cảnh báo parser nhóm theo mã, kèm số dòng trong sheet.

### 7.6 Trạng thái đặc biệt
- **Loading:** skeleton + dòng tiến trình theo các bước thật: Fetching → Parsing N lines → Detecting risks → Generating insights.
- **Lỗi nguồn:** thông báo theo nguyên nhân (mạng, 401/403 do thu quyền chia sẻ, 404, file không phải XLSX, thiếu cột bắt buộc) + nút thử lại. Nếu còn dữ liệu cũ trong phiên, giữ hiển thị với nhãn "Dữ liệu lúc HH:mm".
- **Empty (filter):** thông báo + nút xóa filter.
- **Error boundary** cho từng widget.

### 7.7 Responsive
- ≥ 1280px: bố cục đầy đủ.
- 768–1279px: lưới 2 cột.
- < 768px: xếp dọc; filter gom vào nút "Filters" mở bottom sheet; bảng package thành thẻ; drawer toàn màn hình; biểu đồ cho phép cuộn ngang.

## 8. AI Insights (rule-based, v1)

`interface Insight { id; severity: 'critical'|'warning'|'info'; title; detail; confidence: number; evidence: string[] /* line ids */; filter?: Partial<Filters> }`

Rule v1:
1. **ROS risk:** số dòng ROS float < 0, discipline tập trung nhiều nhất, dòng xấu nhất.
2. **Slippage cluster:** discipline/facility có nhiều dòng trượt nhất, trượt trung bình.
3. **Workload peak:** tháng có số mốc đến hạn vượt ≥ 2× trung bình các tháng có hoạt động.
4. **Due soon:** số mốc đến hạn trong `dueSoonDays`, nhóm theo mốc.
5. **Overdue:** mốc đã qua ngày mà chưa có actual.
6. **ROS pushed:** dòng có ROS bị dời nhiều lần nhất (từ lịch sử ED).

`confidence` phản ánh độ đầy đủ dữ liệu của các dòng bằng chứng (tỷ lệ có đủ ngày cần thiết). Nút **"Why?"** mở danh sách dòng bằng chứng; nút áp filter tương ứng.

Rule không đủ dữ liệu → không sinh thẻ (không hiển thị thẻ rỗng).

## 9. Hình ảnh và animation

- **Theme:** dark mặc định (`#0A0F1C`, dot-grid mờ), có light; lưu lựa chọn trong localStorage (try/catch). Token màu qua CSS variables.
- **Card:** glass nhẹ, viền 1px. Card AI: viền gradient cyan → violet chuyển động chậm, icon ✦.
- **Màu trạng thái:** done = xanh lá, dueSoon = hổ phách, overdue/ROS âm = đỏ cam, future = xám xanh; kiểm tra tương phản và phân biệt được với mù màu. Bảng màu phase cố định 6 màu dùng thống nhất. Gradient AI chỉ dùng cho yếu tố AI.
- **Font:** Inter (UI), JetBrains Mono (số, mã) — đóng gói local (`@fontsource`), không CDN.
- **Animation:** card xuất hiện so le (40ms, 300ms, fade + 8px); KPI đếm số (800ms); biểu đồ vẽ vào (~600ms); đổi filter chuyển mượt (400ms); drill-down shared layout (350ms); drawer trượt (250ms); highlight rủi ro pulse tối đa 3 lần. Tôn trọng `prefers-reduced-motion`.

## 10. Cấu hình

`/config.json` (trên server, sửa không cần build lại):

```json
{
  "appName": "PMS - PEIW",
  "projectName": "Maydan Mahzam",
  "dataSource": {
    "type": "google-sheet",
    "url": "https://docs.google.com/spreadsheets/d/1oygbFq6v3j0NThuZ9Zmf8noHm5jwPr_YSvDvXHT8FPQ/export?format=xlsx",
    "sheetName": "ALL"
  },
  "dueSoonDays": 30,
  "port": 8080
}
```

`dataSource.type = "server"` dành cho v2 (client gọi `/api/data`).

## 11. Xử lý lỗi (tóm tắt)

| Tình huống | Hành vi |
|---|---|
| Không tải được config | Màn hình lỗi, hướng dẫn kiểm tra `config.json` |
| Fetch lỗi mạng / timeout (30s) | Thông báo + retry; giữ dữ liệu cũ nếu có |
| HTTP 401/403 hoặc nhận HTML thay vì XLSX | "Sheet không còn được chia sẻ công khai" |
| Không tìm thấy sheet / cột bắt buộc | Nêu tên sheet/cột thiếu |
| Dòng dữ liệu bẩn | Bỏ qua hoặc gán mặc định, ghi vào Data Health |
| Widget lỗi render | Error boundary cục bộ |

## 12. Kiểm thử

- **Unit (Vitest):** parser (map header, cột Duration trùng tên, gom triplet, dòng discipline, dữ liệu bẩn, thiếu cột bắt buộc); analytics (trạng thái mốc theo cut-off, slippage, ROS float, phase hiện tại, tổng hợp package, điểm rủi ro, từng insight rule); smart search tokenizer.
- **Fixture:** workbook nhỏ (~30 dòng) tạo bằng code trong test từ dữ liệu mẫu, gồm các ca bẩn. Không commit file dữ liệu thật.
- **Kiểm tra đối chiếu (thủ công, không commit dữ liệu):** script chạy parser trên file export thật, so với số ở mục 1: 8 discipline, 141 package hợp lệ, 573 dòng, 11 cảnh báo `INVALID_PACKAGE_CODE`, 3 cảnh báo `MISSING_FACILITY`, 7 dòng slipped. Các dòng code lỗi được gom vào package `UNCODED-<row>` và không tính vào số package hợp lệ trên KPI.
- **Component:** KPI strip, package table, drawer (render với plan fixture).
- **Smoke thủ công:** desktop / tablet / mobile, dark / light, trước mỗi bản phát hành.

## 13. Triển khai

- Build trên máy có internet: `npm run release` → thư mục `release/` gồm `public/` (dist), `server.js` (esbuild bundle, không cần node_modules), `config.json`, `README-deploy.md`.
- Server: cài Node LTS; copy `release/`; `node server.js`. Chạy như service bằng NSSM (Windows) hoặc systemd/pm2 (Linux).
- Máy người dùng cần truy cập `docs.google.com` và `*.googleusercontent.com`.
- Cache: `index.html` và `config.json` no-cache; asset có hash cache dài hạn.

## 14. Lộ trình sau v1

| Giai đoạn | Nội dung | Điểm mở rộng |
|---|---|---|
| v1.1 | Filter nâng cao (khoảng ngày, slippage > N, ROS < 0), highlight rule cấu hình được | store, `highlightRules` registry |
| v1.2 | Forecast 1 thời điểm (dự báo mốc thiếu từ duration chuẩn + độ trễ hiện tại), what-if | `analytics/forecast` |
| v2 | Server fetch/đọc file, lưu snapshot theo cut-off, `/api/data` | `ServerSource`, server routes |
| v2.1 | Trend & forecast theo lịch sử snapshot | analytics + server |
| v3 | LLM hỏi đáp qua `/api/ask`, dùng tool calling trên analytics (không để LLM tự tính số) | server + component chat |

Khi dữ liệu > 10k dòng: chuyển parser/analytics sang Web Worker, giữ nguyên interface.

## 15. Điều chỉnh sau kiểm chứng kỹ thuật (18-Sep-2026)

Khi lập kế hoạch, toàn bộ phần lõi đã được dựng thử và chạy trên file export thật. Các điều chỉnh dưới đây **thay thế** mô tả tương ứng ở các mục trên:

1. **Ngày dạng số nguyên (`Day`)**, không dùng `Date` (mục 5). Đọc với `cellDates: true` làm lệch 1 ngày ở múi giờ UTC+7 (14-Mar-2027 thành 13-Mar-2027). Parser đọc serial Excel thô và quy đổi thành số ngày kể từ 1970-01-01; serial nằm ngoài khoảng 2000–2100 bị coi là không hợp lệ.
2. **Định danh dòng FORECAST/ACTUAL:** hai dòng này là công thức tham chiếu dòng PLANNED, nên code/facility trống ở PLANNED hiện thành `0`. Parser coi trống, `0` và `None` là như nhau khi gom bộ 3 dòng. Kết quả trên dữ liệu thật: 0 dòng mồ côi, 0 bộ 3 dòng thiếu.
3. **Hai loại phase** (mục 6):
   - `currentPhase`: theo mốc đã có Actual (đúng như mục 6).
   - `scheduledPhase` (mới): phase của mốc mở đầu tiên có ngày mục tiêu ≥ cut-off, tức là theo kế hoạch dòng *đáng lẽ* đang ở đâu.

   Sheet hiện chưa có Actual nên mọi dòng đều ở TR theo `currentPhase`. Vì vậy **phase funnel mặc định dùng "Kế hoạch" và có nút chuyển sang "Actual"**; filter Phase và từ khóa phase trong ô tìm kiếm dùng `scheduledPhase`; bảng package hiển thị cả hai khi chúng khác nhau.
4. **`Line.hasValidCode`:** dòng có code trống/`0` được gom vào package `UNCODED-<row>` và không tính vào KPI Packages.
5. **Ngữ nghĩa tìm kiếm thông minh** (mục 7.1): từ khóa mốc (`loa`, `tbe`, `site`…) đi kèm khoảng thời gian (`2027`, `Q2-2027`, `Mar-2027`) nghĩa là "mốc đó rơi vào khoảng"; khoảng thời gian đứng một mình nghĩa là "mốc mở kế tiếp rơi vào khoảng".
6. **Ngôn ngữ giao diện:** tiếng Việt, giữ nguyên thuật ngữ chuyên ngành tiếng Anh (Package, Discipline, TR, RFQ, LOA, ROS, Forecast, Actual), thống nhất với các dashboard Excel hiện có.
7. **Mốc quá hạn** vẫn được tính (`overdue`) và thể hiện qua insight cùng cờ lọc, nhưng không có ô KPI riêng. Dải KPI giữ 5 ô như mục 7.2.
8. **config.json** chấp nhận cả link edit Google Sheet (tự đổi sang `export?format=xlsx`). Server đọc lại `config.json` ở mỗi request và có thêm `/healthz`. Trong gói release, `config.json` nằm cạnh `server.cjs`.
9. **Số liệu đối chiếu** (mục 1, cut-off 18-Sep-2026): 4 dòng ROS at risk (đều thuộc PIPELINE), 34 dòng có ô ngày không hợp lệ (`#####`).
