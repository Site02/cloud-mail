const bundled = [
    ['zh', '简体中文', 'zh-CN', 'zh-cn', 'ltr'],
    ['en', 'English', 'en-US', 'en', 'ltr'],
    ['es', 'Español', 'es-ES', 'es', 'ltr'],
    ['fr', 'Français', 'fr-FR', 'fr', 'ltr'],
    ['ja', '日本語', 'ja-JP', 'ja', 'ltr'],
    ['ko', '한국어', 'ko-KR', 'ko', 'ltr'],
    ['de', 'Deutsch', 'de-DE', 'de', 'ltr'],
    ['pt', 'Português (Brasil)', 'pt-BR', 'pt-br', 'ltr'],
    ['ru', 'Русский', 'ru-RU', 'ru', 'ltr'],
    ['it', 'Italiano', 'it-IT', 'it', 'ltr'],
    ['id', 'Bahasa Indonesia', 'id-ID', 'id', 'ltr'],
    ['vi', 'Tiếng Việt', 'vi-VN', 'vi', 'ltr'],
    ['tr', 'Türkçe', 'tr-TR', 'tr', 'ltr'],
    ['ar', 'العربية', 'ar-SA', 'ar', 'rtl'],
    ['hi', 'हिन्दी', 'hi-IN', 'hi', 'ltr'],
]

const lazy = [
    ['zh-Hant', '繁體中文', 'zh-TW', 'zh-tw', 'ltr'],
]

export const languages = [
    ...bundled.map(([code, name, intl, dateLocale, dir]) => ({code, name, intl, dateLocale, dir, delivery: 'bundled', status: 'published'})),
    ...lazy.map(([code, name, intl, dateLocale, dir]) => ({code, name, intl, dateLocale, dir, delivery: 'lazy', status: 'published'})),
]

const byCode = new Map(languages.map(language => [language.code, language]))
const aliases = new Map([
    ['iw', 'he'], ['jw', 'jv'], ['tl', 'fil'], ['no', 'nb'],
])

function parseLanguageTag(value) {
    if (typeof value !== 'string') return null
    const parts = value.trim().replaceAll('_', '-').split('-')
    if (!parts[0]) return null
    parts[0] = aliases.get(parts[0].toLowerCase()) || parts[0]
    try {
        const locale = new Intl.Locale(parts.join('-'))
        return {
            tag: locale.baseName.toLowerCase(),
            language: locale.language,
            script: locale.script || locale.maximize().script,
            region: locale.region,
        }
    } catch {
        return null
    }
}

function catalogEntries(catalog) {
    return catalog.map(language => ({
        language,
        offered: parseLanguageTag(language.intl || language.code),
        codeTag: parseLanguageTag(language.code)?.tag,
    }))
}

const publishedEntries = catalogEntries(languages)

export function matchLanguageTag(value, catalog = languages) {
    const requested = parseLanguageTag(value)
    if (!requested) return null
    let best = null
    for (const {language, offered, codeTag} of catalog === languages ? publishedEntries : catalogEntries(catalog)) {
        if (!offered || offered.language !== requested.language || offered.script !== requested.script) continue
        const score = requested.tag === codeTag ? 4
            : requested.tag === offered.tag ? 3
            : requested.region && requested.region === offered.region ? 2
            : language.code === requested.language ? 1 : 0
        if (!best || score > best.score) best = {code: language.code, score}
    }
    return best?.code || null
}

export function normalizeLanguage(value) {
    return matchLanguageTag(value)
}

export function getBrowserLanguage() {
    if (typeof navigator === 'undefined') return 'en'
    const preferred = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const value of preferred) {
        const code = normalizeLanguage(value)
        if (code) return code
    }
    return 'en'
}

export function resolveLanguage(selection, browserLanguage = getBrowserLanguage()) {
    return normalizeLanguage(selection) || normalizeLanguage(browserLanguage) || 'en'
}

export function intlLanguage(code) {
    return languageInfo(code)?.intl || 'en-US'
}

export function languageDirection(code) {
    return languageInfo(code)?.dir || 'ltr'
}

export function dateLocale(code) {
    return languageInfo(code)?.dateLocale || 'en'
}

export function languageInfo(code) {
    return byCode.get(normalizeLanguage(code)) || null
}

export function manifestPath(code, temporary = false) {
    return `/manifest-${temporary ? 'temp' : 'mail'}-${normalizeLanguage(code) || 'en'}.webmanifest`
}
