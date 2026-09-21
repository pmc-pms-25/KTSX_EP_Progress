# PMS - PEIW — Multi-module Shell (Engineering + Procurement): Design Spec

- **Ngày:** 2026-09-21
- **Nhánh:** `feat/multi-module-shell`
- **Trạng thái:** Đã duyệt thiết kế, chờ review spec
- **Phạm vi spec này:** tái cấu trúc khung ứng dụng thành nhiều module (dashboard) dùng chung một giao diện; thêm sidebar; thêm module ENGINEERING ở dạng khung tạm. Nội dung nghiệp vụ Engineering sẽ có spec riêng.

## 1. Mục tiêu

App hiện chỉ có một dashboard (Procurement) và toàn bộ lớp dùng chung (store, Header, FilterBar, URL filter) gắn chặt vào dữ liệu Procurement. Sắp tới sẽ có nhiều dashboard, mỗi dashboard một nguồn dữ liệu và nghiệp vụ riêng, nhưng phải giữ **một giao diện thống nhất**.

### Tiêu chí thành công
1. Sidebar bên trái có 2 mục: **ENGINEERING** (`#/engineering`) và **PROCUREMENT** (`#/procurement`); desktop thu gọn được, mobile mở bằng nút ☰.
2. Procurement chạy y như hiện tại, chỉ đổi URL; link cũ (`#/?d=…`, `#/discipline/X`) vẫn mở đúng màn hình.
3. Engineering tải được một file XLSX riêng (Google Sheet khác hoặc file đặt trên server) qua pipeline chung, hiển thị trang khung tạm.
4. Theme sáng/tối, EN/VI, cut-off dùng chung cho mọi module; mỗi module có filter, Data Health, Refresh riêng.
5. Thêm một dashboard mới **không cần sửa** Shell/Header/Sidebar/FilterBar (xem mục 9).
6. `npm run build` và `npm test` xanh; kiểm tra tay sáng/tối, EN/VI, mobile.

### Ngoài phạm vi
Nội dung và facet của Engineering; chọn file Excel từ máy người dùng; trang index riêng tại `#/`; nhóm menu trên sidebar; tách component dùng chung giữa các dashboard (KpiStrip…) — để phase sau.

## 2. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Nguồn dữ liệu Engineering khai báo trong `config.json` (Google Sheet export hoặc URL trên server), cùng kiểu với Procurement | Tái dùng `DataSource` có sẵn; file picker có thể thêm sau như một loại source mới |
| D2 | Mỗi module giữ filter riêng; chuyển module rồi quay lại thì khôi phục filter cũ của module đó | Danh mục Discipline/Facility giữa các sheet có thể khác nhau |
| D3 | Cut-off dùng chung; Data Health, Refresh/sync, AskBox theo module đang xem | Cut-off là ngày báo cáo của cả dự án |
| D4 | Tải dữ liệu khi cần (lần đầu vào module), giữ lại trong phiên | Không chờ nguồn không dùng tới; lỗi nguồn này không ảnh hưởng module khác |
| D5 | URL `#/procurement`, `#/engineering`; `#/` tạm redirect sang `/procurement` | Sẽ có trang index sau |
| D6 | Filter URL theo chuẩn phổ biến: key tên đầy đủ, nhiều giá trị thì lặp key | Dễ đọc; không vỡ khi giá trị chứa dấu phẩy |
| D7 | Kiến trúc: module registry + một store mỗi module sinh từ factory chung | Mở rộng được, cô lập lỗi, test độc lập |
| D8 | Siết thống nhất giao diện: FilterBar vẽ từ schema, bắt buộc dùng UI kit chung, tải code theo module | Giữ một giao diện khi số dashboard tăng |

## 3. Kiến trúc tổng quan

