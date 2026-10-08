    import { defineStore } from 'pinia'

export const useAccountStore = defineStore('account', {
    state: () => ({
        currentAccountId: 0,
        currentAccount: {},
        changeUserAccountName: '',
        // 顶栏一键生成邮箱后自增，左侧列表 watch 到就刷新
        newAccountSignal: 0
    })
})