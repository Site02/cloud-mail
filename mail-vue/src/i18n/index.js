import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'
import es from './es.js'
import fr from './fr.js'
import ja from './ja.js'
import ko from './ko.js'
import de from './de.js'
import pt from './pt.js'
import ru from './ru.js'
import it from './it.js'
import id from './id.js'
import vi from './vi.js'
import tr from './tr.js'
import ar from './ar.js'
import hi from './hi.js'
import {normalizeLanguage} from './languages.js'
export {getBrowserLanguage, resolveLanguage} from './languages.js'
const i18n = createI18n({
    legacy: false,
    fallbackLocale: 'en',
    messages: {
        zh,
        en,
        es,
        fr,
        ja,
        ko,
        de,
        pt,
        ru,
        it,
        id,
        vi,
        tr,
        ar,
        hi,
    },
});

const expanded = import.meta.glob('./locales/*.json', {import: 'default'})
const loading = new Map()

export async function loadLanguage(value) {
    const code = normalizeLanguage(value) || 'en'
    if (i18n.global.availableLocales.includes(code)) return code
    const importer = expanded[`./locales/${code}.json`]
    if (!importer) throw new Error(`Language ${code} is unavailable`)
    if (!loading.has(code)) {
        loading.set(code, importer().then(messages => {
            i18n.global.setLocaleMessage(code, messages)
            return code
        }).finally(() => loading.delete(code)))
    }
    return loading.get(code)
}

export default i18n;
