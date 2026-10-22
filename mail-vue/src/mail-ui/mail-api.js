import {emailDelete, emailList, emailRead, emailSend} from '@/request/email.js'
import {starAdd, starCancel, starList} from '@/request/star.js'

const PAGE_SIZE = 50

export function createMailApiAdapter(account) {
    const accountId = Number(account?.accountId)
    const allReceive = Number(account?.allReceive) === 1 ? 1 : 0
    const cursors = {inbox: 0, sent: 0, starred: 0}

    return {
        async loadMessages() {
            requireAccount(accountId)
            const [inboxResult, sentResult, starredResult] = await Promise.all([
                emailList(accountId, allReceive, 0, 0, PAGE_SIZE, 0, true),
                emailList(accountId, allReceive, 0, 0, PAGE_SIZE, 1, true),
                starList(0, PAGE_SIZE, true),
            ])
            const inbox = requireList(inboxResult, 'inbox')
            const sent = requireList(sentResult, 'sent mail')
            const starred = requireList(starredResult, 'starred mail')
            cursors.inbox = oldestId(inbox)
            cursors.sent = oldestId(sent)
            cursors.starred = oldestId(starred)
            const rows = [...inbox, ...sent, ...starred]
            const messagesById = new Map()

            for (const row of rows) {
                messagesById.set(String(row.emailId), toMessage(row, account))
            }

            return {
                messages: [...messagesById.values()].sort((a, b) => b.timestamp - a.timestamp),
                hasMore: {
                    inbox: inbox.length === PAGE_SIZE,
                    sent: sent.length === PAGE_SIZE,
                    starred: starred.length === PAGE_SIZE,
                },
            }
        },

        async loadMoreMessages(folder) {
            const cursor = cursors[folder]
            if (!cursor) return {messages: [], hasMore: false}

            const result = folder === 'starred'
                ? await starList(cursor, PAGE_SIZE, true)
                : await emailList(accountId, allReceive, cursor, 0, PAGE_SIZE, folder === 'sent' ? 1 : 0, true)
            const rows = requireList(result, `${folder} mail`)
            cursors[folder] = oldestId(rows)
            return {
                messages: rows.map((row) => toMessage(row, account)),
                hasMore: rows.length === PAGE_SIZE,
            }
        },

        async toggleStar(id, starred) {
            if (starred) {
                await starAdd(Number(id))
            } else {
                await starCancel(Number(id))
            }
        },

        markRead(id) {
            return emailRead([Number(id)])
        },

        deleteMessage(id) {
            return emailDelete([Number(id)])
        },

        sendMessage(draft) {
            requireAccount(accountId)
            return emailSend({
                accountId,
                name: account.name || '',
                receiveEmail: [draft.to.trim()],
                subject: draft.subject.trim(),
                text: draft.body.trim(),
                content: draft.body.trim(),
                sendType: '',
                manyType: 'together',
                attachments: [],
            }, () => {})
        },
    }
}

function oldestId(rows) {
    return rows.length ? rows.reduce((oldest, row) => Math.min(oldest, Number(row.emailId)), Infinity) : 0
}

function requireAccount(accountId) {
    if (!Number.isInteger(accountId) || accountId <= 0) {
        throw new Error('No mail account is available for this user.')
    }
}

function requireList(result, label) {
    if (!Array.isArray(result?.list)) {
        throw new Error(`The ${label} response did not contain a message list.`)
    }
    return result.list
}

function toMessage(row, account) {
    const isSent = Number(row.type) === 1
    const sentAt = row.createTime ? new Date(row.createTime) : null
    const timestamp = sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt.getTime() : 0
    const formattedDate = timestamp
        ? new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(sentAt)
        : ''
    const formattedTime = timestamp
        ? new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit'}).format(sentAt)
        : ''
    const body = String(row.text || htmlToText(row.content) || '')
    const recipients = parseRecipients(row.recipient)

    return {
        id: String(row.emailId),
        from: isSent ? (account.name || 'You') : (row.name || row.sendEmail || 'Unknown sender'),
        email: isSent ? account.email : (row.sendEmail || ''),
        to: isSent ? recipients.join(', ') : (account.email || ''),
        subject: row.subject || '(No subject)',
        preview: (body.replace(/\s+/g, ' ').trim() || row.subject || '').slice(0, 160),
        body,
        time: formattedTime,
        date: formattedDate,
        timestamp,
        unread: !isSent && Number(row.unread) === 0,
        starred: Number(row.isStar) === 1,
        folder: isSent ? 'sent' : 'inbox',
        attachments: Array.isArray(row.attList) ? row.attList.map((attachment) => ({
            name: attachment.filename || 'Attachment',
            size: formatBytes(Number(attachment.size) || 0),
        })) : [],
    }
}

function parseRecipients(value) {
    if (!value) return []
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        if (!Array.isArray(parsed)) return []
        return parsed.map((recipient) => recipient.address || recipient.email || '').filter(Boolean)
    } catch {
        return [String(value)]
    }
}

function htmlToText(html) {
    if (!html) return ''
    return new DOMParser().parseFromString(String(html), 'text/html').body.textContent || ''
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    const units = ['KB', 'MB', 'GB']
    let value = bytes / 1024
    let unit = units[0]
    for (let index = 1; value >= 1024 && index < units.length; index += 1) {
        value /= 1024
        unit = units[index]
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`
}