```
App.tsx (routes tập trung, createHashRouter)
└─ AppShell  ── Sidebar · Header · FilterBar · <main><Outlet/></main> · DataHealthPanel
   ├─ LegacyRedirect          (#/ và #/discipline/:name)
   ├─ ModuleRoute(procurement, overlay=PackageDrawer)
   │    ├─ OverviewPage        (lazy)
   │    └─ DisciplinePage      (lazy)
   ├─ ModuleRoute(engineering)
   │    └─ EngineeringPage     (lazy)
   └─ NotFound

appStore (chung)             moduleStores (mỗi module một store)
 config · theme · lang        procurementStore: Plan
 cutOff · sidebarCollapsed    engineeringStore: WorkbookSummary
 lastQuery[moduleId]
```

Shell/Header/Sidebar/FilterBar chỉ đọc `ModuleDefinition` của module đang active (qua context do `ModuleRoute` cung cấp), không import gì riêng của Procurement hay Engineering.

## 4. Store

### 4.1 `appStore` (thu gọn)
- `configStatus: 'idle' | 'loading' | 'ready' | 'error'`, `config?: AppConfig`, `configError?: LoadError`, `loadConfig()`.
- `theme`, `lang`, `cutOff`, `sidebarCollapsed` — `theme`, `lang`, `sidebarCollapsed` lưu localStorage (key `pms-peiw-sidebar`), truy cập bọc try/catch như hiện tại.
- `lastQuery: Partial<Record<ModuleId, string>>` — chỉ giữ trong memory; `setLastQuery(id, query)`.
- `setCutOff` chỉ đổi `cutOff`, **không** tính lại metrics.

### 4.2 `createModuleStore<T>(deps)` — `src/store/moduleStore.ts`
State:
```ts
status: 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'
refreshing: boolean
step: LoadStep; stepDetail?: Message
data?: T
warnings: DataWarning[]
lastSync?: Date
error?: LoadError; refreshError?: LoadError
load(): Promise<void>
```
Deps: `{ moduleId, loader, getConfig, now }`. Loader:
```ts
type ModuleLoader<T> = (
  source: DataSourceConfig,
  ctx: { signal: AbortSignal; now: Date; config: AppConfig; onStep(step: LoadStep, detail?: Message): void },
) => Promise<{ data: T; warnings: DataWarning[] }>;
```
Hành vi `load()` chuyển nguyên từ `appStore.load()` hiện tại: abort lần tải trước; lần đầu `loading`, lần sau `refreshing` trên dữ liệu cũ; refresh lỗi thì giữ dữ liệu cũ và đặt `refreshError`; lỗi khi chưa có dữ liệu thì `error`. `toLoadError` và cách phân loại `SourceError` / `ConfigError` / `ParseError` chuyển theo. Không có nguồn trong `config.dataSources[moduleId]` → `status: 'unconfigured'`, không gọi loader.

### 4.3 Metrics ra khỏi store
Procurement store chỉ giữ `Plan`. `useDashboard()` tính `computeAllMetrics(plan.lines, { cutOff, dueSoonDays })` bằng `useMemo` theo `plan`, `cutOff`, `dueSoonDays`. Cut-off (chung) và dữ liệu (module) vì vậy tách rời.

## 5. Module contract — `src/modules/`

```ts
// src/modules/types.ts
export type ModuleId = 'procurement' | 'engineering';
export type Translate = ReturnType<typeof useT>['t'];

export interface FacetDef<T> {
  key: string;                                   // URL key, ví dụ 'discipline'
  labelKey: MessageKey;
  options(data: T, t: Translate): { value: string; label: string }[];
}

export interface ModuleDefinition<T> {
  id: ModuleId;
  path: string;                                  // '/procurement'
  labelKey: MessageKey;                          // 'module.procurement'
  icon: string;                                  // ký tự đơn giản, cùng kiểu ◈
  store: ModuleStore<T>;
  facets: FacetDef<T>[];                         // [] → FilterBar ẩn
  search?: { useSearch(): { value: string; vocab: SearchVocabulary; onChange(q: string): void } };
  useResultCount?(): { shown: number; total: number; unitKey: MessageKey };
}
```
- `src/modules/registry.ts`: `export const modules = [engineering, procurement]` — thứ tự hiển thị trên sidebar.
- `src/modules/procurement.ts`, `src/modules/engineering.ts`: định nghĩa từng module.
- `ModuleContext` + `useActiveModule()` (trả `undefined` ngoài module, ví dụ trang 404).
- Route **không** nằm trong `ModuleDefinition`: route khai báo tập trung trong `App.tsx` theo quy ước dự án.

