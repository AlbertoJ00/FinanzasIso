import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const contabilidadBaseUrl = 'https://sistema-contabilidad.onrender.com';

app.use(express.json({ limit: '100kb' }));

async function proxyContabilidad(
  path: string,
  res: express.Response,
  init?: RequestInit,
): Promise<void> {
  try {
    const upstream = await fetch(`${contabilidadBaseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(70000),
      headers: {
        accept: 'application/json, text/plain, text/html',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
      },
    });
    const body = await upstream.text();
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    res.status(upstream.status).send(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    res.status(502).json({ error: `No se pudo contactar el WS de Contabilidad: ${message}` });
  }
}

app.get('/api/contabilidad/cuentas', (_req, res) => {
  void proxyContabilidad('/cuentas', res);
});

app.post('/api/contabilidad/api/entradas', (req, res) => {
  void proxyContabilidad('/api/entradas', res, {
    method: 'POST',
    body: JSON.stringify(req.body),
  });
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
