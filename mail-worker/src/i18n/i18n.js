import i18next from 'i18next';
import zh from './zh.js';
import en from './en.js';
import es from './es.js';
import fr from './fr.js';
import ja from './ja.js';
import ko from './ko.js';
import de from './de.js';
import pt from './pt.js';
import ru from './ru.js';
import it from './it.js';
import id from './id.js';
import vi from './vi.js';
import tr from './tr.js';
import ar from './ar.js';
import hi from './hi.js';
import expanded from './expanded.js';
import {normalizeLanguage} from '../../../mail-vue/src/i18n/languages.js';

const resources = Object.fromEntries(
	Object.entries({...expanded, zh, en, es, fr, ja, ko, de, pt, ru, it, id, vi, tr, ar, hi})
		.map(([language, translation]) => [language, {translation}]),
);

const translator = i18next.createInstance();
translator.init({
	resources,
	lng: 'en',
	fallbackLng: 'en',
	initImmediate: false,
	interpolation: {escapeValue: false},
});

export function requestLanguage(c) {
	const preferences = c?.req?.header('accept-language') || '';
	const ranked = preferences.split(',').map((entry, index) => {
		const [tag, ...parameters] = entry.trim().split(';').map(part => part.trim());
		if (!/^[a-z]{2,8}(?:[-_][a-z0-9]{1,8})*$/i.test(tag)) return null;
		const language = normalizeLanguage(tag);
		if (!Object.hasOwn(resources, language)) return null;

		let quality = 1;
		if (parameters.length > 1) return null;
		if (parameters.length === 1) {
			const match = /^q\s*=\s*(0(?:\.\d*)?|1(?:\.0*)?)$/i.exec(parameters[0]);
			if (!match) return null;
			quality = Number(match[1]);
		}
		return {language, quality, index};
	}).filter(Boolean).sort((a, b) => b.quality - a.quality || a.index - b.index);
	for (const preference of ranked) {
		if (preference.quality <= 0) continue;
		return preference.language;
	}
	return 'en';
}

export function t(c, key, values) {
	return translator.t(key, {lng: requestLanguage(c), ...values});
}

export default translator;
