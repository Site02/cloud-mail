import {t} from '../i18n/i18n.js';
import app from '../hono/hono';
import result from '../model/result';
import openService from '../service/open-service';
import BizError from '../error/biz-error';
import inboxAccessService from '../service/inbox-access-service';

app.post('/open/inbox', async (c) => {
	c.header('Cache-Control', 'no-store');
	return c.json(result.ok(await inboxAccessService.create(c)));
});

// /open 前缀在 security.js 的 exclude 里，免鉴权
app.get('/open/recentMails', async (c) => {
	c.header('Cache-Control', 'no-store');
	const list = await openService.recentMails(c, c.req.query());
	return c.json(result.ok(list));
});

app.get('/open/mailContent', async (c) => {
	c.header('Cache-Control', 'no-store');
	const row = await openService.mailContent(c, c.req.query());
	return c.json(result.ok(row));
});

app.get('/open/attachment', async (c) => {
	try {
		return await openService.attachment(c, c.req.query());
	} catch (error) {
		if (error instanceof BizError) {
			c.header('Cache-Control', 'no-store');
			return c.text(t(c, 'attachmentGone'), 404);
		}
		throw error;
	}
});

// 公开页要知道域名才能拼地址，没登录拿不到 settingStore
app.get('/open/domains', async (c) => {
	let domains = c.env.domain;
	if (typeof domains === 'string') {
		try { domains = JSON.parse(domains); } catch { domains = []; }
	}
	return c.json(result.ok(Array.isArray(domains) ? domains : []));
});
