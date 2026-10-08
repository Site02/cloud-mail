import {t} from '../i18n/i18n.js';
import app from '../hono/hono';
import emailService from '../service/email-service';
import result from '../model/result';
import userContext from '../security/user-context';
import attService from '../service/att-service';
import mediaService from '../service/media-service';
import BizError from '../error/biz-error';

app.get('/email/list', async (c) => {
	const data = await emailService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.get('/email/addresses', async (c) => {
	const list = await emailService.addressList(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(list));
});

app.get('/email/latest', async (c) => {
	const list = await emailService.latest(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(list));
});

app.delete('/email/delete', async (c) => {
	await emailService.delete(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/email/attList', async (c) => {
	const attList = await attService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(attList));
});

app.get('/email/contentMedia', async (c) => {
	const data = await mediaService.privateInlineMap(c, c.req.query('emailId'), userContext.getUserId(c));
	c.header('Cache-Control', 'no-store');
	return c.json(result.ok(data));
});

app.get('/email/attachment', async (c) => {
	try {
		return await mediaService.privateAttachment(c, c.req.query(), userContext.getUserId(c));
	} catch (error) {
		if (error instanceof BizError) return c.text(t(c, 'attachmentNotFound'), 404);
		throw error;
	}
});

app.post('/email/send', async (c) => {
	const email = await emailService.send(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(email));
});

app.put('/email/read', async (c) => {
	await emailService.read(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
})
