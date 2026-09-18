# PMS - PEIW

Dashboard kế hoạch mua sắm (Procurement Plan) cho dự án dầu khí. Đọc dữ liệu trực tiếp từ Google Sheet, trình bày tổng quan → discipline → package, kèm AI Insights dựa trên luật.

## Phát triển

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component tests
npm run typecheck
```

Dev server đọc `public/config.json`.

## Kiến trúc

```
src/
├── lib/day.ts            # Ngày dạng số nguyên, không phụ thuộc múi giờ
├── config/               # Đọc & kiểm tra config.json
├── data/
│   ├── milestones.ts     # Danh mục mốc & phase — sửa tên cột ở đây
│   ├── sources/          # DataSource: Google Sheet | Server (v2)
│   └── parser/           # Workbook → Plan (hàm thuần)
├── analytics/            # Chỉ số, lọc, tìm kiếm, tổng hợp, insight (hàm thuần)
│   └── insights/rules/   # Mỗi insight một file; đăng ký trong registry.ts
├── store/                # Zustand: tải dữ liệu, cut-off, theme; filter nằm trên URL
└── ui/                   # React: shell, overview, discipline, package drawer
server/                   # Fastify: phục vụ file tĩnh + config.json
```

Thêm insight: tạo file trong `src/analytics/insights/rules/`, thêm vào `INSIGHT_RULES`.
Đổi nguồn dữ liệu: sửa `dataSource` trong `config.json`.

## Triển khai

Xem [docs/deploy.md](docs/deploy.md).

## Tài liệu thiết kế

- Spec: `docs/superpowers/specs/2026-09-18-procurement-dashboard-design.md`
- Kế hoạch: `docs/superpowers/plans/2026-09-18-procurement-dashboard.md`
