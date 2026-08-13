import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
export const port = Number(process.env.PORT || 8787);

mkdirSync(dataDir, { recursive: true });

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretFile = path.join(dataDir, 'jwt-secret');
  if (existsSync(secretFile)) {
    return readFileSync(secretFile, 'utf8').trim();
  }
  const secret = randomBytes(32).toString('hex');
  writeFileSync(secretFile, secret, { mode: 0o600 });
  return secret;
}

export const jwtSecret = loadSecret();
