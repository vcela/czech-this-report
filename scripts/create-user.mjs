// Create (or reset the password of) an account. Sign-up is closed on purpose.
//   node scripts/create-user.mjs you@example.com 'a long password'
// On Railway: run it in the service shell so it writes to the same DATA_DIR volume.
import Database from "better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 12) {
  console.error("Usage: node scripts/create-user.mjs <email> <password, 12+ chars>");
  process.exit(1);
}

// Same DATA_DIR as the app: Next reads .env, a plain node script doesn't.
try {
  process.loadEnvFile();
} catch {
  /* no .env — e.g. Railway, where the variables are already in the environment */
}
const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, "reports.db"));
// Same DDL as src/lib/db.ts, in case the app has never started against this volume.
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
)`);

// Format must match verifyPassword in src/lib/auth.ts: scrypt$<salt hex>$<hash hex>
const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;

db.prepare(
  `INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)
   ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash`
).run(email.trim().toLowerCase(), hash, new Date().toISOString());
console.log(`Account ready: ${email}`);
