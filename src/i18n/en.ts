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
  'error.config.missingDataSource': 'Missing "dataSources" in config.json.',
  'error.config.badSource': '"dataSources.{module}" must be an object.',
  'error.config.badType': '"dataSources.{module}.type" must be "google-sheet" or "server".',
  'error.config.missingUrl': 'Missing "dataSources.{module}.url" in config.json.',
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
  'status.linesLoaded': '{count} {count|line|lines}',

  // Insights (src/analytics/insights/rules/*.ts).
  'insight.rosRisk.title': '{count} {count|line|lines} at risk of missing ROS',
  'insight.rosRisk.detail': 'Concentrated mostly in {discipline} ({count} {count|line|lines}). Worst: {line}, cargo is {days} {days|day|days} late against ROS.',
  'insight.slippage.title': '{count} {count|line|lines} with Forecast later than Plan',
  'insight.slippage.detail': '{discipline} accounts for {count} {count|line|lines}. Average slip {avg} {avg|day|days}, worst {max} {max|day|days} ({line}).',
  'insight.overdue.title': '{count} {count|milestone|milestones} overdue without an Actual',
  'insight.overdue.detail': 'Across {lines} {lines|line|lines}; most common is {milestone} ({count}). Check that ACTUAL rows are being updated in the sheet.',
  'insight.dueSoon.title': '{count} {count|milestone|milestones} due within the next {days} {days|day|days}',
  'insight.dueSoon.detail': 'Across {lines} {lines|line|lines}. Most common: {top}.',
  'insight.rosPushed.title': 'ROS has been pushed on {count} {count|line|lines}',
  'insight.rosPushed.detail': 'Up to {count} {count|adjustment|adjustments}. Pushed furthest: {line}, {days} {days|day|days} total across {times} {times|change|changes}.',
  'insight.workloadPeak.title': 'Workload peak: {month} has {count} {count|milestone|milestones} due',
  'insight.workloadPeak.detail': '{ratio}× the average ({avg} milestones/month). Most common is {milestone} ({count}).',

  // Header (src/ui/shell/Header.tsx).
  'header.language': 'Language',
  'header.today': 'Today',
  'header.syncedJustNow': 'just now',
  'header.syncedMinutesAgo': '{minutes} min ago',
  'header.synced': 'Synced {time}',
  'header.syncing': 'Syncing…',
  'header.staleData': 'Stale data',
  'header.reloadData': 'Reload data',
  'header.themeToLight': 'Switch to light theme',
  'header.themeToDark': 'Switch to dark theme',

  // Filter bar (src/ui/shell/FilterBar.tsx).
  'filter.flag.rosRisk': 'ROS at risk',
  'filter.flag.slipped': 'Forecast later than Plan',
  'filter.flag.overdue': 'Has an overdue milestone',
  'filter.flag.dueSoon': 'Has a milestone due soon',
  'filter.phaseLabel': 'Phase (schedule)',
  'filter.flagsLabel': 'Flags',
  'filter.clear': 'Clear filters',
  'filter.title': 'Filters',
  'filter.done': 'Done',

  // Ask box (src/ui/shell/AskBox.tsx).
  'ask.srSearch': 'Smart search',
  'ask.placeholder': 'Ask PMS - PEIW…  e.g. PS2R LOA Q2-2027',
  'ask.clear': 'Clear search',
  'ask.aiComingSoonTitle': 'AI Q&A coming in a future version',
  'ask.aiComingSoon': 'AI chat · coming soon',
  'ask.understoodAs': 'Understood as:',

  // Common primitives (src/ui/common/*.tsx).
  'common.close': 'Close',
  'common.retry': 'Try again',
  'common.clearAll': 'Clear all',
  'common.row': 'row {row}',
  'unit.lines': '{n|line|lines}',
  'unit.weeks': '{n|week|weeks}',
  'unit.milestones': '{n|milestone|milestones}',
  'chip.status.done': 'Done',
  'chip.status.overdue': 'Overdue',
  'chip.status.dueSoon': 'Due soon',
  'chip.status.future': 'Upcoming',
  'chip.status.noDate': 'No date',
  'errorBoundary.failed': 'Could not display “{label}”.',
  'errorBoundary.workloadLabel': 'Monthly workload',
  'errorBoundary.packageListLabel': 'Package list',
  'errorBoundary.rosHistoryLabel': 'ROS history',
  'emptyState.message': 'No lines match the current filters.',

  // Overview — KPI strip (src/ui/overview/KpiStrip.tsx).
  'kpi.hint.packages': 'Packages with a valid code',
  'kpi.hint.lines': 'Package × Facility line count',
  'kpi.hint.slipped': 'Lines with Forecast later than Plan',
  'kpi.hint.rosAtRisk': 'Cargo arriving on site after the ROS date',
  'kpi.hint.dueSoon': 'Milestones due within the upcoming window',
  'kpi.daysSuffix': '{days} {days|day|days}',

  // Overview — insights (src/ui/overview/InsightsPanel.tsx).
  'insightsPanel.subtitle': 'Automatically detected from the current data · click “Why?” to see the evidence',
  'insightsPanel.empty': 'No anomalies detected with the current filters.',
  'insightsPanel.severity.critical': 'Critical',
  'insightsPanel.severity.warning': 'Needs attention',
  'insightsPanel.severity.info': 'Info',
  'insightsPanel.confidenceTitle': 'Share of lines with enough data for this analysis',
  'insightsPanel.hide': 'Hide',
  'insightsPanel.applyFilter': 'Apply insight filter',
  'insightsPanel.andMore': '… and {count} more {count|line|lines}',

  // Overview — discipline grid (src/ui/overview/DisciplineGrid.tsx).
  'disciplineGrid.subtitle': 'Score = (ROS×2 + overdue×1.5 + slip×1) / line count · click for details',
  'disciplineGrid.level.ok': 'Stable',
  'disciplineGrid.level.watch': 'Watch',
  'disciplineGrid.level.risk': 'At risk',

  // Overview — phase funnel (src/ui/overview/PhaseFunnel.tsx).
  'phaseFunnel.subtitleSchedule': 'By schedule: which phase a line should be in at cut-off',
  'phaseFunnel.subtitleActual': 'By Actual: phase based on recorded actual milestones · clicking a bar only filters in Schedule mode',
  'phaseFunnel.basisGroupLabel': 'Phase basis',
  'phaseFunnel.basisSchedule': 'Schedule',
  'phaseFunnel.chartAriaLabel': 'Line count by phase',

  // Overview — phase timeline (src/ui/overview/PhaseTimeline.tsx).
  'phaseTimeline.title': 'Phase progress',
  'phaseTimeline.subtitle': 'Actual / Plan completed as of cut-off · click a milestone for its lines',
  'phaseTimeline.nodeLabel': '{phase}: {actual} of {plan} completed',
  'phaseTimeline.late': '{count} late',
  'phaseTimeline.nothingDue': 'Nothing due yet',

  // Overview — phase progress drawer (src/ui/overview/PhaseProgressDrawer.tsx).
  'phaseDrawer.summary': '{actual} / {plan} completed by cut-off · {total} {total|line|lines} planned in this phase',
  'phaseDrawer.tabsLabel': 'Line status',
  'phaseDrawer.tab.late': 'Late',
  'phaseDrawer.tab.done': 'Completed',
  'phaseDrawer.tab.all': 'All',
  'phaseDrawer.gate': 'Milestone',
  'phaseDrawer.delay': 'Δ days',
  'phaseDrawer.state.late': 'Late',
  'phaseDrawer.state.done': 'Done',
  'phaseDrawer.state.ahead': 'Early',
  'phaseDrawer.state.pending': 'Not due',
  'phaseDrawer.empty': 'No lines in this list.',

  // Overview — facility heatmap (src/ui/overview/FacilityHeatmap.tsx).
  'facilityHeatmap.title': 'Facility × Month',
  'facilityHeatmap.subtitle': 'Milestones due by facility and month',
  'facilityHeatmap.selectAriaLabel': 'Select milestone',
  'facilityHeatmap.allMilestones': 'All milestones',
  'facilityHeatmap.noData': 'No data.',
  'facilityHeatmap.chartAriaLabel': 'Heatmap of milestones by facility and month',

  // Overview — workload chart (src/ui/overview/WorkloadChart.tsx).
  'workloadChart.title': 'Monthly milestone workload',
  'workloadChart.subtitle': 'TR · TBE · CBE · LOA · FAT/EXW · Site — by effective date (Actual → Forecast → Plan)',
  'workloadChart.noData': 'No date data.',
  'workloadChart.chartAriaLabel': 'Milestones due by month',

  // Discipline page (src/ui/discipline/DisciplinePage.tsx).
  'discipline.notFound': 'Discipline “{name}” not found.',
  'discipline.backToOverview': 'Back to overview',
  'discipline.otherDisciplines': 'Other disciplines',
  'discipline.packagesSubtitle': 'Sorted by risk by default · click a row for details',

  // Package table (src/ui/discipline/PackageTable.tsx).
  'packageTable.package': 'Package',
  'packageTable.rosFloat': 'ROS float',
  'packageTable.nextMilestone': 'Next milestone',
  'packageTable.maxSlip': 'Max slip',
  'packageTable.risk': 'Risk',
  'packageTable.overdueCount': '! {count} overdue',
  'packageTable.slipped': '● slipped',
  'packageTable.actualPhaseTitle': 'Phase from milestones with an Actual date',

  // Package drawer (src/ui/package/PackageDrawer.tsx).
  'packageDrawer.notFound': 'Package “{code}” not found',
  'packageDrawer.progressByFacility': 'Progress by facility',
  'packageDrawer.milestoneDetails': 'Milestone details',
  'packageDrawer.sourceRowLabel': 'Sheet row',
  'packageDrawer.rosHistoryTitle': 'ROS history ({facility})',

  // Milestone table (src/ui/package/MilestoneTable.tsx).
  'milestoneTable.milestone': 'Milestone',
  'milestoneTable.deltaDays': 'Δ days',
  'milestoneTable.status': 'Status',

  // Mini Gantt (src/ui/package/MiniGantt.tsx).
  'miniGantt.legendForecast': '● Forecast (colored by phase / status)',

  // ROS history (src/ui/package/RosHistory.tsx).
  'rosHistory.empty': 'No ROS history.',
  'rosHistory.ariaLabel': 'ROS adjustment history',

  // Loading screen (src/ui/states/LoadingScreen.tsx).
  'loading.preparing': 'Preparing dashboard…',
  'loading.step.config': 'Reading configuration',
  'loading.step.fetch': 'Syncing data from source',
  'loading.step.parse': 'Parsing data structure',
  'loading.step.analyze': 'Analyzing data',

  // Error screen hints (src/ui/states/ErrorScreen.tsx).
  'error.hint.network': 'Your machine needs access to docs.google.com and *.googleusercontent.com.',
  'error.hint.accessDenied': 'Ask the sheet owner to enable "Anyone with the link" sharing (or Publish to web), then try again.',
  'error.hint.notFound': 'Check dataSource.url in config.json on the server.',
  'error.hint.config': 'Fix config.json next to server.cjs on the server (or public/config.json in dev), then reload the page.',
  'error.hint.missingColumns': "The sheet's column headers may have been renamed. Compare them with the standard structure in the documentation.",
  'error.codeLabel': 'error code: {code}',

  // Data Health panel (src/ui/health/DataHealthPanel.tsx).
  'health.code.invalidPackageCode': 'Package Code empty / zero',
  'health.code.missingFacility': 'Missing Facility',
  'health.code.incompleteTriplet': 'Missing FORECAST/ACTUAL row',
  'health.code.orphanRow': 'Stray FORECAST/ACTUAL row',
  'health.code.unknownRowType': 'Unrecognized Date column value',
  'health.code.invalidDate': 'Invalid date cell (#####, 00/Jan/00…)',
  'health.code.unknownColumn': 'Unrecognized column',
  'health.code.noDiscipline': 'Row outside any discipline',
  'health.title': 'Data Health',
  'health.subtitle': 'Data-quality issues detected while reading the sheet. The app still shows these lines.',
  'health.empty': '✓ No issues detected.',

  // Engineering placeholder page (src/ui/engineering/EngineeringPage.tsx).
  'engineering.placeholder.title': 'Engineering',
  'engineering.placeholder.detail': 'Loaded {rows} {rows|row|rows} from sheet “{sheet}”. The Engineering dashboard content will be designed in a later session.',

  // Modules and the shared sidebar (src/modules, src/ui/shell/Sidebar.tsx).
  'module.procurement': 'Procurement',
  'module.engineering': 'Engineering',
  'module.unconfigured.title': 'No data source configured',
  'module.unconfigured.detail': 'Add "dataSources.{id}" to config.json to load the {module} dashboard.',
  'sidebar.label': 'Dashboards',
  'sidebar.collapse': 'Collapse sidebar',
  'sidebar.expand': 'Expand sidebar',
  'sidebar.open': 'Open menu',
  'notFound.title': 'Page not found.',
  'notFound.back': 'Back to the dashboard',
  'routeError.title': 'This page could not be loaded',
  'routeError.detail': 'The app may have been updated. Reload the page to get the latest version.',
  'routeError.reload': 'Reload page',
  'filter.discipline': 'Discipline',
  'filter.facility': 'Facility',
  'filter.itemType': 'Tagged/Bulk',

  // Engineering (src/ui/engineering, src/modules/engineering).
  'eng.stage.notIssued': 'Not issued',
  'eng.stage.review': 'Review (IFI/IFR)',
  'eng.stage.commented': 'Commented (IFA)',
  'eng.stage.final': 'Final (IFC/IFU)',
} as const;

export type MessageKey = keyof typeof en;
export type Dictionary = Record<MessageKey, string>;
