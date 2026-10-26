import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationUrl, initializeApp } from '../../scripts/initialize-app.mjs';

const env = { DOMAIN: 'firemail.pp.ua', JWT_SECRET: 'test-secret' };

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}));

describe('application initialization without Cloudflare credentials', () => {
	it.each(['firemail.pp.ua', 'https://firemail.pp.ua', 'https://firemail.pp.ua/'])('accepts application address %s', DOMAIN => {
		expect(applicationUrl({ DOMAIN })).toBe('https://firemail.pp.ua');
	});

	it('supports legacy domain arrays and a separate application URL', () => {
		expect(applicationUrl({ DOMAIN: '["firemail.pp.ua","example.com"]' })).toBe('https://firemail.pp.ua');
		expect(applicationUrl({ DOMAIN: 'example.com', APP_URL: 'https://firemail.pp.ua' })).toBe('https://firemail.pp.ua');
	});

	it.each(['', '[]', '[broken', 'http://example.com', 'https://user:pass@example.com', 'example.com/path', 'example.com?x=y'])('rejects invalid application address %s', DOMAIN => {
		expect(() => applicationUrl({ DOMAIN })).toThrow();
	});

	it('calls only the deployed application with an encoded initialization secret', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(new Response('success'));
		await initializeApp({ ...env, JWT_SECRET: 'secret?with/#characters' }, { fetchImpl });
		expect(fetchImpl).toHaveBeenCalledOnce();
		expect(fetchImpl.mock.calls[0][0]).toBe('https://firemail.pp.ua/api/init/secret%3Fwith%2F%23characters');
		expect(fetchImpl.mock.calls[0][1].redirect).toBe('error');
	});

	it.each(['', 'bad\nsecret'])('rejects an empty or multiline secret', async JWT_SECRET => {
		const fetchImpl = vi.fn();
		await expect(initializeApp({ ...env, JWT_SECRET }, { fetchImpl })).rejects.toThrow('JWT_SECRET');
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('fails immediately for the wrong secret', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(new Response('❌ JWT secret mismatch'));
		await expect(initializeApp(env, { fetchImpl })).rejects.toThrow('does not match');
		expect(fetchImpl).toHaveBeenCalledOnce();
	});

	it('does not accept a login page or a JSON application error as success', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(new Response('{"code":502,"message":"KV not bound"}'));
		await expect(initializeApp(env, { fetchImpl })).rejects.toThrow('did not return success');
	});

	it('retries a temporary network or server failure', async () => {
		const fetchImpl = vi.fn()
			.mockRejectedValueOnce(new Error('Temporary network failure'))
			.mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
			.mockResolvedValueOnce(new Response('success'));
		const sleep = vi.fn();
		await initializeApp(env, { fetchImpl, sleep });
		expect(fetchImpl).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenCalledTimes(2);
	});

	it('limits retries for an unreachable application', async () => {
		const fetchImpl = vi.fn().mockRejectedValue(new Error('Network failure'));
		await expect(initializeApp(env, { fetchImpl, sleep: vi.fn() })).rejects.toThrow('Cannot reach');
		expect(fetchImpl).toHaveBeenCalledTimes(5);
	});

	it('does not print response bodies containing private configuration', async () => {
		const fetchImpl = vi.fn().mockResolvedValue(new Response('private-value'));
		await expect(initializeApp(env, { fetchImpl })).rejects.toThrow();
		expect(JSON.stringify(console.log.mock.calls)).not.toContain('private-value');
		expect(JSON.stringify(console.log.mock.calls)).not.toContain(env.JWT_SECRET);
	});
});
