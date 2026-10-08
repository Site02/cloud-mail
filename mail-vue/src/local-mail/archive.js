import Dexie from 'dexie'

export const MAX_ARCHIVE_FILE_BYTES = 10 * 1024 * 1024
export const MAX_ARCHIVE_BINARY_BYTES = 100 * 1024 * 1024

function normalizedAddress(value) {
  return String(value || '').trim().toLowerCase()
}

function mailKey(address, emailId) {
  return `${normalizedAddress(address)}:${Number(emailId)}`
}

function binaryKey(messageKey, kind, id) {
  return `${messageKey}:${kind}:${id}`
}

export function createMailArchive({name = 'temporary-mail-archive-v1', indexedDB, IDBKeyRange} = {}) {
  const db = new Dexie(name, {
    indexedDB: indexedDB || globalThis.indexedDB,
    IDBKeyRange: IDBKeyRange || globalThis.IDBKeyRange,
  })
  db.version(1).stores({
    meta: '&key',
    addresses: '&address,lastUsedAt',
    messages: '&key,address,[address+createTime],savedAt',
    binaries: '&key,messageKey,size',
  })

  async function lastClear() {
    return (await db.meta.get('clearedAt'))?.value || 0
  }

  async function clearInside(now) {
    const clearedAt = Math.max(now, (await lastClear()) + 1)
    await Promise.all([db.meta.clear(), db.addresses.clear(), db.messages.clear(), db.binaries.clear()])
    await db.meta.bulkPut([
      {key: 'clearedAt', value: clearedAt},
      {key: 'binaryBytes', value: 0},
    ])
    return clearedAt
  }

  async function clear(now = Date.now()) {
    return db.transaction('rw', db.meta, db.addresses, db.messages, db.binaries, async () => {
      return clearInside(now)
    })
  }

  async function startSession() {
    return db.transaction('r', db.meta, db.addresses, async () => {
      return {
        clearRevision: await lastClear(),
        addresses: await db.addresses.orderBy('lastUsedAt').reverse().toArray(),
      }
    })
  }

  async function listAddresses() {
    return db.addresses.orderBy('lastUsedAt').reverse().toArray()
  }

  async function recordAddress(value, now = Date.now(), {capturedAt = now, expectedClear} = {}) {
    const address = normalizedAddress(value)
    if (!address) return false
    return db.transaction('rw', db.addresses, db.meta, async () => {
      const clearRevision = await lastClear()
      if (clearRevision >= capturedAt || (expectedClear !== undefined && clearRevision !== expectedClear)) return false
      const existing = await db.addresses.get(address)
      await db.addresses.put({
        address,
        firstUsedAt: existing?.firstUsedAt || now,
        lastUsedAt: now,
        messageCount: existing?.messageCount || 0,
      })
      return true
    })
  }

  async function saveMessage(value, mail, {full = false, capturedAt = Date.now(), expectedClear} = {}) {
    const address = normalizedAddress(value)
    if (!address || !Number.isSafeInteger(Number(mail?.emailId)) || Number(mail.emailId) <= 0) return false
    const key = mailKey(address, mail.emailId)
    return db.transaction('rw', db.meta, db.addresses, db.messages, async () => {
      const clearRevision = await lastClear()
      if (clearRevision >= capturedAt || (expectedClear !== undefined && clearRevision !== expectedClear)) return false
      const previous = await db.messages.get(key)
      const now = Date.now()
      const record = full ? {
        ...previous,
        key, address, emailId: Number(mail.emailId),
        sendEmail: mail.sendEmail || '',
        sendName: mail.sendName || '',
        subject: mail.subject || '',
        code: mail.code || '',
        createTime: mail.createTime || previous?.createTime || '',
        content: mail.content || '',
        text: mail.text || '',
        recipient: mail.recipient || '',
        toEmail: mail.toEmail || address,
        status: mail.status,
        message: mail.message || '',
        attList: (mail.attList || []).map(att => ({
          attId: att.attId, filename: att.filename, mimeType: att.mimeType, size: att.size,
        })),
        inlineKeys: Object.keys(mail.inlineMedia || {}),
        complete: true,
        savedAt: now,
      } : {
        ...previous,
        key, address, emailId: Number(mail.emailId),
        sendEmail: mail.sendEmail || previous?.sendEmail || '',
        sendName: mail.sendName || previous?.sendName || '',
        subject: mail.subject || previous?.subject || '',
        code: mail.code || previous?.code || '',
        createTime: mail.createTime || previous?.createTime || '',
        complete: previous?.complete || false,
        savedAt: previous?.savedAt || now,
      }
      await db.messages.put(record)
      if (!previous) {
        const box = await db.addresses.get(address)
        await db.addresses.put({
          address,
          firstUsedAt: box?.firstUsedAt || now,
          lastUsedAt: box?.lastUsedAt || now,
          messageCount: (box?.messageCount || 0) + 1,
        })
      }
      return true
    })
  }

  async function getMessage(address, emailId) {
    return db.messages.get(mailKey(address, emailId))
  }

  async function listMessages(value, {offset = 0, limit = 100} = {}) {
    const address = normalizedAddress(value)
    return db.messages.where('[address+createTime]')
      .between([address, Dexie.minKey], [address, Dexie.maxKey])
      .reverse().offset(offset).limit(limit).toArray()
  }

  async function countMessages(value) {
    return db.messages.where('address').equals(normalizedAddress(value)).count()
  }

  async function saveBinary(messageKey, kind, id, blob, {capturedAt = Date.now(), expectedClear} = {}) {
    if (!(blob instanceof Blob) || blob.size > MAX_ARCHIVE_FILE_BYTES) return {saved: false, reason: 'fileLimit'}
    const key = binaryKey(messageKey, kind, id)
    return db.transaction('rw', db.meta, db.binaries, async () => {
      const clearRevision = await lastClear()
      if (clearRevision >= capturedAt || (expectedClear !== undefined && clearRevision !== expectedClear)) {
        return {saved: false, reason: 'cleared'}
      }
      const existing = await db.binaries.get(key)
      const used = (await db.meta.get('binaryBytes'))?.value || 0
      const next = used - (existing?.size || 0) + blob.size
      if (next > MAX_ARCHIVE_BINARY_BYTES) return {saved: false, reason: 'archiveLimit'}
      await db.binaries.put({key, messageKey, kind, id: String(id), size: blob.size, blob})
      await db.meta.put({key: 'binaryBytes', value: next})
      return {saved: true}
    })
  }

  async function getBinary(messageKey, kind, id) {
    return (await db.binaries.get(binaryKey(messageKey, kind, id)))?.blob || null
  }

  async function getInlineBinaries(messageKey) {
    return db.binaries.where('messageKey').equals(messageKey).filter(item => item.kind === 'inline').toArray()
  }

  async function stats() {
    return {
      addresses: await db.addresses.count(),
      messages: await db.messages.count(),
      binaryBytes: (await db.meta.get('binaryBytes'))?.value || 0,
    }
  }

  return {db, clear, startSession, listAddresses, recordAddress, saveMessage,
    getMessage, listMessages, countMessages, saveBinary, getBinary, getInlineBinaries, stats, mailKey}
}

let currentArchive
export function mailArchive() {
  if (!currentArchive) currentArchive = createMailArchive()
  return currentArchive
}
