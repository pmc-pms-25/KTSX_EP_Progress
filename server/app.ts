import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

export interface ServerOptions {
  /** Folder holding the built front-end (index.html + assets/). */
  publicDir: string;
  /** Path of the editable config.json served to the browser. */
  configPath: string;
  logger?: boolean;
}

/** Static host for the dashboard. Extension points for v2 (/api/data) and v3 (/api/ask) go here. */
export function buildServer({ publicDir, configPath, logger = false }: ServerOptions): FastifyInstance {
  const app = Fastify({ logger });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    return payload;
  });

  // Read on every request so admins can edit config.json without a restart.
  app.get('/config.json', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const raw = await fs.promises.readFile(configPath, 'utf8');
      return reply.type('application/json').send(raw);
    } catch {
      return reply.code(500).send({ error: `Không đọc được ${path.basename(configPath)} trên server` });
    }
  });

  app.get('/healthz', async () => ({ ok: true }));

  app.register(fastifyStatic, {
    root: publicDir,
    index: ['index.html'],
    setHeaders(res, filePath) {
      const hashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
      res.header('Cache-Control', hashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  return app;
}
