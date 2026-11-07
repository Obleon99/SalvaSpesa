import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";

// Account locali: file JSON in data/accounts (fuori da git). Password con scrypt + sale, sessioni con token casuale salvato come hash.
const DIR = path.resolve(process.cwd(), "../../data/accounts");
const SESSION_COOKIE = "ss_session";
const SESSION_DAYS = 30;
const MAX_STATE_BYTES = 1_500_000;

export interface Account {
  id: string;
  email: string;
  name: string;
}

interface StoredUser extends Account {
  salt: string;
  hash: string;
  createdAt: string;
}

interface StoredSession {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

// Le scritture sui file sono serializzate per non perdere aggiornamenti concorrenti.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(value));
  await rename(temp, file);
}

const usersFile = path.join(DIR, "users.json");
const sessionsFile = path.join(DIR, "sessions.json");
const stateFile = (userId: string) => path.join(DIR, "state", `${userId}.json`);

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export type AuthError = { error: string; status: number };

export function validateCredentials(email: unknown, password: unknown): { email: string; password: string } | AuthError {
  if (typeof email !== "string" || !EMAIL.test(email.trim()) || email.length > 254) return { error: "Inserisci un indirizzo email valido", status: 400 };
  if (typeof password !== "string" || password.length < 8) return { error: "La password deve avere almeno 8 caratteri", status: 400 };
  if (password.length > 200) return { error: "Password troppo lunga", status: 400 };
  return { email: normalizeEmail(email), password };
}

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export const clearAttempts = (key: string) => void attempts.delete(key);

async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await exclusive(async () => {
    const data = await readJson<{ sessions: StoredSession[] }>(sessionsFile, { sessions: [] });
    const now = Date.now();
    data.sessions = data.sessions.filter((s) => s.expiresAt > now);
    data.sessions.push({ tokenHash: sha256(token), userId, expiresAt: now + SESSION_DAYS * 86400000 });
    await writeJson(sessionsFile, data);
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function register(email: string, password: string, name: string): Promise<Account | AuthError> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await derive(password, salt)).toString("hex");
  const result = await exclusive(async () => {
    const data = await readJson<{ users: StoredUser[] }>(usersFile, { users: [] });
    if (data.users.some((u) => u.email === email)) return null;
    const user: StoredUser = { id: randomUUID(), email, name: name.trim().slice(0, 40), salt, hash, createdAt: new Date().toISOString() };
    data.users.push(user);
    await writeJson(usersFile, data);
    return user;
  });
  if (!result) return { error: "Esiste già un account con questa email", status: 409 };
  await createSession(result.id);
  return { id: result.id, email: result.email, name: result.name };
}

export async function login(email: string, password: string): Promise<Account | AuthError> {
  const data = await readJson<{ users: StoredUser[] }>(usersFile, { users: [] });
  const user = data.users.find((u) => u.email === email);
  // Si calcola comunque l'hash per non rivelare se l'email esiste dal tempo di risposta.
  const key = await derive(password, user?.salt ?? "00".repeat(16));
  // Gli account creati con Google non hanno password: l'accesso passa solo da Google.
  if (!user || !user.hash || !timingSafeEqual(key, Buffer.from(user.hash, "hex"))) return { error: "Email o password non corrette", status: 401 };
  await createSession(user.id);
  return { id: user.id, email: user.email, name: user.name };
}

// Accesso con Google: l'account si crea alla prima volta, poi si ritrova dall'email verificata.
export async function loginWithGoogle(email: string, name: string): Promise<Account> {
  const normalized = normalizeEmail(email);
  const user = await exclusive(async () => {
    const data = await readJson<{ users: StoredUser[] }>(usersFile, { users: [] });
    let found = data.users.find((u) => u.email === normalized);
    if (!found) {
      found = { id: randomUUID(), email: normalized, name: name.trim().slice(0, 40), salt: "", hash: "", createdAt: new Date().toISOString() };
      data.users.push(found);
      await writeJson(usersFile, data);
    }
    return found;
  });
  await createSession(user.id);
  return { id: user.id, email: user.email, name: user.name };
}

export function googleConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export async function currentAccount(): Promise<Account | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = sha256(token);
  const sessions = await readJson<{ sessions: StoredSession[] }>(sessionsFile, { sessions: [] });
  const session = sessions.sessions.find((s) => s.tokenHash === tokenHash && s.expiresAt > Date.now());
  if (!session) return null;
  const users = await readJson<{ users: StoredUser[] }>(usersFile, { users: [] });
  const user = users.users.find((u) => u.id === session.userId);
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (!token) return;
  const tokenHash = sha256(token);
  await exclusive(async () => {
    const data = await readJson<{ sessions: StoredSession[] }>(sessionsFile, { sessions: [] });
    data.sessions = data.sessions.filter((s) => s.tokenHash !== tokenHash);
    await writeJson(sessionsFile, data);
  });
}

export async function updateAccountName(userId: string, name: string): Promise<void> {
  await exclusive(async () => {
    const data = await readJson<{ users: StoredUser[] }>(usersFile, { users: [] });
    const user = data.users.find((u) => u.id === userId);
    if (!user || user.name === name) return;
    user.name = name.slice(0, 40);
    await writeJson(usersFile, data);
  });
}

export async function loadAccountState(userId: string): Promise<unknown | null> {
  return readJson<unknown | null>(stateFile(userId), null);
}

export async function saveAccountState(userId: string, state: unknown): Promise<boolean> {
  const text = JSON.stringify(state);
  if (text.length > MAX_STATE_BYTES) return false;
  await exclusive(() => writeJson(stateFile(userId), state));
  return true;
}

export const isAuthError = (value: unknown): value is AuthError => typeof value === "object" && value !== null && "status" in value && "error" in value;

export function requireJson(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").includes("application/json");
}
