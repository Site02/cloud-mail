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

	// 批量 JSON 契约拿不到时不要整块报废：这里按 id 校验、逐条补译，
	// 保证「漏项」只影响单条文本，而不是让整封邮件显示“翻译失败”

	// 模型输出经常带上 ```json 围栏或前后说明，直接 JSON.parse 会把可用结果判成失败
	parseItems(content) {
		if (typeof content !== 'string' || !content.trim()) {
			return null;
		}
		const text = content.trim();
		const candidates = [text];
		const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
		if (fenced) {
			candidates.push(fenced[1].trim());
		}
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start > -1 && end > start) {
			candidates.push(text.slice(start, end + 1));
		}
		for (const candidate of candidates) {
			try {
				const json = JSON.parse(candidate);
				if (Array.isArray(json?.items)) {
					return json.items;
				}
			} catch (e) {
				// 换下一种候选继续解析
			}
		}
		return null;
	},

	// 源文有内容却回空白是漏译；长度暴涨说明模型在乱写，两者都不能写进译文
	acceptUnit(item, text) {
		if (typeof text !== 'string') {
			return false;
		}
		if (item.text.trim() && !text.trim()) {
			return false;
		}
		return text.length <= item.text.length * 6 + 64;
	},

	// 允许模型改变返回顺序（集合对得上就够），未知 id、重复 id、异常条目一律丢弃等待补译
	collectItems(list, items, map) {
		const expected = new Map(items.map(item => [item.id, item]));
		for (const row of Array.isArray(list) ? list : []) {
			if (!row || typeof row.id !== 'string' || typeof row.text !== 'string') {
				continue;
			}
			const item = expected.get(row.id);
			if (!item || map.has(row.id)) {
				continue;
			}
			if (!this.acceptUnit(item, row.text)) {
				continue;
			}
			map.set(row.id, row.text);
		}
		return map;
	},

	async runModel(c, model, messages, timeoutMs) {
		if (!c.env?.ai) {
			throw new BizError(getT(c)('translationAiUnavailable'), 503, 'translationAiUnavailable');
		}

		const runPromise = c.env.ai.run(model, { messages, temperature: 0, max_tokens: 2048 });

		// 超时先返回时，模型 promise 仍可能稍后 reject，这里挂一个兜底避免未处理拒绝
		runPromise.catch(() => {});

		let timer = null;
		const timeoutPromise = new Promise((resolve, reject) => {
			timer = setTimeout(() => {
				const error = new BizError(getT(c)('translationTimeout'), 504, 'translationTimeout');
				error.uncertain = true;
				reject(error);
			}, timeoutMs);
		});

		let response;
		try {
			response = await Promise.race([runPromise, timeoutPromise]);
		} catch (e) {
			if (e?.name === 'BizError') {
				throw e;
			}
			// 网络/网关层异常属于“模型是否已计费未知”，与超时同等对待，不自动重试；
			// 但要把上游原话带给运维，否则线上只看到一句“翻译失败，请重试”
			const detail = String(e?.message || e || '').replace(/\s+/g, ' ').slice(0, 160);
			const error = new BizError(
				detail ? `${getT(c)('translationModelFailed')}（${detail}）` : getT(c)('translationModelFailed'),
				502,
				'translationModelFailed'
			);
			error.uncertain = true;
			throw error;
		} finally {
			if (timer) clearTimeout(timer);
		}

		const content = typeof response === 'string' ? response : response?.response;
		if (typeof content !== 'string' || !content.trim()) {
			throw new BizError(getT(c)('translationInvalidOutput'), 502, 'translationInvalidOutput');
		}
		return content;
	},

	cleanUnitOutput(content) {
		return String(content || '')
			.trim()
			// 模型偶尔把整段译文放进引号里，或加一行「译文：」前缀
			.replace(/^["'“”『「]+/, '')
			.replace(/["'“”』」]+$/, '')
			.replace(/^(translation|译文|翻译)\s*[:：]\s*/i, '')
			.trim();
	},

	// 逐条补译：并行发起，单条失败不影响其它条目，总覆盖面由调用方判定
	async repairUnits(c, lang, items, model, state) {
		// 只补缺口：已经拿到的条目不再重发，避免同一条文本被模型计费两次
		const targets = items
			.filter(item => !state.map.has(item.id))
			.slice(0, translationConst.REPAIR_MAX_UNITS);
		const settled = await Promise.allSettled(targets.map(async item => {
			const content = await this.runModel(
				c,
				model,
				[
					{ role: 'system', content: translationPrompt.unitSystem(lang) },
					{ role: 'user', content: item.text }
				],
				translationConst.REPAIR_TIMEOUT_MS
			);
			return [item.id, this.cleanUnitOutput(content)];
		}));

		for (let i = 0; i < settled.length; i++) {
			const item = targets[i];
			const row = settled[i];
			if (row.status === 'rejected') {
				if (row.reason?.uncertain === true) {
					state.uncertain = true;
				}
				console.warn('翻译补译失败', row.reason?.message);
				continue;
			}
			const [id, text] = row.value;
			// 纯文本契约下模型仍可能回一段 JSON：那不是译文，宁可判失败
			if (/^\s*[[{]/.test(text) && /"(items|id|text)"\s*:/.test(text)) {
				continue;
			}
			if (this.acceptUnit(item, text)) {
				state.map.set(id, text);
			}
		}
		return state;
	},

	async translateBatch(c, lang, items, options = {}) {
		const envModel = options.model
			|| c.env?.ai_translate_model || c.env?.ai_model || translationConst.MODEL;
		const timeoutMs = options.timeoutMs || translationConst.AI_TIMEOUT_MS;

		if (!c.env?.ai) {
			throw new BizError(getT(c)('translationAiUnavailable'), 503, 'translationAiUnavailable');
		}
		if (!Array.isArray(items) || items.length === 0) {
			return { map: new Map(), model: envModel };
		}
		const state = { map: new Map(), uncertain: false };
		let batchError = null;
		// 只有「模型按 JSON 契约回了东西、但漏了几条」才值得补译
		let canRepair = false;

		try {
			const content = await this.runModel(c, envModel, [
				{ role: 'system', content: translationPrompt.system(lang) },
				{ role: 'user', content: translationPrompt.user(lang, items) }
			], timeoutMs);
			const list = this.parseItems(content);
			if (list) {
				canRepair = true;
				this.collectItems(list, items, state.map);
				if (state.map.size === items.length) {
					return { map: state.map, model: envModel };
				}
			}
			batchError = new BizError(getT(c)('translationInvalidOutput'), 502, 'translationInvalidOutput');
		} catch (e) {
			// 超时与网关异常属于“结果未知”：不补译，避免同一个模型被重复计费
			if (e?.uncertain === true) {
				throw e;
			}
			batchError = e;
		}

		// 整段不是 JSON 说明模型根本没在工作：这时补译只会把垃圾文本当译文存下来，
		// 直接把失败抛给调用方，由分块重试或用户重试处理
		if (canRepair) {
			await this.repairUnits(c, lang, items, envModel, state);
			if (state.map.size === items.length) {
				return { map: state.map, model: envModel };
			}
		}

		if (batchError && state.uncertain) {
			batchError.uncertain = true;
		}
		throw batchError || new BizError(getT(c)('translationInvalidOutput'), 502, 'translationInvalidOutput');
	}
};

export default aiService;