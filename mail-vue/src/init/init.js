import {useUserStore} from "@/store/user.js";
import {useEmailStore} from '@/store/email.js'
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n, {getBrowserLanguage, resolveLanguage} from "@/i18n/index.js";
import {intlLanguage, languageDirection, manifestPath, normalizeLanguage} from '@/i18n/languages.js'
import {prepareLanguage} from '@/i18n/ready.js'
import {setExtend} from '@/utils/day.js'

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();

    const token = localStorage.getItem('token');
    if (!token) useEmailStore().clearPrivateSession()
    if (!settingStore.lang) settingStore.lang = 'auto'
    const publicPage = window.location.hostname.startsWith('temp.') || window.location.pathname === '/find'
    const landingPage = publicPage || window.location.pathname === '/login'
    if (landingPage) {
        const currentUrl = new URL(window.location.href)
        const requested = currentUrl.searchParams.get('lang')
        const carriedLanguage = normalizeLanguage(requested)
        if (carriedLanguage) {
            if (publicPage) settingStore.publicMailboxLanguage = carriedLanguage
            else settingStore.lang = carriedLanguage
            // The router captures the initial URL when installed after init().
            // Remove the one-time preference through the router once that
            // navigation finishes, preserving other query fields and the hash.
            void router.isReady().then(() => {
                const route = router.currentRoute.value
                if (route.query.lang !== requested) return
                const query = {...route.query}
                delete query.lang
                return router.replace({path: route.path, query, hash: route.hash})
            })
        }
    }
    const initialLanguage = resolveLanguage(
        publicPage ? settingStore.publicMailboxLanguage : settingStore.lang,
        getBrowserLanguage(),
    )
    let loadedLanguage = initialLanguage
    try {
        await prepareLanguage(initialLanguage)
    } catch {
        loadedLanguage = 'en'
        await prepareLanguage('en')
    }
    i18n.global.locale.value = loadedLanguage
    setExtend(loadedLanguage)
    document.documentElement.lang = intlLanguage(loadedLanguage)
    document.documentElement.dir = languageDirection(loadedLanguage)
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', manifestPath(loadedLanguage, publicPage))

    if (publicPage) {
        document.title = i18n.global.t('temporaryInbox.title')
        return
    }

    let setting = null;

    if (token) {
        const userPromise = loginUserInfo().catch(e => {
            console.error(e);
            return null;
        });

        const [s, user] = await Promise.all([websiteConfig({timeout: 12000, noMsg: true}), userPromise]);
        setting = s;
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;

        if (user) {
            useEmailStore().setSessionUser(user.userId)
            accountStore.currentAccountId = user.account.accountId;
            accountStore.currentAccount = user.account;
            userStore.user = user;

            const routers = permsToRouter(user.permKeys);
            routers.forEach(routerData => {
                router.addRoute('layout', routerData);
            });
        }

    } else {
        setting = await websiteConfig({timeout: 12000, noMsg: true});
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;
    }
}
