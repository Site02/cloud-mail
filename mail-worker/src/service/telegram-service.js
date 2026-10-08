import orm from '../entity/orm';
import email from '../entity/email';
import settingService from './setting-service';
import { eq } from 'drizzle-orm';
import emailMsgTemplate from '../template/email-msg';
import emailTextTemplate from '../template/email-text';
import emailHtmlTemplate from '../template/email-html';
import domainUtils from "../utils/domain-uitls";
import mediaService from './media-service';
import {requestLanguage, t} from '../i18n/i18n.js';

const VIEW_PREFIX = 'telegram-view:';
const VIEW_TTL_SECONDS = 15 * 60;

function randomToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function tokenKey(token) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return VIEW_PREFIX + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

const telegramService = {

	async getEmailContent(c, params) {

		const { token } = params
		const language = requestLanguage(c);

		if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ''))) {
			return emailTextTemplate(t(c, 'telegramAccessDenied'), language)
		}
		const grant = await c.env.kv.get(await tokenKey(token), { type: 'json' });
		if (!Number.isSafeInteger(grant?.emailId) || grant.emailId <= 0) return emailTextTemplate(t(c, 'telegramAccessDenied'), language);

		const emailRow = await orm(c).select().from(email).where(eq(email.emailId, grant.emailId)).get();

		if (emailRow && emailRow.isDel === 0) {

			if (emailRow.content) {
				const inlineMedia = await mediaService.inlineMap(c, emailRow.emailId, { userId: emailRow.userId });
				const safeContent = emailRow.content.replace(
					/\{\{domain\}\}(attachments\/[A-Za-z0-9._-]+)/g,
					(_, key) => inlineMedia[key] || ''
				).replace(/\{\{domain\}\}/g, '');
				return emailHtmlTemplate(safeContent, new URL(c.req.url).origin)
			} else {
				return emailTextTemplate(emailRow.text || '')
			}

		} else {
			return emailTextTemplate(t(c, 'telegramMailNotFound'), language)
		}

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		const tgChatIds = tgChatId.split(',');

		const viewToken = randomToken();
		await c.env.kv.put(await tokenKey(viewToken), JSON.stringify({ emailId: email.emailId }), { expirationTtl: VIEW_TTL_SECONDS });

		const webAppUrl = customDomain ? `${domainUtils.toOssDomain(customDomain)}/api/telegram/getEmail/${viewToken}` : 'https://www.cloudflare.com/404'
		const inlineKeyboard = [
			[
				{
					text: 'View',
					web_app: { url: webAppUrl }
				}
			]
		];

		if (email.code) {
			inlineKeyboard.push([
				{
					text: email.code,
					copy_text: { text: email.code }
				}
			]);
		}

		await Promise.all(tgChatIds.map(async chatId => {
			try {
				const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						chat_id: chatId,
						parse_mode: 'HTML',
						text: emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText),
						reply_markup: {
							inline_keyboard: inlineKeyboard
						}
					})
				});
				if (!res.ok) {
					console.error(`转发 Telegram 失败 status: ${res.status} response: ${await res.text()}`);
				}
			} catch (e) {
				console.error(`转发 Telegram 失败:`, e.message);
			}
		}));

	}

}

export default telegramService
