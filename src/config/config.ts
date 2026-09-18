export type DataSourceType = 'google-sheet' | 'server';

export interface DataSourceConfig {
  type: DataSourceType;
  url: string;
  sheetName?: string;
}

export interface AppConfig {
  appName: string;
  projectName: string;
  dataSource: DataSourceConfig;
  dueSoonDays: number;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const DEFAULTS = { appName: 'PMS - PEIW', projectName: 'Procurement Plan', dueSoonDays: 30 };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validate raw JSON and apply defaults. Throws ConfigError with a readable message. */
export function parseConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) throw new ConfigError('config.json phải là một object JSON.');
  const ds = raw.dataSource;
  if (!isRecord(ds)) throw new ConfigError('Thiếu "dataSource" trong config.json.');
  if (ds.type !== 'google-sheet' && ds.type !== 'server') {
    throw new ConfigError('"dataSource.type" phải là "google-sheet" hoặc "server".');
  }
  if (typeof ds.url !== 'string' || ds.url.trim() === '') {
    throw new ConfigError('Thiếu "dataSource.url" trong config.json.');
  }
  const dueSoonDays = raw.dueSoonDays ?? DEFAULTS.dueSoonDays;
  if (typeof dueSoonDays !== 'number' || !Number.isInteger(dueSoonDays) || dueSoonDays < 1) {
    throw new ConfigError('"dueSoonDays" phải là số nguyên dương.');
  }
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  return {
    appName: str(raw.appName, DEFAULTS.appName),
    projectName: str(raw.projectName, DEFAULTS.projectName),
    dataSource: {
      type: ds.type,
      url: ds.url.trim(),
      sheetName: typeof ds.sheetName === 'string' && ds.sheetName.trim() ? ds.sheetName.trim() : undefined,
    },
    dueSoonDays,
  };
}

/** Load `config.json` next to index.html; never cached. */
export async function loadConfig(fetchImpl: typeof fetch = fetch): Promise<AppConfig> {
  let response: Response;
  try {
    response = await fetchImpl('config.json', { cache: 'no-store' });
  } catch {
    throw new ConfigError('Không tải được config.json từ server.');
  }
  if (!response.ok) throw new ConfigError(`Không tải được config.json (HTTP ${response.status}).`);
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ConfigError('config.json không phải JSON hợp lệ.');
  }
  return parseConfig(raw);
}
