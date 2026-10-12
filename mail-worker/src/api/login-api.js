import app from '../hono/hono';
import loginService from '../service/login-service';
import result from '../model/result';
import userContext from '../security/user-context';
import { setCookie, deleteCookie } from 'hono/cookie';
import { attachmentCookieOptions } from '../utils/attachment-cookie';

app.post('/login', async (c) => {
	const token = await loginService.login(c, await c.req.json());
	const cookie = attachmentCookieOptions(c);
	setCookie(c, cookie.name, token, cookie.options);
	return c.json(result.ok({ token: token }));
});

app.post('/register', async (c) => {
	const jwt = await loginService.register(c, await c.req.json());
	return c.json(result.ok(jwt));
});

app.delete('/logout', async (c) => {
	await loginService.logout(c, userContext.getUserId(c));
	const cookie = attachmentCookieOptions(c);
	deleteCookie(c, cookie.name, { secure: cookie.options.secure, path: '/' });
	return c.json(result.ok());
});

