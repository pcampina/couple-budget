import './env.js';
import http from 'node:http';
import { createApp } from './app.js';

const handler = createApp();
const server = http.createServer(handler);

const PORT = Number(process.env['PORT']) || 3333;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});
