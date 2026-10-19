import r2Service from '../service/r2-service';
import app from '../hono/hono';
import objHeaderUtils from '../utils/obj-header-utils';

app.get('/oss/*', async (c) => {
	const key = c.req.path.split('/oss/')[1];
	const obj = await r2Service.getObj(c, key);
	if (!obj) {
		return c.notFound();
	}
	// KV 存储返回的是 Response, R2/S3 返回的是对象
	const contentType = obj instanceof Response ? obj.headers.get('Content-Type') : obj.httpMetadata?.contentType;
	const contentDisposition = obj instanceof Response ? obj.headers.get('Content-Disposition') : obj.httpMetadata?.contentDisposition;
	return new Response(obj.body, {
		headers: objHeaderUtils.safeHeaders(contentType, contentDisposition)
	});
});
