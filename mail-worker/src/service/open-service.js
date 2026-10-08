import {t} from '../i18n/i18n.js';
import BizError from '../error/biz-error';
import r2Service from './r2-service';
import inboxAccessService from './inbox-access-service';
import mediaService from './media-service';

// 公开临时邮箱按地址查询未归属邮件，列表按邮件 ID 分页。

const openService = {

	async recentMails(c, params) {

		const address = await inboxAccessService.assertPublicAddress(c, params.address);
		const before = params.before === undefined ? Number.MAX_SAFE_INTEGER : Number(params.before);
		if (!Number.isSafeInteger(before) || before <= 0) {
			throw new BizError(t(c, 'incompleteParameters'), 400);
		}

		// 只取摘要字段，不返回正文，少暴露一层
		const query = `SELECT email_id AS emailId,
			        send_email AS sendEmail,
			        name       AS sendName,
			        subject,
			        code,
			        create_time AS createTime
			 FROM email INDEXED BY idx_email_to_email_nocase
			 WHERE to_email COLLATE NOCASE = ?
			   AND type = 0
			   AND is_del = 0
			   AND user_id = 0 AND account_id = 0
			   AND email_id < ?
			 ORDER BY email_id DESC
			 LIMIT 20`;
		let results;
		try {
			({ results } = await c.env.db.prepare(query).bind(address, before).all());
		} catch (error) {
			if (!/no such index: idx_email_to_email_nocase/i.test(String(error?.message))) throw error;
			({ results } = await c.env.db.prepare(
				query.replace(' INDEXED BY idx_email_to_email_nocase', '')
			).bind(address, before).all());
		}

		return results || [];
	},

	async mailContent(c, params) {

		const address = await inboxAccessService.assertPublicAddress(c, params.address);
		const emailId = Number(params.emailId);

		if (!Number.isSafeInteger(emailId) || emailId <= 0) {
			throw new BizError(t(c, 'incompleteParameters'));
		}

		const row = await c.env.db.prepare(
			`SELECT email_id AS emailId,
			        send_email AS sendEmail,
			        name       AS sendName,
			        subject,
			        code,
			        content,
			        text,
			        recipient,
			        to_email AS toEmail,
			        status,
			        message,
			        create_time AS createTime
			 FROM email
			 WHERE email_id = ?
			   AND to_email COLLATE NOCASE = ?
			   AND type = 0
			   AND is_del = 0
			   AND user_id = 0 AND account_id = 0`
		).bind(emailId, address).first();

		if (!row) {
			throw new BizError(t(c, 'mailGone'));
		}

		const { results } = await c.env.db.prepare(
			`SELECT att_id AS attId, filename, mime_type AS mimeType, size
			 FROM attachments
			 WHERE email_id = ? AND type = 0 AND content_id IS NULL
			 ORDER BY att_id`
		).bind(emailId).all();

		const inlineMedia = await mediaService.inlineMap(c, emailId, { address });
		return { ...row, attList: results || [], inlineMedia };
	},

	async attachment(c, params) {
		const emailId = Number(params.emailId);
		const attId = Number(params.attId);
		if (!Number.isSafeInteger(emailId) || emailId <= 0 || !Number.isSafeInteger(attId) || attId <= 0) {
			throw new BizError(t(c, 'attachmentGone'));
		}

		const address = await inboxAccessService.assertPublicAddress(c, params.address);
		const email = await c.env.db.prepare(
			`SELECT 1 FROM email WHERE email_id = ? AND to_email COLLATE NOCASE = ?
			 AND type = 0 AND is_del = 0 AND user_id = 0 AND account_id = 0 LIMIT 1`
		).bind(emailId, address).first();
		if (!email) throw new BizError(t(c, 'attachmentGone'));
		const attachment = await c.env.db.prepare(
			`SELECT key, filename, mime_type AS mimeType
			 FROM attachments
			 WHERE att_id = ? AND email_id = ? AND type = 0 AND content_id IS NULL`
		).bind(attId, emailId).first();
		if (!attachment) {
			throw new BizError(t(c, 'attachmentGone'));
		}

		const object = await r2Service.getObj(c, attachment.key);
		if (!object) {
			throw new BizError(t(c, 'attachmentGone'));
		}

		const mimeType = (attachment.mimeType || 'application/octet-stream').split(';')[0].trim().toLowerCase();
		const previewable = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf', 'text/plain'].includes(mimeType);
		const disposition = params.download === '1' || !previewable ? 'attachment' : 'inline';
		const filename = String(attachment.filename || 'attachment').split(/[\\/]/).pop().replace(/[\r\n"]/g, '_');
		const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
		return new Response(object.body, {
			headers: {
				'Content-Type': previewable ? mimeType : 'application/octet-stream',
				'Content-Disposition': `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
				'Cache-Control': 'no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	}
};

export default openService;
