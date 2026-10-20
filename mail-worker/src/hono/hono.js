import { Hono } from 'hono';
const app = new Hono();

import result from '../model/result.js';
import {t} from '../i18n/resources.js';
import {resolveLanguage} from '../i18n/language.js';
import { cors } from 'hono/cors';

app.use('*', cors());

app.onError((err, c) => {
	const translate = key => t(key, {lng: resolveLanguage(c.req.header('accept-language'))});
	if (err.name === 'BizError') {
		console.log(err.message);
	} else {
		console.error(err);
	}

	if (err.message === `Cannot read properties of undefined (reading 'get')`) {
		return c.json(result.fail(translate('kvNotBound'),502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'put')`) {
		return c.json(result.fail(translate('kvNotBound'),502));
	}

	if (err.message === `Cannot read properties of undefined (reading 'prepare')`) {
		return c.json(result.fail(translate('d1NotBound'),502));
	}

	if (err.message?.includes('D1_ERROR: no such column')) {
		return c.json(result.fail(translate('databaseUpdateRequired'),502));
	}

	return c.json(result.fail(err.message, err.code));
});

export default app;


