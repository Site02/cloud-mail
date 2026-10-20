export function detectLocale(language = '') {
    const parts = language.toLowerCase().replaceAll('_', '-').split('-')
    if (parts[0] !== 'zh') return 'en'
    if (parts.includes('hans')) return 'zh'
    return parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh'
}

export const dayjsLocales = {zh: 'zh-cn', 'zh-TW': 'zh-tw', en: 'en'}
export const editorLanguages = {zh: 'zh_CN', 'zh-TW': 'zh_TW', en: 'en'}
export const htmlLanguages = {zh: 'zh-Hans', 'zh-TW': 'zh-Hant', en: 'en'}
