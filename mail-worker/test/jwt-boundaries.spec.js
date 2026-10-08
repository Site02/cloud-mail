import { afterEach, describe, expect, it, vi } from 'vitest';
import jwtUtils from '../src/utils/jwt-utils';

const context = {env: {jwt_secret: 'test-signing-key-for-local-verification'}};

afterEach(() => vi.useRealTimers());

describe('signed session boundaries', () => {
  it('rejects tokens without an expiry', async () => {
    const token = await jwtUtils.generateToken(context, {userId: 1, token: 'session'});
    expect(await jwtUtils.verifyToken(context, token)).toBeNull();
  });

  it('expires a token at its deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T20:00:00Z'));
    const token = await jwtUtils.generateToken(context, {userId: 1, token: 'session'}, 60);
    expect((await jwtUtils.verifyToken(context, token))?.userId).toBe(1);
    vi.setSystemTime(new Date('2026-09-26T20:01:00Z'));
    expect(await jwtUtils.verifyToken(context, token)).toBeNull();
  });

  it('rejects a modified session payload', async () => {
    const token = await jwtUtils.generateToken(context, {userId: 1, token: 'session'}, 60);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${btoa(JSON.stringify({userId: 2, exp: 9999999999}))}.${parts[2]}`;
    expect(await jwtUtils.verifyToken(context, tampered)).toBeNull();
  });
});
