import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import translationSchema from '../src/const/translation-schema';

// 主力通道是 Gemini 免费档，Workers AI 作为兜底。
// 这里钉住四件事：
// 1. 配了 key 就走 Gemini，请求形状与官方 REST 一致（systemInstruction / generationConfig）
// 2. Gemini 限流（429）或空返回时自动退回 Workers AI，用户不该看到“翻译失败”
// 3. 超时/网络中断属于“结果未知”，绝不换通道重发（否则同一段文本被翻两遍、计费两遍）
// 4. 思考模型的 thought 片段不是译文，混进来会把 JSON 契约撑坏

function createD1(sqlite) {
	function statement(sql, args) {
		return {
			async first() {
				const row = sqlite.prepare(sql).get(...args);
				return row ? Object.assign({}, row) : null;
			},
			async all() {
				const rows = sqlite.prepare(sql).all(...args);
				return { results: rows.map(row => Object.assign({}, row)) };
			},
			async run() {
				const info = sqlite.prepare(sql).run(...args);
				return { success: true, meta: info };
			}
		};
	}

	return {
		prepare(sql) {
			return Object.assign(statement(sql, []), {
				bind(...args) {
					return statement(sql, args);
				}
			});
		},
		async batch(stmts) {
			const out = [];
			for (const stmt of stmts) {
				out.push(await stmt.run());
			}
			return out;
		}
	};
}

function createKv() {
	const store = new Map();
	return {
		async get(key, options) {
			const value = store.get(key);
			if (value === undefined) return null;
			return options?.type === 'json' ? JSON.parse(value) : value;
		},
		async put(key, value) {
			store.set(key, value);
		},
		store
	};
}

// Workers AI 兜底通道的假实现：译文前缀用 [护]，一眼能看出是谁翻的
function createAi() {
	const calls = [];
	return {
		calls,
		async run(model, payload) {
			calls.push({ model, payload });
			const items = itemsOf(JSON.parse(payload.messages[1].content || '{}'));
			if (!items.length) {
				return { response: '[护]' + payload.messages[1].content };
			}
			return {
				response: JSON.stringify({ items: items.map(item => ({ id: item.id, text: '[护]' + item.text })) })
			};
		}
	};
}

// 假 Gemini 端点：返回形状与 generativelanguage.googleapis.com 完全一致
function createGemini(handler) {
	const calls = [];
	const fetchImpl = async (url, init) => {
		const body = JSON.parse(init.body);
		const call = { url, headers: init.headers, body };
		calls.push(call);
		const out = await handler({ body, call, calls });
		const status = out.status === undefined ? 200 : out.status;
		return {
			ok: status >= 200 && status < 300,
			status,
			text: async () => JSON.stringify(out.payload ?? {})
		};
	};
	return { calls, fetchImpl };
}

function geminiOk(text) {
	return {
		payload: {
			candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
			usageMetadata: { candidatesTokenCount: 12, promptTokenCount: 40 }
		}
	};
}

function itemsOf(batch) {
	return Array.isArray(batch?.items) ? batch.items : [];
}

function userTextOf(body) {
	return (body.contents || [])
		.map(part => (part.parts || []).map(piece => piece.text || '').join(''))
		.join('\n');
}

const HTML = '<div><p>Hello <b>world</b></p><p>Second</p></div>';

function build({ content = HTML, vars = {} } = {}) {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('CREATE TABLE email (email_id INTEGER PRIMARY KEY, account_id INTEGER, user_id INTEGER, content TEXT, text TEXT, is_del INTEGER DEFAULT 0)');
	sqlite.exec('CREATE TABLE account (account_id INTEGER PRIMARY KEY, user_id INTEGER, is_del INTEGER DEFAULT 0)');
	for (const sql of translationSchema) {
		sqlite.exec(sql);
	}
	sqlite.exec('INSERT INTO account (account_id, user_id, is_del) VALUES (3, 1, 0)');
	sqlite.prepare('INSERT INTO email (email_id, account_id, user_id, content, text, is_del) VALUES (7, 3, 1, ?, ?, 0)')
		.run(content, 'Hello world');
	const env = { db: createD1(sqlite), kv: createKv(), ...vars };
	return { c: { env }, sqlite, env };
}

async function runToEnd(c, service, payload) {
	let current = payload;
	while (current.state !== 'done') {
		current = await service.step(c, { jobId: current.jobId }, 1);
	}
	return current;
}

