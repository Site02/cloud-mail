import i18next from 'i18next';
import zh from './zh.js'
import zhTW from './zh-TW.js'
import en from './en.js'
import app from '../hono/hono';

app.use('*', async (c, next) => {
	const header = c.req.header('accept-language') || ''
	const rawLang = header.split(',')[0].split(';')[0].trim()
	const lowerLang = rawLang.toLowerCase()
	const lang = lowerLang === 'zh-tw' || lowerLang === 'zh-hant' ? 'zh-TW' : rawLang.split('-')[0] || 'zh'
	i18next.changeLanguage(lang);
	return await next()
})

const resources = {
	en: {
		translation: en
	},
	zh: {
		translation: zh,
	},
	'zh-TW': {
		translation: zhTW,
	},
};

i18next.init({
	fallbackLng: 'zh',
	supportedLngs: ['en', 'zh', 'zh-TW'],
	resources,
});

export const t = (key, values) => i18next.t(key, values)

export default i18next;
