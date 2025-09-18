import 'http';
import type { Role } from './domain.js';

declare module 'http' {
  interface IncomingMessage {
    user?: { id?: string; role?: Role | 'authenticated'; email?: string };
    headers: {
      [key: string]: string | string[] | undefined;
    };
    params?: Record<string, string>;
  }

  interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string | number | readonly string[]): void;
    end(data?: string | Buffer): void;
  }
}

