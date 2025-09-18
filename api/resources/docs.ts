import { send } from '../utils.js';
import type { Router } from '../router.js';
import { openapi } from '../openapi.js';

const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CoupleBudget API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger',
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
  </html>`;

export function registerDocs(router: Router): void {
  router.add('GET', '/swagger.json', async (_req, res) => {
    return send(res, 200, openapi);
  });
  router.add('GET', '/docs', async (_req, res) => {
    return send<string>(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8' });
  });
}
