import {loadLanguage} from './index.js'
import {normalizeLanguage} from './languages.js'
import {loadElementLocale} from '@/ui/element-locale.js'
import {loadDateLocale} from '@/utils/day.js'

export async function prepareLanguage(value) {
    const code = normalizeLanguage(value)
    if (!code) throw new Error(`Language ${value} is unavailable`)
    const [, elementLocale] = await Promise.all([
        loadLanguage(code),
        loadElementLocale(code),
        loadDateLocale(code),
    ])
    return {code, elementLocale}
}
