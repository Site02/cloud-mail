import i18next, {t} from './resources.js';
import {resolveLanguage} from './language.js';
import app from '../hono/hono.js';

app.use('*', async (c, next) => {
	i18next.changeLanguage(resolveLanguage(c.req.header('accept-language')));
	return await next()
})

export {t};
export default i18next;
