// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildServer } from './app';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-peiw-'));
  fs.mkdirSync(path.join(dir, 'public', 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'public', 'index.html'), '<!doctype html><title>PMS - PEIW</title>');
  fs.writeFileSync(path.join(dir, 'public', 'assets', 'app-abc123.js'), 'console.log(1)');
  fs.writeFileSync(path.join(dir, 'config.json'), '{"appName":"PMS - PEIW"}');
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const make = () => buildServer({ publicDir: path.join(dir, 'public'), configPath: path.join(dir, 'config.json') });

describe('server', () => {
  it('serves index.html without long caching', async () => {
    const res = await make().inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('PMS - PEIW');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('sets X-Content-Type-Options: nosniff on every response', async () => {
    const res = await make().inject({ method: 'GET', url: '/' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('serves hashed assets with immutable caching', async () => {
    const res = await make().inject({ method: 'GET', url: '/assets/app-abc123.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('serves the live config.json uncached, re-read on each request', async () => {
    const app = make();
    const first = await app.inject({ method: 'GET', url: '/config.json' });
    expect(first.json()).toEqual({ appName: 'PMS - PEIW' });
    expect(first.headers['cache-control']).toBe('no-store');
    fs.writeFileSync(path.join(dir, 'config.json'), '{"appName":"Renamed"}');
    const second = await app.inject({ method: 'GET', url: '/config.json' });
    expect(second.json()).toEqual({ appName: 'Renamed' });
  });

  it('reports a missing config.json', async () => {
    fs.rmSync(path.join(dir, 'config.json'));
    const res = await make().inject({ method: 'GET', url: '/config.json' });
    expect(res.statusCode).toBe(500);
  });

  it('answers the health check', async () => {
    const res = await make().inject({ method: 'GET', url: '/healthz' });
    expect(res.json()).toEqual({ ok: true });
  });
});