describe('translation provider chain', () => {

	it('配了 Gemini key 就走 Gemini，请求形状与官方 REST 一致', async () => {
		const gemini = createGemini(({ body }) => geminiOk(JSON.stringify({
			items: itemsOf(JSON.parse(userTextOf(body) || '{}')).map(item => ({ id: item.id, text: '[G]' + item.text }))
		})));
		const { c, sqlite } = build({
			vars: { GEMINI_API_KEY: 'test-key', translateFetch: gemini.fetchImpl, ai: createAi() }
		});
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		expect(done.content).toContain('[G]Hello');
		// 走的是 Gemini，不是 Workers AI
		expect(done.content).not.toContain('[护]');

		const call = gemini.calls[0];
		expect(call.url).toContain('/models/gemini-2.5-flash:generateContent');
		expect(call.headers['x-goog-api-key']).toBe('test-key');
		expect(call.body.systemInstruction.parts[0].text.length).toBeGreaterThan(20);
		expect(call.body.generationConfig.temperature).toBe(0);
		expect(call.body.generationConfig.maxOutputTokens).toBeGreaterThan(1024);
		// 批量契约交给 Gemini 强制成 JSON
		expect(call.body.generationConfig.responseMimeType).toBe('application/json');
		// 翻译是机械任务，默认关掉思考，别让思考 token 吃掉输出预算
		expect(call.body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });

		// 缓存键要带通道前缀，换通道就等于换译文
		const row = sqlite.prepare('SELECT model FROM email_translation WHERE email_id = 7').get();
		expect(row.model).toBe('gemini:gemini-2.5-flash');
	});

	it('Gemini 被限流时自动退回 Workers AI', async () => {
		const gemini = createGemini(() => ({
			status: 429,
			payload: { error: { code: 429, message: 'Resource has been exhausted' } }
		}));
		const ai = createAi();
		const { c } = build({ vars: { GEMINI_API_KEY: 'test-key', translateFetch: gemini.fetchImpl, ai } });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		// 主用今天被限流，不代表用户今天翻不了邮件
		expect(done.state).toBe('done');
		expect(done.content).toContain('[护]Hello');
		expect(gemini.calls.length).toBeGreaterThan(0);
		expect(ai.calls.length).toBeGreaterThan(0);
	});

	it('Gemini 返回空内容时退回 Workers AI', async () => {
		const gemini = createGemini(() => ({ payload: { candidates: [{ content: { parts: [] }, finishReason: 'STOP' }] } }));
		const ai = createAi();
		const { c } = build({ vars: { GEMINI_API_KEY: 'test-key', translateFetch: gemini.fetchImpl, ai } });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		expect(done.content).toContain('[护]Hello');
	});

	it('Gemini 网络异常属于结果未知，不换通道重发', async () => {
		const gemini = createGemini(() => {
			throw new Error('network down');
		});
		const ai = createAi();
		const { c } = build({ vars: { GEMINI_API_KEY: 'test-key', translateFetch: gemini.fetchImpl, ai } });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		await expect(service.step(c, { jobId: payload.jobId }, 1)).rejects.toMatchObject({
			errorKey: 'translationModelFailed',
			code: 504
		});
		// 结果未知时换通道 = 同一段文本被翻两遍、计费两遍
		expect(ai.calls.length).toBe(0);
	});

	it('思考片段不会被当成译文塞进 JSON 契约', async () => {
		const gemini = createGemini(({ body }) => ({
			payload: {
				candidates: [{
					content: {
						parts: [
							{ text: '{"items":[{"id":"u1","text":"思考中的半截 JSON', thought: true },
							{ text: JSON.stringify({ items: itemsOf(JSON.parse(userTextOf(body) || '{}')).map(item => ({ id: item.id, text: '[G]' + item.text })) }) }
						]
					},
					finishReason: 'STOP'
				}]
			}
		}));
		const { c } = build({ vars: { GEMINI_API_KEY: 'test-key', translateFetch: gemini.fetchImpl, ai: createAi() } });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		expect(done.content).toContain('[G]Hello');
		expect(done.content).not.toContain('思考中的半截');
	});

	it('模型不认 thinkingConfig 时去掉它重发一次', async () => {
		const gemini = createGemini(({ body, calls }) => {
			if (calls.length === 1) {
				return { status: 400, payload: { error: { code: 400, message: 'Unknown name "thinkingConfig"' } } };
			}
			return geminiOk(JSON.stringify({
				items: itemsOf(JSON.parse(userTextOf(body) || '{}')).map(item => ({ id: item.id, text: '[G]' + item.text }))
			}));
		});
		const { c } = build({ vars: { GEMINI_API_KEY: 'test-key', translateFetch: gemini.fetchImpl, ai: createAi() } });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		expect(done.content).toContain('[G]Hello');
		expect(gemini.calls[0].body.generationConfig.thinkingConfig).toBeTruthy();
		expect(gemini.calls[1].body.generationConfig.thinkingConfig).toBeUndefined();
	});

	it('显式指定 workers-ai 时即使配了 key 也不走 Gemini', async () => {
		const gemini = createGemini(() => geminiOk('{"items":[]}'));
		const ai = createAi();
		const { c, sqlite } = build({
			vars: {
				GEMINI_API_KEY: 'test-key',
				translateFetch: gemini.fetchImpl,
				ai,
				ai_translate_provider: 'workers-ai'
			}
		});
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		expect(done.content).toContain('[护]Hello');
		expect(gemini.calls.length).toBe(0);
		expect(sqlite.prepare('SELECT model FROM email_translation WHERE email_id = 7').get().model)
			.toBe('workers-ai:@cf/meta/llama-3.1-8b-instruct-fast');
	});
});
