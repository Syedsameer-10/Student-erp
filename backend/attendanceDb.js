import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirectory = path.resolve(__dirname, 'data');
const dbFilePath = path.join(dataDirectory, 'attendance-db.json');

async function ensureDb() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(dbFilePath);
  } catch {
    await fs.writeFile(
      dbFilePath,
      JSON.stringify({ confirmations: [] }, null, 2),
      'utf8'
    );
  }
}

export async function readAttendanceDb() {
  await ensureDb();
  const raw = await fs.readFile(dbFilePath, 'utf8');
  return JSON.parse(raw);
}

export async function appendAttendanceConfirmation(payload) {
  const db = await readAttendanceDb();
  const record = {
    id: `confirm-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...payload,
  };

  db.confirmations.push(record);
  await fs.writeFile(dbFilePath, JSON.stringify(db, null, 2), 'utf8');

  return record;
}
