import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import translationSchema from '../src/const/translation-schema';

// 线上“翻译失败，请重试”的三条真实成因，各用一条测试钉住：
// 1. 模型把 JSON 包在 ```json 围栏/解释文字里 → 解析器必须仍然认得
// 2. 模型漏了条目 → 逐条补译补齐，不能让整块作废
// 3. 翻译表缺失（部署不会跑 /api/init）→ 首次请求自愈建表
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

// 模型的两种调用契约：批量走 JSON，补译走纯文本
function createAi(behavior) {
	const calls = [];
	return {
		calls,
		async run(model, payload) {
			calls.push({ model, payload });
			let batch = null;
			try {
				batch = JSON.parse(payload.messages[1].content);
			} catch (e) {
				batch = null;
			}
			const isBatch = !!batch && Array.isArray(batch.items);
			const items = isBatch ? batch.items : [];

			if (behavior === 'fence') {
				return {
					response: '这里是要的 JSON：\n```json\n'
						+ JSON.stringify({ items: items.map(item => ({ id: item.id, text: '[译]' + item.text })) })
						+ '\n```\n以上。'
				};
			}
			if (behavior === 'drop-last') {
				if (isBatch) {
					// 故意少回一条，模拟 llama 漏项
					return {
						response: JSON.stringify({
							items: items.slice(0, -1).map(item => ({ id: item.id, text: '[译]' + item.text }))
						})
					};
				}
				return { response: '[补译]' + payload.messages[1].content };
			}
			if (behavior === 'not-json') {
				return { response: '你好，我是翻译助手。' };
			}
			if (behavior === 'repair-echo-json') {
				if (isBatch) {
					return { response: JSON.stringify({ items: [] }) };
				}
				return { response: '{"items":[{"id":"x","text":"y"}]}' };
			}
			return {
				response: JSON.stringify({ items: items.map(item => ({ id: item.id, text: '[译]' + item.text })) })
			};
		}
	};
}

const HTML = '<div><p>Hello <b>world</b></p><p>Second</p></div>';

// withTranslationTables=false 用来复现“生产库没建过翻译表”的状态
function build({ behavior, withTranslationTables = true } = {}) {
	const sqlite = new DatabaseSync(':memory:');
	sqlite.exec('CREATE TABLE email (email_id INTEGER PRIMARY KEY, account_id INTEGER, user_id INTEGER, content TEXT, text TEXT, is_del INTEGER DEFAULT 0)');
	sqlite.exec('CREATE TABLE account (account_id INTEGER PRIMARY KEY, user_id INTEGER, is_del INTEGER DEFAULT 0)');
	if (withTranslationTables) {
		for (const sql of translationSchema) {
			sqlite.exec(sql);
		}
	}
	sqlite.exec('INSERT INTO account (account_id, user_id, is_del) VALUES (3, 1, 0)');
	sqlite.prepare('INSERT INTO email (email_id, account_id, user_id, content, text, is_del) VALUES (7, 3, 1, ?, ?, 0)')
		.run(HTML, 'Hello world');
	const env = { db: createD1(sqlite), kv: createKv(), ai: createAi(behavior) };
	return { c: { env }, sqlite, env };
}

async function runToEnd(c, service, payload) {
	let current = payload;
	while (current.state !== 'done') {
		current = await service.step(c, { jobId: current.jobId }, 1);
	}
	return current;
}

describe('translation resilience', () => {

	// 必须放在最前面：自愈只在模块生命周期内做一次，先跑才能复现“刚部署没建表”
	it('翻译表缺失时首次请求自愈建表', async () => {
		const { c, sqlite } = build({ withTranslationTables: false });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		expect(done.content).toContain('[译]Hello');
		expect(sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'email_translation'").get().n).toBe(1);
	});

	it('模型把 JSON 包在围栏和说明文字里也能解析', async () => {
		const { c, env } = build({ behavior: 'fence' });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		expect(done.content).toContain('[译]Hello');
		// 解析成功就不该再走补译，模型调用次数等于分块数
		expect(env.ai.calls.length).toBe(Number(done.progress.total));
	});

	it('模型漏掉条目时用纯文本契约补译，不再整块作废', async () => {
		const { c, env } = build({ behavior: 'drop-last' });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		const done = await runToEnd(c, service, payload);

		expect(done.state).toBe('done');
		// 漏掉的那条要由补译补上，且译文确实进了正文
		expect(done.content).toContain('[补译]Second');
		expect(done.content).toContain('[译]Hello');
		// 补译只发生在缺口上：调用数严格大于分块数
		expect(env.ai.calls.length).toBeGreaterThan(Number(done.progress.total));
	});

	it('模型完全没按 JSON 契约返回时直接失败，不做补译', async () => {
		const { c, env } = build({ behavior: 'not-json' });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);

		await expect(service.step(c, { jobId: payload.jobId }, 1))
			.rejects.toThrow('AI 翻译结果校验失败');
		// 只有第一次批量调用：非 JSON 说明模型没在工作，补译只会存下垃圾文本
		expect(env.ai.calls.length).toBe(1);
	});

	it('补译回来的仍然是 JSON 时不当作译文', async () => {
		const { c } = build({ behavior: 'repair-echo-json' });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);

		await expect(service.step(c, { jobId: payload.jobId }, 1))
			.rejects.toThrow('AI 翻译结果校验失败');
	});

	it('失败响应带上稳定的 errorKey，前端才能显示具体原因', async () => {
		const { c } = build({ behavior: 'not-json' });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);

		await expect(service.step(c, { jobId: payload.jobId }, 1)).rejects.toMatchObject({
			errorKey: 'translationInvalidOutput',
			code: 502
		});
	});

	it('任务里的 errorKey 会随 payload 返回给前端', async () => {
		const { c } = build({ behavior: 'not-json' });
		const { default: service } = await import('../src/service/email-translation-service.js');

		const payload = await service.start(c, { emailId: 7, targetLang: 'zh' }, 1);
		await expect(service.step(c, { jobId: payload.jobId }, 1)).rejects.toThrow();

		const status = await service.status(c, { jobId: payload.jobId }, 1);
		expect(status.errorKey).toBe('translationInvalidOutput');
	});
});
