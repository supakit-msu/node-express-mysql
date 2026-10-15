import { createPool } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let caCert: string | undefined;
try {
  const certPath = path.join(__dirname, 'ca.pem');
  if (fs.existsSync(certPath)) {
    caCert = fs.readFileSync(certPath, 'utf-8');
  }
} catch { /* ignore */ }

export const conn = createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'advweb-4d0f-advweb-4d0f.h.aivencloud.com',
  port: Number(process.env.DB_PORT) || 26886,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'AVNS_JYL1xmomsib4hjb32Ey',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: caCert ? { ca: caCert, rejectUnauthorized: false } : { rejectUnauthorized: false }
});
