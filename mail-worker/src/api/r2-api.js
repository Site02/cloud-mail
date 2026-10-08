import r2Service from '../service/r2-service';
import app from '../hono/hono';

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	if (!key?.startsWith('static/background/')) return c.text('Not found', 404);
	const obj = await r2Service.getObj(c, key);
	if (!obj) return c.text('Not found', 404);
	const type = obj.headers?.get('Content-Type') || obj.httpMetadata?.contentType;
	if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) return c.text('Not found', 404);
	return new Response(obj.body, {
		headers: {
			'Content-Type': type,
			'Content-Disposition': obj.headers?.get('Content-Disposition') || obj.httpMetadata?.contentDisposition || 'inline',
			'X-Content-Type-Options': 'nosniff'
		}
	});
});
