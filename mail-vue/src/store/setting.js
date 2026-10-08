import { defineStore } from 'pinia'

export const useSettingStore = defineStore('setting', {
    state: () => ({
        domainList: [],
        settings: {
            r2Domain: '',
            loginOpacity: 1.00,
        },
        lang: 'auto',
        publicMailboxLanguage: 'auto',
        languageLoadRevision: 0,
    }),
    actions: {

    },
    persist: {
        pick: ['lang', 'publicMailboxLanguage'],
    },
})
