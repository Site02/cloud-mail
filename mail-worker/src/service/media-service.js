import {t} from '../i18n/i18n.js';
import BizError from '../error/biz-error';
import r2Service from './r2-service';

const PREFIX = 'inline-media:';
const TTL_SECONDS = 15 * 60;
const encoder = new TextEncoder();

function randomToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function tokenKey(token) {
	const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
	return PREFIX + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

const mediaService = {
	async inlineMap(c, emailId, owner) {
		emailId = Number(emailId);
		if (!Number.isSafeInteger(emailId) || emailId <= 0) throw new BizError(t(c, 'mailNotFound'), 404);
		const { results } = await c.env.db.prepare(
			'SELECT att_id AS attId, key FROM attachments WHERE email_id = ? AND type = 1'
		).bind(emailId).all();
		const entries = await Promise.all((results || []).map(async row => {
			const token = randomToken();
			await c.env.kv.put(await tokenKey(token), JSON.stringify({
				attId: row.attId,
				emailId,
				...owner
			}), { expirationTtl: TTL_SECONDS });
			return [row.key, `/api/media/${token}`];
		}));
		return Object.fromEntries(entries);
	},

	async privateInlineMap(c, emailId, userId) {
		emailId = Number(emailId);
		if (!Number.isSafeInteger(emailId) || emailId <= 0) throw new BizError(t(c, 'mailNotFound'), 404);
		const email = await c.env.db.prepare(
			'SELECT 1 FROM email WHERE email_id = ? AND user_id = ? AND is_del = 0 LIMIT 1'
		).bind(emailId, userId).first();
		if (!email) throw new BizError(t(c, 'mailNotFound'), 404);
		return this.inlineMap(c, emailId, { userId });
	},

	async adminInlineMap(c, emailId) {
		emailId = Number(emailId);
		if (!Number.isSafeInteger(emailId) || emailId <= 0) throw new BizError(t(c, 'mailNotFound'), 404);
		const email = await c.env.db.prepare(
			'SELECT user_id AS userId FROM email WHERE email_id = ? LIMIT 1'
		).bind(emailId).first();
		if (!email) throw new BizError(t(c, 'mailNotFound'), 404);
		return this.inlineMap(c, emailId, { userId: email.userId, includeDeleted: true });
	},

	async privateAttachment(c, params, userId) {
		const emailId = Number(params.emailId);
		const attId = Number(params.attId);
		if (!Number.isSafeInteger(emailId) || emailId <= 0 || !Number.isSafeInteger(attId) || attId <= 0) {
			throw new BizError(t(c, 'attachmentNotFound'), 404);
		}
		const row = await c.env.db.prepare(
			`SELECT a.key, a.filename, a.mime_type AS mimeType
			 FROM attachments a JOIN email e ON e.email_id = a.email_id
			 WHERE a.att_id = ? AND a.email_id = ? AND a.type = 0
			 AND e.user_id = ? AND e.is_del = 0`
		).bind(attId, emailId, userId).first();
		return this.attachmentResponse(c, row, params);
	},

	async adminAttachment(c, params) {
		const emailId = Number(params.emailId);
		const attId = Number(params.attId);
		if (!Number.isSafeInteger(emailId) || emailId <= 0 || !Number.isSafeInteger(attId) || attId <= 0) {
			throw new BizError(t(c, 'attachmentNotFound'), 404);
		}
		const row = await c.env.db.prepare(
			`SELECT a.key, a.filename, a.mime_type AS mimeType
			 FROM attachments a JOIN email e ON e.email_id = a.email_id
			 WHERE a.att_id = ? AND a.email_id = ? AND a.type = 0`
		).bind(attId, emailId).first();
		return this.attachmentResponse(c, row, params);
	},

	async attachmentResponse(c, row, params) {
		if (!row) throw new BizError(t(c, 'attachmentNotFound'), 404);
		const object = await r2Service.getObj(c, row.key);
		if (!object) throw new BizError(t(c, 'attachmentNotFound'), 404);

		const mimeType = String(row.mimeType || 'application/octet-stream').split(';')[0].toLowerCase();
		const previewable = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf', 'text/plain'].includes(mimeType);
		const disposition = params.download === '1' || !previewable ? 'attachment' : 'inline';
		const filename = String(row.filename || 'attachment').split(/[\\/]/).pop().replace(/[\r\n"]/g, '_');
		const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
		return new Response(object.body, {
			headers: {
				'Content-Type': previewable ? mimeType : 'application/octet-stream',
				'Content-Disposition': `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
				'Cache-Control': 'private, no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	},

	async get(c, token) {
		if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ''))) throw new BizError(t(c, 'resourceExpired'), 404);
		const grant = await c.env.kv.get(await tokenKey(token), { type: 'json' });
		if (!grant || !Number.isSafeInteger(grant.attId) || !Number.isSafeInteger(grant.emailId)) {
			throw new BizError(t(c, 'resourceExpired'), 404);
		}
		const row = await c.env.db.prepare(
			`SELECT a.key, a.mime_type AS mimeType, e.to_email AS toEmail, e.user_id AS userId
			 FROM attachments a JOIN email e ON e.email_id = a.email_id
			 WHERE a.att_id = ? AND a.email_id = ? AND a.type = 1
			 AND (e.is_del = 0 OR ? = 1)`
		).bind(grant.attId, grant.emailId, grant.includeDeleted === true ? 1 : 0).first();
		if (!row) throw new BizError(t(c, 'resourceExpired'), 404);

		if (grant.address) {
			if (row.toEmail.toLowerCase() !== grant.address || row.userId !== 0 || grant.emailId <= 0) throw new BizError(t(c, 'resourceExpired'), 404);
			const visible = await c.env.db.prepare(
				`SELECT 1 FROM email WHERE email_id = ? AND type = 0
				 AND is_del = 0 AND user_id = 0 AND account_id = 0 LIMIT 1`
			).bind(grant.emailId).first();
			const local = grant.address.split('@');
			const baseAddress = `${local[0].split('+')[0]}@${local[1]}`;
			const account = await c.env.db.prepare('SELECT 1 FROM account WHERE email COLLATE NOCASE IN (?, ?) LIMIT 1')
				.bind(grant.address, baseAddress).first();
			if (!visible || account) throw new BizError(t(c, 'resourceExpired'), 404);
		} else if (!Number.isSafeInteger(grant.userId) || row.userId !== grant.userId) {
			throw new BizError(t(c, 'resourceExpired'), 404);
		}

		const object = await r2Service.getObj(c, row.key);
		if (!object) throw new BizError(t(c, 'resourceExpired'), 404);
		const mimeType = String(row.mimeType || '').split(';')[0].toLowerCase();
		const inline = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'].includes(mimeType);
		return new Response(object.body, {
			headers: {
				'Content-Type': inline ? mimeType : 'application/octet-stream',
				'Content-Disposition': inline ? 'inline' : 'attachment',
				'Cache-Control': 'private, no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	}
};

export default mediaService;
