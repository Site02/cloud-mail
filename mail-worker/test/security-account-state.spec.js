import { describe, expect, it, vi } from 'vitest';
import app from '../src/hono/hono';
import '../src/security/security';
import jwtUtils from '../src/utils/jwt-utils';
import permService from '../src/service/perm-service';

app.get('/session-state-probe', c => c.json({ code: 200 }));
app.get('/allEmail/contentMedia', c => c.json({ code: 200 }));
app.get('/allEmail/attachment', c => c.json({ code: 200 }));

async function authenticatedRequest(databaseUser, path = '/session-state-probe', permissions = []) {
  const token = await jwtUtils.generateToken(
    { env: { jwt_secret: 'local-session-state-secret' } },
    { userId: 7, token: 'old-session' },
    3600,
  );
  const statement = {
    bind() { return this; },
    async raw() {
      return databaseUser ? [[databaseUser.user_id, databaseUser.email, databaseUser.status, databaseUser.is_del]] : [];
    },
  };
  const env = {
    jwt_secret: 'local-session-state-secret',
    admin: 'admin@example.test',
    db: { prepare() { return statement; } },
    kv: {
      async get() {
        return {
          user: { userId: 7, email: 'person@example.test' },
          tokens: ['old-session'],
          refreshTime: new Date().toISOString(),
        };
      },
    },
  };
  const permissionLookup = vi.spyOn(permService, 'userPermKeys').mockResolvedValue(permissions);
  try {
    const response = await app.request(`http://example.test${path}`, {
      headers: { Authorization: token, 'Accept-Language': 'en' },
    }, env);
    return response.json();
  } finally {
    permissionLookup.mockRestore();
  }
}

describe('authenticated account state', () => {
  it('rejects an old session while the account is soft deleted in the database', async () => {
    expect((await authenticatedRequest({ user_id: 7, email: 'person@example.test', is_del: 1, status: 0 })).code).toBe(401);
  });

  it('rejects an old session after the account is physically deleted', async () => {
    expect((await authenticatedRequest(null)).code).toBe(401);
  });

  it('rejects an old session while the account is disabled in the database', async () => {
    expect((await authenticatedRequest({ user_id: 7, email: 'person@example.test', is_del: 0, status: 1 })).code).toBe(401);
  });

  it('accepts an active account with a valid session', async () => {
    expect((await authenticatedRequest({ user_id: 7, email: 'person@example.test', is_del: 0, status: 0 })).code).toBe(200);
  });

  it('requires all-mail viewing permission for the administrator inline-image endpoint', async () => {
    const active = { user_id: 7, email: 'person@example.test', is_del: 0, status: 0 };
    expect((await authenticatedRequest(active, '/allEmail/contentMedia')).code).toBe(403);
    expect((await authenticatedRequest(active, '/allEmail/contentMedia', ['all-email:query'])).code).toBe(200);
  });

  it('requires all-mail viewing permission for attachment bytes', async () => {
    const active = { user_id: 7, email: 'person@example.test', is_del: 0, status: 0 };
    expect((await authenticatedRequest(active, '/allEmail/attachment')).code).toBe(403);
    expect((await authenticatedRequest(active, '/allEmail/attachment', ['all-email:query'])).code).toBe(200);
  });
});
