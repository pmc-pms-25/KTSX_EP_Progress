/**
 * Source dictionary: English is authored here first. `vi.ts` must carry the exact
 * same set of keys (enforced by the `Dictionary` type and a runtime test).
 */
export const en = {
  // Data-source load errors (src/data/sources/sources.ts).
  'error.source.network': 'Could not connect to the data source. Check your internet connection.',
  'error.source.timeout': 'Timed out ({seconds}s) while loading data.',
  'error.source.aborted': 'Data load canceled.',
  'error.source.accessDenied': 'The data source denied access. The sheet may no longer be shared publicly.',
  'error.source.accessDeniedHtml': 'The data source returned a web page instead of an Excel file. The sheet may require sign-in.',
  'error.source.notFound': 'Data source not found (HTTP 404). Check the URL in config.json.',
  'error.source.http': 'The data source returned HTTP error {status}.',
  'error.source.notXlsx': 'The downloaded data is not an Excel (XLSX) file.',
  'error.source.bodyNetwork': 'Connection lost while downloading data.',

  // Config load/validation errors (src/config/config.ts).
  'error.config.notObject': 'config.json must be a JSON object.',
  'error.config.missingDataSource': 'Missing "dataSource" in config.json.',
  'error.config.badType': '"dataSource.type" must be "google-sheet" or "server".',
  'error.config.missingUrl': 'Missing "dataSource.url" in config.json.',
  'error.config.badDueSoon': '"dueSoonDays" must be a positive integer.',
  'error.config.fetchFailed': 'Could not load config.json from the server.',
  'error.config.http': 'Could not load config.json (HTTP {status}).',
  'error.config.badJson': 'config.json is not valid JSON.',

  // Workbook parse errors (src/data/parser/parsePlan.ts).
  'error.parse.notXlsx': 'The downloaded data is not an Excel (XLSX) file.',
  'error.parse.corrupt': 'The Excel file is corrupt or unreadable (the download may be incomplete).',
  'error.parse.sheetNotFound': 'Sheet "{sheet}" not found. Available sheets: {sheets}',
  'error.parse.empty': 'Sheet "{sheet}" has no data.',
  'error.parse.missingColumns': 'Missing required columns: {columns}',

  // Load-error titles shown by the store (src/store/appStore.ts).
  'error.title.source': 'Could not load data',
  'error.title.config': 'Configuration error',
  'error.title.parse': 'Data has an invalid structure',
  'error.title.unknown': 'Unknown error',
  'error.unknown': '{text}',

  // Data-quality warnings (src/data/parser/parsePlan.ts).
  'warning.invalidPackageCode': 'Package Code is empty or 0 → assigned {code}',
  'warning.missingFacility': '{code}: missing Facility',
  'warning.incompleteTriplet': '{code} @ {facility}: missing {missing} row',
  'warning.orphanRow': '{rowType} row without a matching PLANNED row ({code})',
  'warning.unknownRowType': 'Invalid Date column value: "{value}"',
  'warning.missingRowType': 'Row has data but is missing a Date column value (PLANNED/FORECAST/ACTUAL)',
  'warning.invalidDate': '{code} @ {facility}: invalid date in {columns}',
  'warning.unknownColumn': 'Ignoring unrecognized column: "{header}"',
  'warning.noDiscipline': 'Row appears before the first discipline heading',

  // Loading-step detail (src/store/appStore.ts).
  'status.linesLoaded': '{count} lines',

  // Insights (src/analytics/insights/rules/*.ts).
  'insight.rosRisk.title': '{count} line at risk of missing ROS',
  'insight.rosRisk.detail': 'Concentrated mostly in {discipline} ({count} lines). Worst: {line}, cargo is {days} days late against ROS.',
  'insight.slippage.title': '{count} line with Forecast later than Plan',
  'insight.slippage.detail': '{discipline} accounts for {count} lines. Average slip {avg} days, worst {max} days ({line}).',
  'insight.overdue.title': '{count} milestone overdue without an Actual',
  'insight.overdue.detail': 'Across {lines} lines; most common is {milestone} ({count}). Check that ACTUAL rows are being updated in the sheet.',
  'insight.dueSoon.title': '{count} milestone due within the next {days} days',
  'insight.dueSoon.detail': 'Across {lines} lines. Most common: {top}.',
  'insight.rosPushed.title': 'ROS has been pushed on {count} line',
  'insight.rosPushed.detail': 'Up to {count} adjustments. Pushed furthest: {line}, {days} days total across {times} changes.',
  'insight.workloadPeak.title': 'Workload peak: {month} has {count} milestones due',
  'insight.workloadPeak.detail': '{ratio}× the average ({avg} milestones/month). Most common is {milestone} ({count}).',
} as const;

export type MessageKey = keyof typeof en;
export type Dictionary = Record<MessageKey, string>;
