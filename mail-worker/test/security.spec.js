import { DatabaseSync } from 'node:sqlite';
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index';
import app from '../src/hono/webs';
import jwt from '../src/utils/jwt-utils';
import passwords from '../src/utils/crypto-utils';
import storage from '../src/service/r2-service';
import permissions from '../src/service/perm-service';
import roles from '../src/service/role-service';
import publicService from '../src/service/public-service';

const values = new Map();
const sqlite = new DatabaseSync(':memory:');
const env = {
  admin: 'admin@example.test', jwt_secret: 'isolated-test-secret', domain: ['example.test'],
  kv: {
    async put(key, value) { values.set(key, value); },
    async get(key, options) { const value = values.get(key) ?? null; return value && options?.type === 'json' ? JSON.parse(value) : value; },
    async delete(key) { values.delete(key); },
  },
  db: {
    async exec(sql) { sqlite.exec(sql); },
    prepare(sql) { return { bind(...args) { return {
      async first() { return sqlite.prepare(sql).get(...args) ?? null; },
      async run() { return sqlite.prepare(sql).run(...args); },
    }; } }; },
  },
};

const request = (path, options = {}) => new Request('https://mail.example.test' + path, options);
const fetch = (path, options) => worker.fetch(request(path, options), env, {});
app.get('/security-error-test', () => { throw new Error('D1_ERROR: private table details'); });
async function session(userId = 7, email = 'user@example.test') {
  await env.kv.put('auth-uid:' + userId, JSON.stringify({ user: { userId, email }, tokens: ['test-token'], refreshTime: new Date().toISOString() }));
  return jwt.generateToken({ env }, { userId, token: 'test-token' });
}
afterEach(() => vi.restoreAllMocks());

describe('security regression', () => {
  it('blocks anonymous KV secrets, attachments, and every legacy public route', async () => {
    await env.kv.put('public_key:', 'leaked-token');
    for (const path of ['/api/oss/public_key:', '/api/oss/setting:', '/api/oss/auth-uid:7', '/oss/public_key:', '/attachments/test.png']) {
      expect((await fetch(path)).status, path).toBe(401);
    }
    for (const path of ['/api/public/emailList', '/api/public/addUser', '/api/public/genToken']) {
      const response = await fetch(path, { method: 'POST', headers: { Authorization: 'leaked-token' }, body: '{}' });
      expect(response.status, path).toBe(403);
    }
  });
  it('rejects secret keys even for authenticated users and restricts CORS', async () => {
    const token = await session();
    expect((await fetch('/api/oss/public_key:', { headers: { Authorization: token } })).status).toBe(404);
    const response = await fetch('/api/oss/setting:', { headers: { Origin: 'https://evil.example' } });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
  it('serves attachments only to their owner, through API/root aliases and secure cookie', async () => {
    await env.db.exec('CREATE TABLE attachments (att_id INTEGER PRIMARY KEY, key TEXT, user_id INTEGER);');
    await env.db.prepare('INSERT INTO attachments VALUES (1, ?, 7)').bind('attachments/test.png').run();
    vi.spyOn(storage, 'getObj').mockImplementation(async () => new Response('synthetic attachment'));
    const token = await session();
    for (const path of ['/api/oss/attachments/test.png', '/oss/attachments/test.png', '/attachments/test.png']) {
      const response = await fetch(path, { headers: { Authorization: token } });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('synthetic attachment');
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    }
    expect((await fetch('/attachments/test.png', { headers: { Cookie: '__Host-mail-session=' + token } })).status).toBe(200);
    const other = await session(8, 'other@example.test');
    expect((await fetch('/attachments/test.png', { headers: { Authorization: other } })).status).toBe(404);
    await env.kv.delete('auth-uid:7');
    expect((await fetch('/attachments/test.png', { headers: { Cookie: '__Host-mail-session=' + token } })).status).toBe(401);
  });
  it('keeps public login backgrounds working and checks role permissions', async () => {
    vi.spyOn(storage, 'getObj').mockResolvedValue(new Response('background'));
    expect((await fetch('/static/background/test.png')).status).toBe(200);
    vi.spyOn(permissions, 'userPermKeys').mockResolvedValue([]);
    const token = await session();
    expect((await fetch('/api/role/selectUse', { headers: { Authorization: token } })).status).toBe(403);
  });
  it('hides unexpected database errors', async () => {
    const token = await session();
    const response = await app.fetch(request('/security-error-test', { headers: { Authorization: token } }), env);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private table');
  });
  it('binds hostile email and request metadata as SQL values', async () => {
    vi.spyOn(roles, 'roleSelectUse').mockResolvedValue([{ isDefault: 1, roleId: 1 }]);
    const statements = [];
    const db = { prepare: vi.fn(sql => ({ bind: (...values) => { statements.push({ sql, values }); return {}; } })), batch: vi.fn().mockResolvedValue([]) };
    const hostile = "audit'--@example.test";
    const c = { env: { ...env, db }, req: { header: key => key === 'CF-Connecting-IP' ? "x'); DROP TABLE user;--" : '' } };
    await publicService.addUser(c, { list: [{ email: hostile, password: 'test-password' }] });
    expect(statements).toHaveLength(2);
    expect(statements[0].values[0]).toBe(hostile);
    expect(statements[0].sql).not.toContain(hostile);
    expect(statements[0].sql).not.toContain('DROP TABLE');
  });
  it('uses versioned PBKDF2 and verifies legacy passwords for migration', async () => {
    const { salt, hash } = await passwords.hashPassword('test-password');
    expect(hash).toMatch(/^pbkdf2-sha256\$100000\$/);
    expect(await passwords.verifyPassword('test-password', salt, hash)).toBe(true);
    expect(await passwords.verifyPassword('wrong', salt, hash)).toBe(false);
    const legacy = await passwords.genHashPassword('legacy-password', salt);
    expect(await passwords.verifyPassword('legacy-password', salt, legacy)).toBe(true);
  });
  it('rejects tokens from a previous session generation', async () => {
    const token = await session();
    expect(await jwt.verifyToken({ env: { ...env, session_version: 'rotated-generation' } }, token)).toBeNull();
  });
});
