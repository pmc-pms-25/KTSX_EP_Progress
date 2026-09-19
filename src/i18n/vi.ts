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
  'error.config.missingDataSource': 'Thiếu "dataSource" trong config.json.',
  'error.config.badType': '"dataSource.type" phải là "google-sheet" hoặc "server".',
  'error.config.missingUrl': 'Thiếu "dataSource.url" trong config.json.',
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
};
