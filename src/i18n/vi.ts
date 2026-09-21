import type { Dictionary } from './en';

/**
 * Vietnamese dictionary. TypeScript fails the build if a key is missing or extra
 * (the `Dictionary` type is `Record<MessageKey, string>`, keyed off `en.ts`).
 */
export const vi: Dictionary = {
  // Data-source load errors (src/data/sources/sources.ts).
  'error.source.network': 'Không kết nối được tới nguồn dữ liệu. Kiểm tra kết nối internet của máy bạn.',
  'error.source.timeout': 'Hết thời gian chờ ({seconds}s) khi tải dữ liệu.',
  'error.source.aborted': 'Đã hủy tải dữ liệu.',
  'error.source.accessDenied': 'Nguồn dữ liệu từ chối truy cập. Sheet có thể không còn được chia sẻ công khai.',
  'error.source.accessDeniedHtml': 'Nguồn dữ liệu trả về trang web thay vì file Excel. Sheet có thể yêu cầu đăng nhập.',
  'error.source.notFound': 'Không tìm thấy nguồn dữ liệu (HTTP 404). Kiểm tra lại URL trong config.json.',
  'error.source.http': 'Nguồn dữ liệu trả lỗi HTTP {status}.',
  'error.source.notXlsx': 'Dữ liệu tải về không phải file Excel (XLSX).',
  'error.source.bodyNetwork': 'Mất kết nối khi đang tải dữ liệu.',

  // Config load/validation errors (src/config/config.ts).
  'error.config.notObject': 'config.json phải là một object JSON.',
  'error.config.missingDataSource': 'Thiếu "dataSources" trong config.json.',
  'error.config.badSource': '"dataSources.{module}" phải là một object.',
  'error.config.badType': '"dataSources.{module}.type" phải là "google-sheet" hoặc "server".',
  'error.config.missingUrl': 'Thiếu "dataSources.{module}.url" trong config.json.',
  'error.config.badDueSoon': '"dueSoonDays" phải là số nguyên dương.',
  'error.config.fetchFailed': 'Không tải được config.json từ server.',
  'error.config.http': 'Không tải được config.json (HTTP {status}).',
  'error.config.badJson': 'config.json không phải JSON hợp lệ.',

  // Workbook parse errors (src/data/parser/parsePlan.ts).
  'error.parse.notXlsx': 'Dữ liệu tải về không phải file Excel (XLSX).',
  'error.parse.corrupt': 'File Excel bị hỏng hoặc không đọc được (có thể tải về chưa trọn vẹn).',
  'error.parse.sheetNotFound': 'Không tìm thấy sheet "{sheet}". Các sheet hiện có: {sheets}',
  'error.parse.empty': 'Sheet "{sheet}" không có dữ liệu.',
  'error.parse.missingColumns': 'Thiếu cột bắt buộc: {columns}',

  // Load-error titles shown by the store (src/store/appStore.ts).
  'error.title.source': 'Không tải được dữ liệu',
  'error.title.config': 'Lỗi cấu hình',
  'error.title.parse': 'Dữ liệu không đúng cấu trúc',
  'error.title.unknown': 'Lỗi không xác định',
  'error.unknown': '{text}',

  // Data-quality warnings (src/data/parser/parsePlan.ts).
  'warning.invalidPackageCode': 'Package Code trống hoặc bằng 0 → gán {code}',
  'warning.missingFacility': '{code}: thiếu Facility',
  'warning.incompleteTriplet': '{code} @ {facility}: thiếu dòng {missing}',
  'warning.orphanRow': 'Dòng {rowType} không đi kèm dòng PLANNED tương ứng ({code})',
  'warning.unknownRowType': 'Giá trị cột Date không hợp lệ: "{value}"',
  'warning.missingRowType': 'Dòng có dữ liệu nhưng thiếu giá trị cột Date (PLANNED/FORECAST/ACTUAL)',
  'warning.invalidDate': '{code} @ {facility}: ngày không hợp lệ ở {columns}',
  'warning.unknownColumn': 'Bỏ qua cột không nhận diện: "{header}"',
  'warning.noDiscipline': 'Có dòng dữ liệu nằm trước tiêu đề discipline đầu tiên',

  // Loading-step detail (src/store/appStore.ts).
  'status.linesLoaded': '{count} dòng',

  // Insights (src/analytics/insights/rules/*.ts).
  'insight.rosRisk.title': '{count} dòng có nguy cơ trễ ROS',
  'insight.rosRisk.detail': 'Tập trung nhiều nhất ở {discipline} ({count} dòng). Nặng nhất: {line}, hàng về công trường trễ {days} ngày so với ROS.',
  'insight.slippage.title': '{count} dòng có Forecast trễ hơn Plan',
  'insight.slippage.detail': '{discipline} chiếm {count} dòng. Trượt trung bình {avg} ngày, lớn nhất {max} ngày ({line}).',
  'insight.overdue.title': '{count} mốc đã qua hạn nhưng chưa có Actual',
  'insight.overdue.detail': 'Trên {lines} dòng; nhiều nhất là {milestone} ({count}). Kiểm tra việc cập nhật dòng ACTUAL trong sheet.',
  'insight.dueSoon.title': '{count} mốc đến hạn trong {days} ngày tới',
  'insight.dueSoon.detail': 'Trên {lines} dòng. Nhiều nhất: {top}.',
  'insight.rosPushed.title': 'ROS đã bị dời trên {count} dòng',
  'insight.rosPushed.detail': 'Nhiều nhất {count} lần điều chỉnh. Dời xa nhất: {line}, tổng {days} ngày qua {times} lần.',
  'insight.workloadPeak.title': 'Đỉnh khối lượng: {month} có {count} mốc đến hạn',
  'insight.workloadPeak.detail': 'Gấp {ratio}× trung bình ({avg} mốc/tháng). Nhiều nhất là {milestone} ({count}).',

  // Header (src/ui/shell/Header.tsx).
  'header.language': 'Ngôn ngữ',
  'header.today': 'Hôm nay',
  'header.syncedJustNow': 'vừa xong',
  'header.syncedMinutesAgo': '{minutes} phút trước',
  'header.synced': 'Đồng bộ {time}',
  'header.syncing': 'Đang đồng bộ…',
  'header.staleData': 'Dữ liệu cũ',
  'header.reloadData': 'Tải lại dữ liệu',
  'header.themeToLight': 'Chuyển sang giao diện sáng',
  'header.themeToDark': 'Chuyển sang giao diện tối',

  // Filter bar (src/ui/shell/FilterBar.tsx).
  'filter.flag.rosRisk': 'Nguy cơ trễ ROS',
  'filter.flag.slipped': 'Forecast trễ Plan',
  'filter.flag.overdue': 'Có mốc quá hạn',
  'filter.flag.dueSoon': 'Có mốc sắp đến hạn',
  'filter.phaseLabel': 'Phase (kế hoạch)',
  'filter.flagsLabel': 'Cảnh báo',
  'filter.clear': 'Xóa bộ lọc',
  'filter.title': 'Bộ lọc',
  'filter.done': 'Xong',

  // Ask box (src/ui/shell/AskBox.tsx).
  'ask.srSearch': 'Tìm kiếm thông minh',
  'ask.placeholder': 'Ask PMS - PEIW…  ví dụ: PS2R LOA Q2-2027',
  'ask.clear': 'Xóa tìm kiếm',
  'ask.aiComingSoonTitle': 'Hỏi đáp bằng AI sẽ có ở phiên bản sau',
  'ask.aiComingSoon': 'AI chat · sắp ra mắt',
  'ask.understoodAs': 'Hiểu là:',

  // Common primitives (src/ui/common/*.tsx).
  'common.close': 'Đóng',
  'common.retry': 'Thử lại',
  'common.clearAll': 'Bỏ chọn tất cả',
  'common.row': 'dòng {row}',
  'unit.lines': 'dòng',
  'unit.weeks': 'tuần',
  'unit.milestones': 'mốc',
  'chip.status.done': 'Hoàn thành',
  'chip.status.overdue': 'Quá hạn',
  'chip.status.dueSoon': 'Sắp đến hạn',
  'chip.status.future': 'Chưa đến',
  'chip.status.noDate': 'Không có ngày',
  'errorBoundary.failed': 'Không hiển thị được “{label}”.',
  'errorBoundary.workloadLabel': 'Khối lượng theo tháng',
  'errorBoundary.packageListLabel': 'Danh sách package',
  'errorBoundary.rosHistoryLabel': 'Lịch sử ROS',
  'emptyState.message': 'Không có dòng nào khớp bộ lọc hiện tại.',

  // Overview — KPI strip (src/ui/overview/KpiStrip.tsx).
  'kpi.hint.packages': 'Số package có mã hợp lệ',
  'kpi.hint.lines': 'Số dòng Package × Facility',
  'kpi.hint.slipped': 'Dòng có Forecast trễ hơn Plan',
  'kpi.hint.rosAtRisk': 'Hàng về công trường sau ngày ROS',
  'kpi.hint.dueSoon': 'Số mốc đến hạn trong cửa sổ sắp tới',
  'kpi.daysSuffix': '{days} ngày',

  // Overview — insights (src/ui/overview/InsightsPanel.tsx).
  'insightsPanel.subtitle': 'Tự động phát hiện từ dữ liệu hiện tại · bấm “Why?” để xem bằng chứng',
  'insightsPanel.empty': 'Không phát hiện điểm bất thường nào với bộ lọc hiện tại.',
  'insightsPanel.severity.critical': 'Nghiêm trọng',
  'insightsPanel.severity.warning': 'Cần chú ý',
  'insightsPanel.severity.info': 'Thông tin',
  'insightsPanel.confidenceTitle': 'Tỷ lệ dòng có đủ dữ liệu cho phân tích này',
  'insightsPanel.hide': 'Ẩn',
  'insightsPanel.applyFilter': 'Lọc theo insight',
  'insightsPanel.andMore': '… và {count} dòng khác',

  // Overview — discipline grid (src/ui/overview/DisciplineGrid.tsx).
  'disciplineGrid.subtitle': 'Điểm = (ROS×2 + quá hạn×1.5 + trượt×1) / số dòng · bấm để xem chi tiết',
  'disciplineGrid.level.ok': 'Ổn định',
  'disciplineGrid.level.watch': 'Theo dõi',
  'disciplineGrid.level.risk': 'Rủi ro',

  // Overview — phase funnel (src/ui/overview/PhaseFunnel.tsx).
  'phaseFunnel.subtitleSchedule': 'Theo kế hoạch: dòng đáng lẽ đang ở phase nào tại cut-off',
  'phaseFunnel.subtitleActual': 'Theo Actual: phase dựa trên mốc đã ghi nhận thực tế · bấm cột chỉ lọc được ở chế độ Kế hoạch',
  'phaseFunnel.basisGroupLabel': 'Cơ sở tính phase',
  'phaseFunnel.basisSchedule': 'Kế hoạch',
  'phaseFunnel.chartAriaLabel': 'Số dòng theo phase',

  // Overview — phase timeline (src/ui/overview/PhaseTimeline.tsx).
  'phaseTimeline.title': 'Tiến độ theo phase',
  'phaseTimeline.subtitle': 'Actual / Plan hoàn thành tính đến cut-off · bấm vào milestone để xem danh sách',
  'phaseTimeline.nodeLabel': '{phase}: đã xong {actual} trên {plan}',
  'phaseTimeline.late': '{count} trễ',
  'phaseTimeline.nothingDue': 'Chưa có mốc đến hạn',

  // Overview — phase progress drawer (src/ui/overview/PhaseProgressDrawer.tsx).
  'phaseDrawer.summary': 'Đã xong {actual} / {plan} tính đến cut-off · {total} dòng có kế hoạch trong phase này',
  'phaseDrawer.tabsLabel': 'Trạng thái dòng',
  'phaseDrawer.tab.late': 'Trễ',
  'phaseDrawer.tab.done': 'Đã xong',
  'phaseDrawer.tab.all': 'Tất cả',
  'phaseDrawer.gate': 'Mốc',
  'phaseDrawer.delay': 'Δ ngày',
  'phaseDrawer.state.late': 'Trễ',
  'phaseDrawer.state.done': 'Đã xong',
  'phaseDrawer.state.ahead': 'Xong sớm',
  'phaseDrawer.state.pending': 'Chưa đến hạn',
  'phaseDrawer.empty': 'Không có dòng nào trong danh sách này.',

  // Overview — facility heatmap (src/ui/overview/FacilityHeatmap.tsx).
  'facilityHeatmap.title': 'Facility × Tháng',
  'facilityHeatmap.subtitle': 'Số mốc đến hạn theo facility và tháng',
  'facilityHeatmap.selectAriaLabel': 'Chọn mốc',
  'facilityHeatmap.allMilestones': 'Tất cả mốc',
  'facilityHeatmap.noData': 'Không có dữ liệu.',
  'facilityHeatmap.chartAriaLabel': 'Heatmap số mốc theo facility và tháng',

  // Overview — workload chart (src/ui/overview/WorkloadChart.tsx).
  'workloadChart.title': 'Khối lượng mốc theo tháng',
  'workloadChart.subtitle': 'TR · TBE · CBE · LOA · FAT/EXW · Site — theo ngày hiệu lực (Actual → Forecast → Plan)',
  'workloadChart.noData': 'Không có dữ liệu ngày.',
  'workloadChart.chartAriaLabel': 'Số mốc đến hạn theo tháng',

  // Discipline page (src/ui/discipline/DisciplinePage.tsx).
  'discipline.notFound': 'Không tìm thấy discipline “{name}”.',
  'discipline.backToOverview': 'Về tổng quan',
  'discipline.otherDisciplines': 'Discipline khác',
  'discipline.packagesSubtitle': 'Mặc định sắp theo rủi ro · bấm một dòng để xem chi tiết',

  // Package table (src/ui/discipline/PackageTable.tsx).
  'packageTable.package': 'Package',
  'packageTable.rosFloat': 'ROS float',
  'packageTable.nextMilestone': 'Mốc tiếp theo',
  'packageTable.maxSlip': 'Trượt max',
  'packageTable.risk': 'Rủi ro',
  'packageTable.overdueCount': '! {count} quá hạn',
  'packageTable.slipped': '● trượt',
  'packageTable.actualPhaseTitle': 'Phase theo mốc đã có Actual',

  // Package drawer (src/ui/package/PackageDrawer.tsx).
  'packageDrawer.notFound': 'Không tìm thấy package “{code}”',
  'packageDrawer.progressByFacility': 'Tiến độ theo facility',
  'packageDrawer.milestoneDetails': 'Chi tiết mốc',
  'packageDrawer.sourceRowLabel': 'Dòng trong sheet',
  'packageDrawer.rosHistoryTitle': 'Lịch sử ROS ({facility})',

  // Milestone table (src/ui/package/MilestoneTable.tsx).
  'milestoneTable.milestone': 'Mốc',
  'milestoneTable.deltaDays': 'Δ ngày',
  'milestoneTable.status': 'Trạng thái',

  // Mini Gantt (src/ui/package/MiniGantt.tsx).
  'miniGantt.legendForecast': '● Forecast (màu phase / trạng thái)',

  // ROS history (src/ui/package/RosHistory.tsx).
  'rosHistory.empty': 'Không có lịch sử ROS.',
  'rosHistory.ariaLabel': 'Lịch sử điều chỉnh ROS',

  // Loading screen (src/ui/states/LoadingScreen.tsx).
  'loading.preparing': 'Đang chuẩn bị dashboard…',
  'loading.step.config': 'Đọc cấu hình',
  'loading.step.fetch': 'Đồng bộ dữ liệu từ nguồn',
  'loading.step.parse': 'Phân tích cấu trúc Procurement Plan',
  'loading.step.analyze': 'Phát hiện rủi ro & tạo insight',

  // Error screen hints (src/ui/states/ErrorScreen.tsx).
  'error.hint.network': 'Máy của bạn cần truy cập được docs.google.com và *.googleusercontent.com.',
  'error.hint.accessDenied': 'Nhờ chủ sheet bật chia sẻ "Anyone with the link" (hoặc Publish to web) rồi thử lại.',
  'error.hint.notFound': 'Kiểm tra lại dataSource.url trong config.json trên server.',
  'error.hint.config': 'Sửa file config.json cạnh server.cjs trên server (hoặc public/config.json khi chạy dev) rồi tải lại trang.',
  'error.hint.missingColumns': 'Có thể tiêu đề cột trong sheet đã bị đổi tên. So sánh với cấu trúc chuẩn trong tài liệu.',
  'error.codeLabel': 'mã lỗi: {code}',

  // Data Health panel (src/ui/health/DataHealthPanel.tsx).
  'health.code.invalidPackageCode': 'Package Code trống / bằng 0',
  'health.code.missingFacility': 'Thiếu Facility',
  'health.code.incompleteTriplet': 'Thiếu dòng FORECAST/ACTUAL',
  'health.code.orphanRow': 'Dòng FORECAST/ACTUAL lạc',
  'health.code.unknownRowType': 'Giá trị cột Date lạ',
  'health.code.invalidDate': 'Ô ngày không hợp lệ (#####, 00/Jan/00…)',
  'health.code.unknownColumn': 'Cột không nhận diện',
  'health.code.noDiscipline': 'Dòng nằm ngoài discipline',
  'health.subtitle': 'Các vấn đề chất lượng dữ liệu phát hiện khi đọc sheet. App vẫn hiển thị các dòng này.',
  'health.empty': '✓ Không phát hiện vấn đề nào.',

  // Engineering placeholder page (src/ui/engineering/EngineeringPage.tsx).
  'engineering.placeholder.title': 'Engineering',
  'engineering.placeholder.detail': 'Đã tải {rows} dòng từ sheet “{sheet}”. Nội dung dashboard Engineering sẽ được thiết kế ở buổi sau.',

  // Modules and the shared sidebar (src/modules, src/ui/shell/Sidebar.tsx).
  'module.procurement': 'Procurement',
  'module.engineering': 'Engineering',
  'module.unconfigured.title': 'Chưa cấu hình nguồn dữ liệu',
  'module.unconfigured.detail': 'Thêm "dataSources.{id}" vào config.json để tải dashboard {module}.',
  'sidebar.label': 'Dashboard',
  'sidebar.collapse': 'Thu gọn thanh bên',
  'sidebar.expand': 'Mở rộng thanh bên',
  'sidebar.open': 'Mở menu',
  'notFound.title': 'Không tìm thấy trang.',
  'notFound.back': 'Về dashboard',
  'routeError.title': 'Không tải được trang này',
  'routeError.detail': 'Ứng dụng có thể vừa được cập nhật. Tải lại trang để lấy phiên bản mới nhất.',
  'routeError.reload': 'Tải lại trang',
  'filter.discipline': 'Discipline',
  'filter.facility': 'Facility',
  'filter.itemType': 'Tagged/Bulk',
};
