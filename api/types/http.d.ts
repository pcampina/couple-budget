import 'http';
import type { Role } from './domain';

declare module 'http' {
  interface IncomingMessage {
    user?: { id?: string; role?: Role | 'authenticated'; email?: string };
  }
}

