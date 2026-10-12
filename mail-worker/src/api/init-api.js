import app from '../hono/hono';
import { dbInit } from '../init/init';
import userService from '../service/user-service';
import loginService from '../service/login-service';
import settingService from '../service/setting-service';

// Never put JWT signing keys in URLs, logs or browser history.
app.post('/init', async (c) => {
	if (!c.env.bootstrap_secret) return c.text('Bootstrap disabled', 503);
	if (c.req.header('Authorization') !== `Bearer ${c.env.bootstrap_secret}`) return c.text('Unauthorized', 401);
	const { adminPassword } = await c.req.json();
	if (typeof adminPassword !== 'string' || adminPassword.length < 20 || adminPassword.length > 30) {
		return c.text('Admin password must contain 20 to 30 characters', 400);
	}
	await dbInit.init(c);
	const existing = await userService.selectByEmailIncludeDel(c, c.env.admin);
	if (!existing) {
		// Close registration before creating the reserved administrator account.
		await c.env.db.prepare('UPDATE setting SET register = 1').run();
		await settingService.refresh(c);
		c.set('bootstrapAdmin', true);
		await loginService.register(c, { email: c.env.admin, password: adminPassword });
	}
	return c.text('success');
})
