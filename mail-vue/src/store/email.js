import { defineStore } from 'pinia'
import { EmailUnreadEnum } from '../enums/email-enum.js'
import {loadCompleteMailPage} from '../utils/mail-recovery.js'
import {useWriterStore} from './writer.js'

export const useEmailStore = defineStore('email', {
    state: () => ({
        deleteIds: 0,
        starScroll: null,
        emailScroll: null,
        cancelStarEmailId: 0,
        addStarEmailId: 0,
        contentData: {
            email: null,
            sourceRoute: null,
            delType: null,
            showStar: true,
            showReply: true,
            showUnread: false
        },
        sendScroll: null,
        detailMap: {},
        sessionUserId: 0,
        sessionRevision: 0,
    }),
    persist: {
        pick: ['contentData', 'sessionUserId'],
    },
    actions: {
        clearPrivateSession() {
            useWriterStore().setSessionUser(0)
            const revision = this.sessionRevision + 1
            this.$reset()
            this.sessionRevision = revision
        },
        setSessionUser(userId) {
            const id = Number(userId)
            if (!Number.isSafeInteger(id) || id <= 0) {
                this.clearPrivateSession()
                return
            }
            if (id !== this.sessionUserId) this.clearPrivateSession()
            this.sessionUserId = id
            useWriterStore().setSessionUser(id)
        },
        fetchList(request) {
            const revision = this.sessionRevision
            return loadCompleteMailPage(request, list => {
                if (revision !== this.sessionRevision) throw new Error('Mail session changed')
                this.applyFullList(list)
            })
        },
        applyFullList(list) {
            if (!list?.length) return
            const currentId = this.contentData.email?.emailId
            for (const item of list) {
                if (!item?.emailId) continue
                if (!item.attList) item.attList = []
                // 完整列表可能早于「标已读」返回，避免把本地已读状态盖回未读
                const prev = this.detailMap[item.emailId]
                const keepRead = prev?.unread === EmailUnreadEnum.READ
                    || (currentId === item.emailId && this.contentData.email?.unread === EmailUnreadEnum.READ)
                if (keepRead) {
                    item.unread = EmailUnreadEnum.READ
                }
                this.detailMap[item.emailId] = item
                if (currentId && item.emailId === currentId) {
                    this.contentData.email = item
                }
            }
        },
        toContentEmail(email) {
            const id = email?.emailId
            if (id && this.detailMap[id]) {
                return this.detailMap[id]
            }
            return {
                ...email,
                emailId: id || 0,
                content: '',
                text: '',
                attList: [],
                recipient: email?.recipient || '[]',
            }
        },
        markListRead(emailId) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.READ
            }
        },
    },
})
