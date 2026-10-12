import {useSettingStore} from "@/store/setting.js";
export function cvtR2Url(key) {

    if (!key) {
        return ''
    }

    if (key.startsWith('https://')) {
        return key
    }

    // Keep private attachments on this origin so the HttpOnly session cookie applies.
    if (key.startsWith('attachments/') || key.startsWith('/attachments/')) return '/' + key.replace(/^\//, '');

    const { settings } = useSettingStore();

    let domain = settings.r2Domain

    if (!domain) {
        return '/' + key.replace(/^\//, '');
    }

    if (!domain.startsWith('http')) {
        return 'https://' + domain + '/' + key
    }

    if (domain.endsWith("/")) {
        domain = domain.slice(0, -1);
    }
    return domain + '/' + key
}

export function toOssDomain(domain) {

    if (!domain) {
        return ''
    }

    if (!domain.startsWith('http')) {
        return 'https://' + domain
    }

    if (domain.endsWith("/")) {
        domain = domain.slice(0, -1);
    }

    return domain
}
