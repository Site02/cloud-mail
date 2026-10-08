import {t} from '../i18n/i18n.js';
import app from '../hono/hono';
import BizError from '../error/biz-error';
import mediaService from '../service/media-service';

app.get('/media/:token', async c => {
	try {
		return await mediaService.get(c, c.req.param('token'));
	} catch (error) {
		if (error instanceof BizError) return c.text(t(c, 'resourceExpired'), 404);
		throw error;
	}
});