Procurement khai báo 5 facet: `discipline`, `facility`, `type` (Tagged/Bulk), `phase`, `flag`; có `search` (AskBox) và `useResultCount` (đơn vị `unit.lines`). Engineering: `facets: []`, không `search`, không `useResultCount`.

## 6. Routing và URL

### 6.1 Routes (`src/App.tsx`)
```tsx
{ path: '/', element: <AppShell />, children: [
  { index: true, element: <LegacyRedirect /> },
  { path: 'discipline/:name', element: <LegacyRedirect /> },
  { path: 'procurement', element: <ModuleRoute module={procurement} overlay={<PackageDrawer />} />, children: [
    { index: true, lazy: () => import('./ui/overview/OverviewPage').then((m) => ({ Component: m.OverviewPage })) },
    { path: 'discipline/:name', lazy: () => import('./ui/discipline/DisciplinePage').then((m) => ({ Component: m.DisciplinePage })) },
  ]},
  { path: 'engineering', element: <ModuleRoute module={engineering} />, children: [
    { index: true, lazy: () => import('./ui/engineering/EngineeringPage').then((m) => ({ Component: m.EngineeringPage })) },
  ]},
  { path: '*', element: <NotFound /> },
]}
```

### 6.2 `ModuleRoute` — `src/ui/shell/ModuleRoute.tsx`
- Cung cấp `ModuleContext`.
- `useEffect`: nếu `store.status === 'idle'` và config đã sẵn sàng → `store.load()`.
- Render theo status: `loading` → `LoadingScreen`; `error` → `ErrorScreen`; `unconfigured` → màn hình "Chưa cấu hình nguồn dữ liệu cho {module}"; `ready` → `<Outlet/>` + `overlay`.
- Khi `location.search` đổi: lọc chỉ các key filter của module (`facets[].key` + `q`) → `setLastQuery(id, …)`.

### 6.3 Định dạng URL
```
#/procurement?discipline=Piping&discipline=Civil&facility=CPP&flag=rosRisk&q=…&pkg=P-101
```
| Loại | Key | Ghi chú |
|---|---|---|
| Filter | `discipline`, `facility`, `type`, `phase`, `flag`, `q` | Lặp key cho nhiều giá trị; không ghi giá trị rỗng; giá trị lạ bị bỏ qua |
| Trạng thái UI | `pkg`, `milestone` | Giữ trong link chia sẻ; **không** lưu vào `lastQuery` |

Đổi filter → `replace`; mở drawer → `push` (giữ như hiện tại). `src/store/urlFilters.ts` viết lại theo key mới (`getAll` / `append`).

### 6.4 `LegacyRedirect` — `src/ui/shell/LegacyRedirect.tsx`
- Dịch key cũ dạng nối phẩy sang key mới: `d→discipline`, `f→facility`, `t→type`, `p→phase`, `flag` (phẩy) → `flag` (lặp key). Giữ `q`, `pkg`, `milestone`.
- `#/?…` → `/procurement?…`; `#/discipline/:name?…` → `/procurement/discipline/:name?…`; điều hướng `replace`.
- Là nơi duy nhất biết định dạng cũ. Khi có trang index thật, chỉ route `index` đổi; nhánh dịch `?d=` có thể giữ cho link cũ.

### 6.5 Link nội bộ cần cập nhật
`DisciplineGrid` (link sang discipline), `DisciplinePage` (link quay về + nav discipline khác), logo `Header` (→ `/`). Link con dựng từ `module.path`.

## 7. Shell, Sidebar, Header, FilterBar

