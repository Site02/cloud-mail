import emailUtils from '../utils/email-utils';
import { settingConst } from '../const/entity-const';
import translationConst from '../const/translation-const';
import translationPrompt from '../utils/translation-prompt';
import BizError from '../error/biz-error';
import { t, getT } from '../i18n/i18n';

const aiService = {
	async extractCode(c, email, options = {}) {
		if (!this.shouldExtractCode(options.aiCode, options.aiCodeFilter, email)) {
			return '';
		}

		const ai = c.env.ai;

		try {
			const subject = email.subject || '';
			const text = emailUtils.formatText(email.text || '');
			const htmlText = emailUtils.htmlToText(email.html || '');
			const body = (htmlText || text).slice(0, 6000);

			if (!subject && !body) {
				return '';
			}

			const result = await ai.run(c.env.ai_model || '@cf/meta/llama-3.1-8b-instruct-fast', {
				messages: [
					{
						role: 'system',
						content: 'You extract verification codes from emails. Return only JSON like {"code":"12345678"} or {"code":""}. The code must be 8 characters or fewer and must not contain spaces. If the code is longer than 8 characters or contains spaces, return {"code":""}. Do not explain.'
					},
					{
						role: 'user',
						content: `Subject: ${subject}\n\n${body}`
					}
				],
				temperature: 0,
				max_tokens: 32
			});

			const content = typeof result === 'string' ? result : result?.response || '';
			const json = typeof content === 'string' ? JSON.parse(content) : content;
			if (typeof json.code !== 'string') {
				return '';
			}

			if (json.code.length > 8 || /\s/.test(json.code)) {
				return '';
			}

			return json.code;
		} catch (e) {
			console.error('验证码提取失败: ', e);
			return '';
		}
	},

	shouldExtractCode(aiCode, aiCodeFilterStr, email) {
		if (aiCode !== settingConst.aiCode.OPEN) {
			return false;
		}

		const filterList = aiCodeFilterStr ? aiCodeFilterStr.split(',').map(item => item.trim().toLowerCase()).filter(Boolean) : [];

		if (filterList.length === 0) {
			return true;
		}

		const fromEmail = (email.from?.address || '').trim().toLowerCase();
		const fromDomain = emailUtils.getDomain(fromEmail).toLowerCase();

		return filterList.some(item => item === fromEmail || item === fromDomain);
	},

	async translateBatch(c, lang, items, options = {}) {
		const envModel = options.model
			|| c.env?.ai_translate_model || c.env?.ai_model || translationConst.MODEL;
		const timeoutMs = options.timeoutMs || translationConst.AI_TIMEOUT_MS;

		if (!c.env?.ai) {
			throw new BizError(getT(c)('translationAiUnavailable'), 503);
		}

		const runPromise = c.env.ai.run(envModel, {
			messages: [
				{ role: 'system', content: translationPrompt.system(lang) },
				{ role: 'user', content: translationPrompt.user(lang, items) }
			],
			temperature: 0,
			max_tokens: 2048
		});

		// 超时先返回时，模型 promise 仍可能稍后 reject，这里挂一个兜底避免未处理拒绝
		runPromise.catch(() => {});

		let timer = null;
		const timeoutPromise = new Promise((resolve, reject) => {
			timer = setTimeout(() => {
				const error = new BizError(getT(c)('translationTimeout'), 504);
				error.uncertain = true;
				reject(error);
			}, timeoutMs);
		});

		let response;
		try {
			response = await Promise.race([runPromise, timeoutPromise]);
		} catch (e) {
			if (e?.name === 'BizError') throw e;
			// 网络/网关层异常属于“模型是否已计费未知”，与超时同等对待，不自动重试
			const error = new BizError(getT(c)('translationModelFailed'), 502);
			error.uncertain = true;
			throw error;
		} finally {
			if (timer) clearTimeout(timer);
		}

		const content = typeof response === 'string' ? response : response?.response;
		if (typeof content !== 'string' || !content.trim()) {
			throw new BizError(getT(c)('translationInvalidOutput'), 502);
		}

		let json;
		try {
			json = JSON.parse(content);
		} catch (e) {
			throw new BizError(getT(c)('translationInvalidOutput'), 502);
		}

		const list = json?.items;
		if (!Array.isArray(list) || list.length !== items.length) {
			throw new BizError(getT(c)('translationInvalidOutput'), 502);
		}

		const map = new Map();
		for (let i = 0; i < list.length; i++) {
			const row = list[i];
			const expect = items[i];
			if (!row || typeof row.id !== 'string' || typeof row.text !== 'string') {
				throw new BizError(getT(c)('translationInvalidOutput'), 502);
			}
			if (row.id !== expect.id) {
				throw new BizError(getT(c)('translationInvalidOutput'), 502);
			}
			if (row.text.length > expect.text.length * 6 + 64) {
				throw new BizError(getT(c)('translationInvalidOutput'), 502);
			}
			// 源文本有内容却翻回空白，说明模型漏译，不能当作成功
			if (expect.text.trim() && !row.text.trim()) {
				throw new BizError(getT(c)('translationInvalidOutput'), 502);
			}
			map.set(row.id, row.text);
		}
		return { map, model: envModel };
	}
};

export default aiService;