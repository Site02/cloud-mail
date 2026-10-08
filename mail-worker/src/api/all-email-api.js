import app from '../hono/hono';
import emailService from '../service/email-service';
import result from '../model/result';
import mediaService from '../service/media-service';
import BizError from '../error/biz-error';
import {t} from '../i18n/i18n.js';

app.get('/allEmail/list', async (c) => {
	const data = await emailService.allList(c, c.req.query());
	return c.json(result.ok(data));
})

app.delete('/allEmail/delete', async (c) => {
	const list = await emailService.physicsDelete(c, c.req.query());
	return c.json(result.ok(list));
})

app.delete('/allEmail/batchDelete', async (c) => {
	await emailService.batchDelete(c, c.req.query());
	return c.json(result.ok());
})

app.get('/allEmail/latest', async (c) => {
	const list = await emailService.allEmailLatest(c, c.req.query());
	return c.json(result.ok(list));
})

app.get('/allEmail/contentMedia', async (c) => {
	const data = await mediaService.adminInlineMap(c, c.req.query('emailId'));
	c.header('Cache-Control', 'no-store');
	return c.json(result.ok(data));
})

app.get('/allEmail/attachment', async (c) => {
	try {
		return await mediaService.adminAttachment(c, c.req.query());
	} catch (error) {
		if (error instanceof BizError) return c.text(t(c, 'attachmentNotFound'), 404);
		throw error;
	}
})