### 7.1 `AppShell`
```
┌──────────┬───────────────────────────────┐
│ Sidebar  │ Header                        │
│ (nav)    │ FilterBar (nếu có facet)      │
│          │ <main><Outlet/></main>        │
└──────────┴───────────────────────────────┘
```
- Tải config (`appStore.loadConfig()`), áp `data-theme`, `lang`, `document.title`, cuộn lên đầu khi đổi `pathname` — như hiện tại.
- Config đang tải / lỗi → `<main>` hiện `LoadingScreen` / `ErrorScreen`.
- `PackageDrawer` chuyển ra khỏi AppShell (thành `overlay` của route procurement).
- `DataHealthPanel` ở lại Shell, nhận `warnings` của module active qua props.
- Container nội dung giữ `max-w-[1600px]`.

### 7.2 `Sidebar` — `src/ui/shell/Sidebar.tsx`
- Desktop (`md+`): `<nav>` `sticky top-0 h-screen border-r border-line bg-bg`; `w-56`, thu gọn `w-14` (chỉ icon, nhãn chuyển thành `title`/`aria-label`); nút thu gọn ở đáy, `aria-expanded`.
- Mục: `NavLink` tới `{ pathname: module.path, search: lastQuery[id] ?? '' }`; nhãn `t(module.labelKey)` chữ hoa `tracking-wide`. Active (theo tiền tố path): `bg-ai-1/10 text-ink` + vạch nhấn trái màu `ai-1`; không active: `text-ink-3 hover:text-ink`. Chỉ dùng class token có sẵn, không thêm hex.
- Mobile: ẩn; nút ☰ trên Header mở sidebar dạng drawer trái. Tái dùng `common/Drawer` bằng cách thêm prop `side?: 'left' | 'right'` (mặc định `'right'`, không đổi hành vi hiện có). Chọn mục → đóng.

### 7.3 `Header`
| Thành phần | Hành vi |
|---|---|
| ☰ | Chỉ hiện dưới `md`, mở sidebar |
| Logo | Link `/` |
| Dòng phụ | `{projectName} · {t(module.labelKey)}` (bỏ chữ cứng "Procurement Intelligence") |
| AskBox | Chỉ khi `module.search` tồn tại |
| Cut-off, theme, EN/VI | Chung, không đổi |
| Data Health, Refresh, "đồng bộ x phút" | Theo store module active; ẩn khi không có module (404) |

### 7.4 `FilterBar` (chung, vẽ theo schema)
- Mỗi `FacetDef` → một `MultiSelect`, nhãn `t(labelKey)`, lựa chọn `facet.options(data, t)`.
- Giữ nguyên: nút Clear, badge đếm, bottom sheet trên mobile, không `backdrop-filter`.
- Bộ đếm "shown / total unit" từ `module.useResultCount?.()`; không có thì không hiện.
- Hook `useFacetParams(facets)` đọc/ghi URL (`getAll`, lặp key, `replace`). Procurement có adapter chuyển sang kiểu `Filters` để `applyFilters`/`useDashboard` không đổi logic.
- Hiện khi module có ≥ 1 facet **và** store `ready`.

## 8. Config, Engineering tạm, i18n

### 8.1 `config.json`
```json
{
  "appName": "PMS - PEIW",
  "projectName": "Maydan Mahzam",
  "dueSoonDays": 30,
  "dataSources": {
    "procurement": { "type": "google-sheet", "url": "…/export?format=xlsx", "sheetName": "ALL" },
    "engineering": { "type": "server", "url": "data/engineering.xlsx" }
  }
}
```
`AppConfig.dataSources: Partial<Record<ModuleId, DataSourceConfig>>` (bỏ `dataSource`). `parseConfig`:
- Chỉ có `dataSource` cũ → coi là `dataSources.procurement`.
- Không có cả hai → `error.config.missingDataSource` (như cũ).
- Mỗi nguồn kiểm tra `type`/`url` như cũ; thông báo có `{module}`.
- Key lạ trong `dataSources` bị bỏ qua.

Cập nhật `public/config.json` và `docs/deploy.md`.

