import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result';
import {t} from '../i18n/i18n.js';
import { cors } from 'hono/cors';

app.use('*', cors());

app.onError((err, c) => {
	if (err.name === 'BizError') {
		console.log(err.message);
	} else {
		console.error(err);
	}

	if (err.message === `Cannot read properties of undefined (reading 'get')`) {
		return c.json(result.fail(t(c, 'kvNotBound'),502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'put')`) {
		return c.json(result.fail(t(c, 'kvNotBound'),502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
		return c.json(result.fail(t(c, 'dbNotBound'),502));
	}

	if (err.message?.includes('D1_ERROR: no such column')) {
		return c.json(result.fail(t(c, 'dbNeedsUpdate'),502));
	}

	return c.json(result.fail(err.name === 'BizError' ? err.message : t(c, 'serverError'),
		err.name === 'BizError' ? err.code : 500));
});

export default app;
