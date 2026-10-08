import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import i18n from '@/i18n/index.js'
import {dateLocale, intlLanguage, normalizeLanguage, resolveLanguage} from '@/i18n/languages.js'
dayjs.extend(utc)
dayjs.extend(timezone)
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const dateLoaders = {
    en: () => Promise.resolve(),
    'zh-cn': () => import('dayjs/locale/zh-cn'),
    'zh-tw': () => import('dayjs/locale/zh-tw'),
    es: () => import('dayjs/locale/es'),
    fr: () => import('dayjs/locale/fr'),
    ja: () => import('dayjs/locale/ja'),
    ko: () => import('dayjs/locale/ko'),
    de: () => import('dayjs/locale/de'),
    'pt-br': () => import('dayjs/locale/pt-br'),
    ru: () => import('dayjs/locale/ru'),
    it: () => import('dayjs/locale/it'),
    id: () => import('dayjs/locale/id'),
    vi: () => import('dayjs/locale/vi'),
    tr: () => import('dayjs/locale/tr'),
    ar: () => import('dayjs/locale/ar'),
    hi: () => import('dayjs/locale/hi'),
}
const loading = new Map([['en', Promise.resolve()]])
const loaded = new Set(['en'])

export function hasDateLocale(code) {
    return Boolean(normalizeLanguage(code) && dateLoaders[dateLocale(code)])
}

export function loadDateLocale(code) {
    if (!normalizeLanguage(code)) return Promise.reject(new Error(`Date locale ${code} is unavailable`))
    const key = dateLocale(code)
    if (!dateLoaders[key]) return Promise.reject(new Error(`Date locale ${key} is unavailable`))
    if (!loading.has(key)) {
        loading.set(key, dateLoaders[key]().then(() => {
            loaded.add(key)
            return key
        }).catch(error => {
            loading.delete(key)
            throw error
        }))
    }
    return loading.get(key)
}

function currentLanguage() {
    return resolveLanguage(i18n.global.locale.value)
}

export function fromNow(date) {
    const d = dayjs.utc(date).tz(timeZone);
    const now = dayjs();
    const locale = intlLanguage(currentLanguage());
    const relative = new Intl.RelativeTimeFormat(locale, {numeric: 'auto', style: 'short'});
    const seconds = Math.max(0, now.diff(d, 'second'));
    if (seconds < 60) return relative.format(0, 'second');
    if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), 'minute');
    if (seconds < 7200) return relative.format(-Math.floor(seconds / 3600), 'hour');
    if (now.isSame(d, 'day')) {
        return new Intl.DateTimeFormat(locale, {hour: 'numeric', minute: '2-digit'}).format(d.toDate());
    }
    return new Intl.DateTimeFormat(locale, {
        month: 'short', day: 'numeric',
        ...(now.year() === d.year() ? {} : {year: 'numeric'}),
    }).format(d.toDate());
}

export function updateNow(date) {
    return fromNow(date)
}

export function formatDetailDate(time, lang = currentLanguage()) {
    const d = dayjs.utc(time).tz(timeZone);
    const now = dayjs();
    return new Intl.DateTimeFormat(intlLanguage(lang), {
        weekday: 'short', month: 'short', day: 'numeric',
        ...(now.year() === d.year() ? {} : {year: 'numeric'}),
        hour: 'numeric', minute: '2-digit',
    }).format(d.toDate());
}

export function tzDayjs(time) {
    return dayjs.utc(time).tz(timeZone)
}

export function toUtc(time) {
    return dayjs(time).utc()
}

export function setExtend(lang) {
    const key = dateLocale(lang)
    if (!normalizeLanguage(lang) || !loaded.has(key)) {
        throw new Error(`Date locale ${lang} was not loaded`)
    }
    dayjs.locale(key)
}