### 8.2 Engineering tạm
- `src/data/engineering/loadWorkbookSummary.ts`: `createDataSource(source).load(signal)` → `XLSX.read` (thư viện `xlsx` đang dùng) → `{ sheetName, sheets, rowCount }` (sheet theo `source.sheetName`, mặc định sheet đầu). Không phải XLSX → lỗi `error.parse.notXlsx`; sheet không tồn tại → `error.parse.sheetNotFound`.
- `src/ui/engineering/EngineeringPage.tsx`: `<Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">` → `<ErrorBoundary>` → `<Card title={t('engineering.placeholder.title')}>` với `t('engineering.placeholder.detail', { rows, sheet })`.

### 8.3 Key i18n mới (`en.ts` + `vi.ts`)
`module.procurement`, `module.engineering`, `module.unconfigured.title`, `module.unconfigured.detail` (`{module}`), `sidebar.collapse`, `sidebar.expand`, `sidebar.open`, `sidebar.close`, `filter.discipline`, `filter.facility`, `filter.itemType` (thay nhãn cứng trong FilterBar), `notFound.title`, `notFound.back`, `engineering.placeholder.title`, `engineering.placeholder.detail` (`{rows}`, `{sheet}`). Thêm `{module}` vào `error.config.badType`, `error.config.missingUrl`.

## 9. Quy tắc thêm dashboard mới
1. `src/data/<id>/` — loader trả `{ data, warnings }`.
2. `src/modules/<id>.ts` — `ModuleDefinition`; thêm id vào `ModuleId` và vào `registry.ts`.
3. `src/ui/<id>/` — trang dùng `Stagger`/`Card`/`ErrorBoundary`/`EChart`… và class token màu; không tự viết header/layout/filter bar/loading.
4. Route con trong `App.tsx` (bọc `ModuleRoute`, trang `lazy`).
5. Key i18n tiền tố `<id>.*` ở `en.ts` + `vi.ts`.
6. `dataSources.<id>` trong `config.json`.

Giới hạn đã biết: sidebar ≥ ~8 mục nên có trường `group` tùy chọn; dictionary i18n có thể tách file theo module khi quá lớn — cả hai không đổi kiến trúc.

## 10. Kiểm thử (Vitest + Testing Library, TDD)

| Phần | Kiểm tra |
|---|---|
| `createModuleStore` | Chuyển test load từ `appStore.test.ts`: abort, refresh lỗi giữ dữ liệu, lỗi parse, lỗi nguồn; `unconfigured` không gọi loader |
| `appStore` | theme/lang/sidebarCollapsed lưu trữ (kể cả storage bị chặn), cutOff, lastQuery, loadConfig |
| `parseConfig` | `dataSources`; `dataSource` cũ; lỗi theo nguồn có `{module}`; key lạ bị bỏ qua |
| `urlFilters` / `useFacetParams` | lặp key; giá trị chứa dấu phẩy; round-trip; giữ `pkg`/`milestone`; giá trị lạ bị bỏ |
| `LegacyRedirect` | `#/?d=A,B&pkg=X` → `#/procurement?discipline=A&discipline=B&pkg=X`; `#/discipline/X?f=C` → `#/procurement/discipline/X?facility=C` |
| `ModuleRoute` | Vào Procurement không gọi loader Engineering; Loading/Error/Unconfigured đúng; ghi `lastQuery` chỉ key filter |
| `Sidebar` | active theo tiền tố path; khôi phục filter theo module; thu gọn được lưu; mở/đóng trên mobile |
| `Header` | dòng phụ theo module; AskBox ẩn ở Engineering; Refresh gọi store module active |
| `FilterBar` | vẽ đúng facet; ẩn khi `facets: []` |
| Test hiện có | `app.test`, `overview`, `discipline`, `phaseTimeline`, `AskBox`, i18n cập nhật sang URL/store mới |

Hoàn tất khi: `npm run build` và `npm test` xanh; chạy app kiểm tra sáng/tối, EN/VI, mobile (≤ 390px), link cũ.
