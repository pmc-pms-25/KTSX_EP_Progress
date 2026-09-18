import fs from 'node:fs';
import path from 'node:path';
import { buildServer } from './app';

// In the release bundle this file sits next to public/ and config.json.
const baseDir = path.dirname(process.argv[1] ?? '.');
const publicDir = path.resolve(baseDir, 'public');
const configPath = path.resolve(baseDir, 'config.json');

function readPort(): number {
  if (process.env.PORT) return Number(process.env.PORT);
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { port?: unknown };
    if (typeof config.port === 'number') return config.port;
  } catch {
    // Fall through to the default; the browser will report a broken config.
  }
  return 8080;
}

const app = buildServer({ publicDir, configPath, logger: true });
const port = readPort();
app.listen({ port, host: '0.0.0.0' }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
