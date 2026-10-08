import { defineStore } from 'pinia'

export const useWriterStore = defineStore('writer', {
    state: () => ({
        sendRecipientRecord: [],
        sessionUserId: 0,
        recipientRecords: {},
    }),
    persist: {
        pick: ['sendRecipientRecord', 'sessionUserId', 'recipientRecords'],
    },
    actions: {
        setSessionUser(userId) {
            const id = Number.isSafeInteger(Number(userId)) && Number(userId) > 0 ? Number(userId) : 0
            if (id === this.sessionUserId && id > 0) return
            if (this.sessionUserId > 0) this.recipientRecords[this.sessionUserId] = [...this.sendRecipientRecord]
            this.sessionUserId = id
            this.sendRecipientRecord = id ? [...(this.recipientRecords[id] || [])] : []
        }
    },
})
