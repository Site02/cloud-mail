import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result';
import { cors } from 'hono/cors';

const localizedError = (c, traditional, simplified, english) => {
	const language = c.req.header('accept-language')?.toLowerCase() || ''
	if (language.startsWith('zh-tw') || language.startsWith('zh-hant')) {
		return traditional
	}
	if (language.startsWith('zh')) {
		return simplified
	}
	return english
}

app.use('*', cors());

app.onError((err, c) => {
	if (err.name === 'BizError') {
		console.log(err.message);
	} else {
		console.error(err);
	}

		if (err.message === `Cannot read properties of undefined (reading 'get')`) {
			return c.json(result.fail(localizedError(c, 'KV 資料庫未綁定', 'KV数据库未绑定', 'KV database not bound'),502));
		}

		if (err.message === `Cannot read properties of undefined (reading 'put')`) {
			return c.json(result.fail(localizedError(c, 'KV 資料庫未綁定', 'KV数据库未绑定', 'KV database not bound'),502));
		}

		if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
			return c.json(result.fail(localizedError(c, 'D1 資料庫未綁定', 'D1数据库未绑定', 'D1 database not bound'),502));
		}

		if (err.message?.includes('D1_ERROR: no such column')) {
			return c.json(result.fail(localizedError(c, '請依照文件更新資料庫', '请按照文档更新数据库', 'Please update the database as documented'),502));
	}

	return c.json(result.fail(err.message, err.code));
});

export default app;


