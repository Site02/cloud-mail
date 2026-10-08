import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import kvObjService from './service/kv-obj-service';
import oauthService from './service/oauth-service';
import analysisService from './service/analysis-service';
const accountRoutes = new Set([
	'/login', '/inbox', '/mail', '/settings', '/addresses', '/starred',
	'/sent', '/drafts', '/all-users', '/role', '/system-settings',
	'/invite-code', '/all-mail', '/analysis',
]);
export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		if (url.pathname === '/manifest.webmanifest') {
			const manifestUrl = new URL(req.url);
			manifestUrl.pathname = url.hostname.startsWith('temp.')
				? '/manifest-temp.webmanifest'
				: '/manifest.webmanifest';
			const asset = await env.assets.fetch(new Request(manifestUrl.toString(), req));
			const response = new Response(asset.body, asset);
			response.headers.set('Content-Type', 'application/manifest+json; charset=utf-8');
			response.headers.set('Cache-Control', 'public, max-age=300');
			response.headers.set('X-Content-Type-Options', 'nosniff');
			return response;
		}

		if (url.hostname.startsWith('temp.')) {
			if (url.pathname === '/') return Response.redirect(url.origin + '/find', 302)
			const routePath = url.pathname.replace(/\/+$/, '') || '/';
			if (['GET', 'HEAD'].includes(req.method) && accountRoutes.has(routePath)) {
				url.hostname = url.hostname.replace(/^temp\./, 'box.')
				return Response.redirect(url.toString(), 302)
			}
		}

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		if (url.pathname.startsWith('/attachments/')) {
			return new Response('Not found', { status: 404 });
		}

		if (url.pathname.startsWith('/static/background/')) {
			const object = await kvObjService.toObjResp({ env }, url.pathname.substring(1));
			const type = object?.headers.get('Content-Type');
			if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) {
				return new Response('Not found', { status: 404 });
			}
			const response = new Response(object.body, object);
			response.headers.set('X-Content-Type-Options', 'nosniff');
			return response;
		}

		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(c, env, ctx) {
		try {
			await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_email_to_email_nocase ON email(to_email COLLATE NOCASE)').run()
			await env.db.prepare('CREATE INDEX IF NOT EXISTS idx_attachments_key_type ON attachments(key, type)').run()
		} catch (error) {
			console.error('Mail index migration failed', error)
		}
		if (c.cron === '*/30 * * * *') {
			await analysisService.refreshEchartsCache({ env })
			return;
		}

		await verifyRecordService.clearRecord({ env })
		await userService.resetDaySendCount({ env })
		await emailService.completeReceiveAll({ env })
		await emailService.autoClean({ env })
		await analysisService.refreshEchartsCache({ env })
		await oauthService.clearNoBindOathUser({ env })
	},
};
