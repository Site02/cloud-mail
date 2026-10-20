import i18next from 'i18next';
import zh from './zh.js';
import zhTW from './zh-TW.js';
import en from './en.js';

i18next.init({
    fallbackLng: 'zh',
    resources: {
        en: {translation: en},
        zh: {translation: zh},
        'zh-TW': {translation: zhTW},
    },
});

export const t = (key, values) => i18next.t(key, values)
export default i18next;
