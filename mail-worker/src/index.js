import app from './hono/webs';
import { email } from './email/email';
import userService from './service/user-service';
import verifyRecordService from './service/verify-record-service';
import emailService from './service/email-service';
import kvObjService from './service/kv-obj-service';
import oauthService from './service/oauth-service';
import analysisService from './service/analysis-service';
import r2Service from './service/r2-service';
export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)
		// Development-only simulator; never enabled by the production config.
		if (url.pathname === '/__local/email') {
			if (env.local_dev !== true || !['127.0.0.1', 'localhost'].includes(url.hostname)) return new Response('Not found', { status: 404 });
			if (req.method !== 'POST' || !env.bootstrap_secret || req.headers.get('Authorization') !== `Bearer ${env.bootstrap_secret}`) return new Response('Unauthorized', { status: 401 });
			const raw = await req.arrayBuffer();
			if (raw.byteLength > 1024 * 1024) return new Response('Local fixture limit: 1 MiB', { status: 413 });
			let rejected;
			const message = { from: url.searchParams.get('from'), to: url.searchParams.get('to'), rawSize: raw.byteLength,
				raw: new Response(raw).body, setReject: reason => { rejected = reason; },
				forward: async () => { throw new Error('Local fixtures cannot forward mail'); } };
			try { await email(message, env, ctx); }
			catch { return new Response('Local receipt failed; inspect Worker log', { status: 500 }); }
			return new Response(rejected || 'Local email received', { status: rejected ? 422 : 200 });
		}

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		 if (['/static/','/attachments/'].some(p => url.pathname.startsWith(p))) {
			if (url.pathname.startsWith('/attachments/')) {
				url.pathname = '/oss' + url.pathname;
				return app.fetch(new Request(url.toString(), req), env, ctx);
			}
			 return await r2Service.toObjResp( { env }, url.pathname.substring(1));
		 }

		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(c, env, ctx) {
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
