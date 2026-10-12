import r2Service from '../service/r2-service';
import app from '../hono/hono';
import userContext from '../security/user-context';

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	if (!key?.startsWith('attachments/') && !key?.startsWith('static/')) return c.text('Not found', 404);
	if (key.startsWith('attachments/')) {
		const user = userContext.getUser(c);
		const query = user.email === c.env.admin
			? c.env.db.prepare('SELECT att_id FROM attachments WHERE key = ? LIMIT 1').bind(key)
			: c.env.db.prepare('SELECT att_id FROM attachments WHERE key = ? AND user_id = ? LIMIT 1').bind(key, user.userId);
		if (!await query.first()) return c.text('Not found', 404);
	}
	return r2Service.toObjResp(c, key);
});


