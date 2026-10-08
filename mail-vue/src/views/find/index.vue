<template>
  <div class="tm">
    <div class="tm-shell" :inert="Boolean(viewing)">
      <header class="tm-head">
        <div class="tm-brand">
          <span class="tm-mark"><Icon icon="fluent:mail-24-filled" width="20" height="20" aria-hidden="true"/></span>
          <span>{{ t('temporaryInbox.title') }}</span>
        </div>
        <div class="tm-language">
          <LanguageSelect v-model="settingStore.publicMailboxLanguage" />
          <AppInstallButton />
          <a class="tm-nav-link" :href="loginHref">{{ t('loginBtn') }}</a>
        </div>
      </header>

      <div class="tm-intro">
        <h1>{{ t('temporaryInbox.title') }}</h1>
        <p>{{ t('temporaryInbox.tagline') }}</p>
      </div>

      <div class="tm-grid">
        <div class="tm-side">
          <section class="tm-card" aria-labelledby="tm-address-title" :aria-busy="creating">
            <h2 id="tm-address-title" class="tm-card-label">{{ t('temporaryInbox.yourAddress') }}</h2>
            <div class="tm-addr">
              <button v-if="address" type="button" class="tm-address-copy" dir="ltr"
                      :aria-label="`${t('temporaryInbox.copyAddress')}: ${address}`" @click="copyAddr">{{ address }}</button>
              <span v-else-if="creating" class="tm-addr-skeleton" aria-hidden="true"></span>
              <span v-else class="tm-no-address">{{ t('temporaryInbox.noActiveAddress') }}</span>
            </div>
            <div class="tm-actions">
              <button v-if="!address" type="button" class="tm-btn tm-btn-primary" :disabled="creating || !isOnline" @click="genAddr">
                <Icon icon="mingcute:add-line" width="18" height="18" aria-hidden="true"/>
                {{ t('temporaryInbox.createAddress') }}
              </button>
              <button v-if="address" type="button" class="tm-btn tm-btn-primary" @click="copyAddr">
                <Icon :icon="copied ? 'fluent:checkmark-24-filled' : 'fluent:copy-24-regular'" width="18" height="18" aria-hidden="true"/>
                {{ copied ? t('temporaryInbox.copied') : t('temporaryInbox.copyAddress') }}
              </button>
              <button v-if="address" type="button" class="tm-btn" @click="copyAccessLink">{{ t('temporaryInbox.copyLink') }}</button>
              <button v-if="address" type="button" class="tm-btn" :disabled="creating || !isOnline" @click="genAddr">
                {{ t('temporaryInbox.newAddress') }}
              </button>
            </div>
            <p class="tm-access-note">{{ t('temporaryInbox.accessNote') }}</p>
          </section>

          <form class="tm-manual" @submit.prevent="useManual">
            <label for="tm-manual-address">{{ t('temporaryInbox.searchPlaceholder') }}</label>
            <div class="tm-manual-row">
              <input id="tm-manual-address" v-model="manual" type="email" :placeholder="t('temporaryInbox.searchPlaceholder')"
                     spellcheck="false" autocomplete="off" dir="ltr"/>
              <button type="submit" class="tm-btn">{{ t('temporaryInbox.search') }}</button>
            </div>
          </form>

          <section v-if="history.length" class="tm-history" aria-labelledby="tm-history-title">
            <h2 id="tm-history-title">{{ t('temporaryInbox.switchAddress') }} <span>{{ history.length }}</span></h2>
            <p class="tm-history-note">{{ t('temporaryInbox.localHistoryNote') }}</p>
            <div class="tm-history-list">
              <button v-for="item in history" :key="item.address" type="button"
                      class="tm-history-item" :class="{'is-active': item.address === address}"
                      :aria-current="item.address === address ? 'true' : undefined"
                      @click="switchAddress(item.address)">
                <Icon :icon="item.address === address ? 'fluent:mail-24-filled' : 'fluent:mail-24-regular'"
                      width="18" height="18" aria-hidden="true"/>
                <span class="tm-history-address" dir="ltr">{{ item.address }}</span>
                <span class="tm-history-count">{{ formatMailboxCount(t, publicLang, 'saved', item.messageCount || 0) }}</span>
              </button>
            </div>
            <button type="button" class="tm-clear" @click="showClearConfirm = true">{{ t('temporaryInbox.clearLocal') }}</button>
          </section>
          <div v-else class="tm-history-empty">
            <span>{{ archiveUnavailable ? t('temporaryInbox.storageUnavailable') : t('temporaryInbox.noLocalHistory') }}</span>
            <button v-if="address || archiveUnavailable || archiveWarning === 'temporaryInbox.clearFailed'" type="button"
                    class="tm-clear" @click="showClearConfirm = true">{{ t('temporaryInbox.clearLocal') }}</button>
          </div>
          <p v-if="archiveWarning" class="tm-history-warning" role="status">{{ t(archiveWarning) }}</p>
        </div>

        <div class="tm-workspace">
          <section class="tm-inbox" aria-labelledby="tm-inbox-title">
            <div class="tm-inbox-head">
              <div>
                <h2 id="tm-inbox-title">{{ t('temporaryInbox.inbox') }}</h2>
                <span v-if="address" class="tm-inbox-address" dir="ltr">{{ address }}</span>
                <span v-if="mails.length" class="tm-inbox-count">{{ formatMailboxCount(t, publicLang, 'email', mails.length) }}</span>
              </div>
              <div v-if="address && !connectionNotice" class="tm-timer">
                <span class="tm-pulse" :class="loading ? 'is-busy' : ''"></span>
                {{ loading ? t('temporaryInbox.checking') : t('temporaryInbox.refreshIn', { seconds: countdown }) }}
              </div>
            </div>

            <div v-if="connectionNotice" class="tm-connection" :class="isOnline ? 'is-failed' : 'is-offline'"
                 role="status" aria-live="polite" aria-atomic="true">
              <Icon :icon="isOnline ? 'mingcute:warning-line' : 'mingcute:wifi-off-line'" width="19" height="19" aria-hidden="true"/>
              <span>{{ t(connectionNotice) }}</span>
              <button v-if="isOnline && address && inboxError !== 'temporaryInbox.registeredAddress'" type="button" class="tm-btn tm-btn-slim"
                      :disabled="loading" @click="retryLoad">{{ t('pwa.retry') }}</button>
            </div>

            <transition-group name="tm-fade" tag="div" class="tm-mail-list">
              <article v-for="m in mails" :key="m.emailId" class="tm-mail">
                <button type="button" class="tm-mail-open"
                        :aria-label="`${m.sendName || m.sendEmail} — ${m.subject || t('temporaryInbox.noSubject')}`"
                        @click="openMail(m, $event)"></button>
                <div class="tm-mail-main">
                  <div class="tm-mail-from" dir="auto">{{ m.sendName || m.sendEmail }}</div>
                  <div class="tm-mail-subject" dir="auto">{{ m.subject || t('temporaryInbox.noSubject') }}</div>
                  <div v-if="mailPreview(m)" class="tm-mail-preview" dir="auto">{{ mailPreview(m) }}</div>
                  <div v-if="m.localOnly" class="tm-mail-local">{{ t(m.complete ? 'temporaryInbox.savedLocally' : 'temporaryInbox.summaryOnly') }}</div>
                </div>
                <div class="tm-mail-side">
                  <time class="tm-mail-time">{{ fmt(m.createTime) }}</time>
                  <button v-if="m.code" type="button" class="tm-code" :title="t('temporaryInbox.clickToCopy')"
                          :aria-label="`${t('temporaryInbox.clickToCopy')}: ${m.code}`" @click="copyCode(m.code)">
                    {{ m.code }}
                  </button>
                </div>
              </article>
            </transition-group>

            <div v-if="!mails.length" class="tm-empty">
              <span class="tm-empty-icon"><Icon icon="fluent:mail-inbox-24-regular" width="27" height="27" aria-hidden="true"/></span>
              <strong>{{ !address ? t('temporaryInbox.noActiveAddress') : t('temporaryInbox.inbox') }}</strong>
              <p>{{ t(emptyStateText, {count: 0}) }}</p>
            </div>
          </section>

          <button v-if="hasMoreOnline || hasMoreLocal" class="tm-btn tm-load-more" type="button"
                  :disabled="loadingOlder" @click="loadMoreMails">
            {{ t('temporaryInbox.loadOlder') }}
          </button>
          <p class="tm-foot">{{ t('temporaryInbox.retentionWithArchive') }}</p>
        </div>
      </div>
    </div>

    <div v-if="viewing" class="tm-modal" role="presentation" @click.self="closeMail">
      <div ref="viewDialog" class="tm-view" role="dialog" aria-modal="true"
           aria-labelledby="tm-view-subject" tabindex="-1" @keydown="onDialogKeydown">
        <header class="tm-view-head">
          <div class="tm-view-meta">
            <h2 id="tm-view-subject" class="tm-view-subject" dir="auto">{{ viewing.subject || t('temporaryInbox.noSubject') }}</h2>
          </div>
          <button ref="viewCloseButton" type="button" class="tm-view-close"
                  :title="t('temporaryInbox.close')" :aria-label="t('temporaryInbox.close')" @click="closeMail">
            <Icon icon="mingcute:close-line" width="18" height="18"/>
          </button>
        </header>

        <div class="tm-view-info">
          <div class="tm-view-info-row">
            <span class="tm-view-info-label">{{ t('temporaryInbox.sender') }}</span>
            <span class="tm-view-name" dir="auto">{{ viewing.sendName || viewing.sendEmail }}</span>
            <span v-if="viewing.sendName && viewing.sendEmail" class="tm-view-addr" dir="ltr">&lt;{{ viewing.sendEmail }}&gt;</span>
          </div>
          <div class="tm-view-info-row">
            <span class="tm-view-info-label">{{ t('temporaryInbox.recipient') }}</span>
            <span dir="ltr">{{ formatRecipients(viewing) }}</span>
          </div>
          <time class="tm-view-date">{{ formatDetailDate(viewing.createTime, publicLang) }}</time>
          <el-alert v-if="viewing.status === 3" :closable="false" :title="statusMessage(viewing.message)"
                    type="error" show-icon/>
          <el-alert v-if="viewing.status === 4" :closable="false" :title="$t('complained')"
                    type="warning" show-icon/>
          <el-alert v-if="viewing.status === 5" :closable="false" :title="$t('delayed')"
                    type="warning" show-icon/>
        </div>

        <div v-if="viewing.code" class="tm-view-code">
          <span class="tm-view-code-label">{{ t('temporaryInbox.verificationCode') }}</span>
          <button type="button" class="tm-code" :title="t('temporaryInbox.clickToCopy')"
                  :aria-label="`${t('temporaryInbox.clickToCopy')}: ${viewing.code}`" @click="copyCode(viewing.code)">
            {{ viewing.code }}
          </button>
          <span class="tm-view-code-hint">{{ copied ? t('temporaryInbox.copied') : t('temporaryInbox.clickToCopy') }}</span>
        </div>

        <div class="tm-view-stage">
          <div v-if="viewLoading" class="tm-view-loading">{{ t('temporaryInbox.opening') }}</div>
          <iframe v-else class="tm-view-frame" :title="t('temporaryInbox.emailContent')"
                  :style="{height: frameHeight}" :srcdoc="viewHtml"
                  referrerpolicy="no-referrer"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>
          <section v-if="!viewLoading && viewing.attList?.length" class="tm-attachments">
            <div class="tm-attachments-title">
              <span>{{ t('temporaryInbox.attachments') }}</span>
              <span>{{ formatMailboxCount(t, publicLang, 'attachment', viewing.attList.length) }}</span>
            </div>
            <div v-for="att in viewing.attList" :key="att.attId" class="tm-attachment">
              <button v-if="isImage(att.filename)" type="button" class="tm-attachment-file"
                      :aria-label="`${t('temporaryInbox.preview')}: ${att.filename}`" @click="showImage(att)">
                <span class="tm-attachment-icon"><Icon v-bind="getIconByName(att.filename)"/></span>
                <span class="tm-attachment-name" :title="att.filename">{{ att.filename }}</span>
              </button>
              <div v-else class="tm-attachment-file">
                <span class="tm-attachment-icon"><Icon v-bind="getIconByName(att.filename)"/></span>
                <span class="tm-attachment-name" :title="att.filename">{{ att.filename }}</span>
              </div>
              <div class="tm-attachment-size">{{ formatBytes(att.size) }}</div>
              <div class="tm-attachment-actions">
                <button v-if="isImage(att.filename)" type="button" :title="t('temporaryInbox.preview')"
                        :aria-label="`${t('temporaryInbox.preview')}: ${att.filename}`" @click="showImage(att)">
                  <Icon icon="hugeicons:view" width="22" height="22"/>
                </button>
                <button type="button" :title="t('temporaryInbox.download')"
                        :aria-label="`${t('temporaryInbox.download')}: ${att.filename}`" @click="downloadAttachment(att)">
                  <Icon icon="system-uicons:push-down" width="22" height="22"/>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <el-image-viewer v-if="showPreview" :url-list="srcList" show-progress @close="closePreview"/>
    <el-dialog v-model="showClearConfirm" :title="t('temporaryInbox.clearLocal')"
               width="min(420px, calc(100vw - 32px))" append-to-body align-center>
      <p>{{ t('temporaryInbox.clearConfirm') }}</p>
      <template #footer>
        <el-button @click="showClearConfirm = false">{{ t('temporaryInbox.cancel') }}</el-button>
        <el-button type="danger" :loading="clearing" @click="clearLocalHistory">{{ t('temporaryInbox.clearLocal') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {mailFramePolicy} from '@/utils/mail-frame-policy.js'
import {needsInlineRecovery} from '@/utils/inline-media.js'
import {computed, defineOptions, nextTick, onMounted, onUnmounted, ref} from "vue";
import {Icon} from "@iconify/vue";
import LanguageSelect from '@/components/language-select/index.vue'
import AppInstallButton from '@/components/app-install-button/index.vue'
import {useI18n} from "vue-i18n";
import {useSettingStore} from "@/store/setting.js";
import {openCreateInbox, openDomains, openMailContent, openRecentMails} from "@/request/open.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {formatDetailDate, tzDayjs} from "@/utils/day.js";
import {intlLanguage, normalizeLanguage} from '@/i18n/languages.js'
import {formatMailboxCount} from '@/i18n/plurals.js'
import {mailArchive, MAX_ARCHIVE_FILE_BYTES} from '@/local-mail/archive.js'
import {isRejectedPublicAddress, publicLookupErrorKey} from './public-lookup.js'

defineOptions({
  name: 'find'
})

const REFRESH_SEC = 30
const ERROR_REFRESH_SEC = 300
const ADDR_KEY = 'findAddress'
const SAVE_BINARY_FILES = true
const LOCAL_PAGE_SIZE = 100
const ONLINE_PAGE_SIZE = 20
const archive = mailArchive()
const {t, locale} = useI18n()
const settingStore = useSettingStore()
const publicLang = computed(() => locale.value)
const loginHref = computed(() => {
  const target = new URL('/login', window.location.href)
  if (window.location.hostname.startsWith('temp.')) {
    target.hostname = window.location.hostname.replace(/^temp\./, 'box.')
  }
  const manualLanguage = normalizeLanguage(settingStore.publicMailboxLanguage)
  if (manualLanguage) target.searchParams.set('lang', manualLanguage)
  return target.toString()
})

const address = ref('')
const manual = ref('')
const creating = ref(false)
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const liveMails = ref([])
const archivedMails = ref([])
const mails = computed(() => {
  const combined = new Map(archivedMails.value.map(mail => [Number(mail.emailId), {...mail, localOnly: true}]))
  if (isOnline.value) {
    for (const mail of liveMails.value) {
      combined.set(Number(mail.emailId), {...combined.get(Number(mail.emailId)), ...mail, localOnly: false})
    }
  }
  return [...combined.values()].sort((a, b) =>
    String(b.createTime || '').localeCompare(String(a.createTime || '')) || Number(b.emailId) - Number(a.emailId))
})
const history = ref([])
const hasMoreLocal = ref(false)
const hasMoreOnline = ref(false)
const loadingOlder = ref(false)
const archiveUnavailable = ref(false)
const archiveWarning = ref('')
const showClearConfirm = ref(false)
const clearing = ref(false)
const loading = ref(false)
const searched = ref(false)
const inboxError = ref('')
const connectionNotice = computed(() => !isOnline.value
  ? 'temporaryInbox.offlineHistoryOnly'
  : inboxError.value)
const emptyStateText = computed(() => {
  if (!address.value) return 'temporaryInbox.createAddress'
  if (!isOnline.value) return 'temporaryInbox.savedCount'
  if (inboxError.value) return inboxError.value
  return searched.value ? 'temporaryInbox.noRecentMail' : 'temporaryInbox.waitingForMail'
})
const copied = ref(false)
const countdown = ref(REFRESH_SEC)
const domains = ref([])

const viewing = ref(null)
const viewLoading = ref(false)
const viewError = ref(false)
const viewDialog = ref(null)
const viewCloseButton = ref(null)
const showPreview = ref(false)
const srcList = ref([])

let timer = null
let copyTimer = null
let inboxRequestId = 0
let viewRequestId = 0
let previewRequestId = 0
const previewUrls = new Set()
const captureRuns = new Map()
const archiveChannel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('temporary-mail-archive')
let archiveSession = 0
let archiveClearRevision = null
let localRequestId = 0
let lastHistorySync = Date.now()
let nextOnlineLookupAt = 0
let disposed = false
let returnFocusElement = null
let previewReturnFocusElement = null

// 邮件 HTML 在受限 iframe 内渲染，不允许脚本和同源访问。
const viewHtml = computed(() => {
  if (!viewing.value) return ''
  const content = typeof viewing.value.content === 'string' ? viewing.value.content : ''
  const htmlContent = !viewError.value && content
    ? content.replace(/\{\{domain\}\}(attachments\/[A-Za-z0-9._-]+)/g,
      (_, key) => viewing.value.inlineMedia?.[key] || '')
      .replace(/\{\{domain\}\}/g, '')
    : ''
  const raw = htmlContent
      || `<pre dir="auto" style="white-space:pre-wrap;font:inherit">${escapeHtml(viewError.value ? t('temporaryInbox.mailExpired') : viewing.value.text || t('temporaryInbox.emptyMail'))}</pre>`
  return `<!doctype html><meta charset="utf-8">`
      + `<meta http-equiv="Content-Security-Policy" content="${mailFramePolicy(window.location.origin)}">`
      + `<meta name="referrer" content="no-referrer">`
      + `<base target="_blank">`
      + `<style>body{margin:0;padding:18px;background:#fff;color:#1a1a1a;`
      + `font:14px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;`
      + `word-break:break-word}`
      + `img{max-width:100%;height:auto}a{color:#2563eb}`
      + `table{max-width:100%}</style>`
      + raw
})

// sandbox 里不能跑脚本，iframe 拿不到内容高度，只能按正文长度粗估一下。
// 好处是验证码邮件（通常很短）不会撑出一大片空白。
const frameHeight = computed(() => {
  const len = (viewing.value?.content || viewing.value?.text || '').length
  if (len < 800) return '260px'
  if (len < 4000) return '420px'
  return '62vh'
})

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
      ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))
}

function formatRecipients(mail) {
  try {
    const recipient = JSON.parse(mail.recipient || '[]')
    if (Array.isArray(recipient)) {
      const addresses = recipient.map(item => item?.address).filter(Boolean)
      if (addresses.length) return addresses.join(', ')
    }
  } catch { /* 旧邮件可能没有标准收件人结构 */ }
  return mail.toEmail || address.value
}

function statusMessage(message) {
  if (!message) return ''
  try { return JSON.parse(message).message || '' } catch { return String(message) }
}

function attachmentUrlFor(emailId, mailbox, att, download = false) {
  const params = new URLSearchParams({
    emailId: String(emailId),
    address: mailbox,
    attId: String(att.attId)
  })
  if (download) params.set('download', '1')
  return `${import.meta.env.VITE_BASE_URL.replace(/\/$/, '')}/open/attachment?${params}`
}

class AttachmentUnavailableError extends Error {}

async function attachmentBlob(att) {
  const capturedAt = Date.now()
  const session = archiveSession
  const clearRevision = archiveClearRevision
  const mailbox = address.value
  const emailId = viewing.value?.emailId
  if (!mailbox || !emailId) throw new Error('No open message')
  const key = archive.mailKey(mailbox, emailId)
  if (!archiveUnavailable.value) {
    try {
      const saved = await archive.getBinary(key, 'attachment', att.attId)
      if (saved) return saved
    } catch { archiveUnavailable.value = true }
  }
  const response = await fetch(attachmentUrlFor(emailId, mailbox, att), {
    cache: 'no-store'
  })
  if (response.status === 404 || response.status === 410) throw new AttachmentUnavailableError()
  if (!response.ok) throw new Error(`Attachment request failed: ${response.status}`)
  const blob = await response.blob()
  if (SAVE_BINARY_FILES && !archiveUnavailable.value && session === archiveSession) {
    archive.saveBinary(key, 'attachment', att.attId, blob,
      {capturedAt, expectedClear: clearRevision}).then(result => {
      if (session === archiveSession && !result.saved && result.reason !== 'cleared') archiveWarning.value = 'temporaryInbox.storageLimit'
    }).catch(() => {
      if (session === archiveSession) archiveWarning.value = 'temporaryInbox.storageUnavailable'
    })
  }
  return blob
}

async function downloadAttachment(att) {
  try {
    const blob = await attachmentBlob(att)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = att.filename || 'attachment'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  } catch (error) {
    flash(t(error instanceof AttachmentUnavailableError
      ? 'temporaryInbox.attachmentUnavailable' : 'reqFailErrorMsg'))
  }
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'jfif'].includes(getExtName(filename))
}

function closePreview() {
  const wasOpen = showPreview.value
  const previewOpener = previewReturnFocusElement
  previewReturnFocusElement = null
  previewRequestId += 1
  showPreview.value = false
  srcList.value = []
  for (const url of previewUrls) URL.revokeObjectURL(url)
  previewUrls.clear()
  if (wasOpen && viewing.value) {
    void nextTick(() => {
      if (!viewing.value) return
      if (previewOpener?.isConnected) previewOpener.focus()
      else viewCloseButton.value?.focus()
    })
  }
}

async function showImage(att) {
  if (!isImage(att.filename)) return
  closePreview()
  previewReturnFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const requestId = previewRequestId
  try {
    const blob = await attachmentBlob(att)
    if (requestId !== previewRequestId || !viewing.value) return
    const url = URL.createObjectURL(blob)
    previewUrls.add(url)
    srcList.value = [url]
    showPreview.value = true
  } catch (error) {
    flash(t(error instanceof AttachmentUnavailableError
      ? 'temporaryInbox.imageUnavailable' : 'reqFailErrorMsg'))
  }
}

async function cachedFullMail(mailbox, emailId) {
  if (archiveUnavailable.value) return null
  const saved = await archive.getMessage(mailbox, emailId)
  if (!saved?.complete) return null
  const inlineMedia = {}
  try {
    for (const item of await archive.getInlineBinaries(archive.mailKey(mailbox, emailId))) {
      inlineMedia[item.id] = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(item.blob)
      })
    }
  } catch {
    return {...saved, inlineMedia: {}}
  }
  return {...saved, inlineMedia}
}

async function cacheMedia(full, mailbox, capturedAt, session = archiveSession,
                          clearRevision = archiveClearRevision) {
  if (!SAVE_BINARY_FILES || archiveUnavailable.value) return
  const key = archive.mailKey(mailbox, full.emailId)
  for (const [mediaKey, source] of Object.entries(full.inlineMedia || {})) {
    if (session !== archiveSession) return
    await cacheOneBinary(key, 'inline', mediaKey, source, capturedAt, session, clearRevision)
  }
  if (session === archiveSession) void refreshViewedInline(mailbox, full.emailId, session)
  for (const att of full.attList || []) {
    if (session !== archiveSession) return
    await cacheOneBinary(key, 'attachment', att.attId,
      attachmentUrlFor(full.emailId, mailbox, att), capturedAt, session, clearRevision, Number(att.size))
  }
}

async function refreshViewedInline(mailbox, emailId, session) {
  if (address.value !== mailbox || viewing.value?.emailId !== emailId || !viewing.value.complete) return
  const requestId = viewRequestId
  let saved
  try { saved = await cachedFullMail(mailbox, emailId) } catch { return }
  if (!saved) return
  if (session !== archiveSession || requestId !== viewRequestId || address.value !== mailbox) return
  viewing.value = saved
}

async function cacheOneBinary(key, kind, id, source, capturedAt, session, clearRevision, knownSize) {
  if (knownSize > MAX_ARCHIVE_FILE_BYTES) {
    if (session === archiveSession) archiveWarning.value = 'temporaryInbox.storageLimit'
    return
  }
  try {
    if (await archive.getBinary(key, kind, id)) return
  } catch {
    if (session === archiveSession) archiveWarning.value = 'temporaryInbox.storageUnavailable'
    return
  }
  let blob
  try {
    const response = await fetch(source, {cache: 'no-store'})
    if (!response.ok) return
    const length = Number(response.headers.get('content-length'))
    if (length > MAX_ARCHIVE_FILE_BYTES) {
      if (session === archiveSession) archiveWarning.value = 'temporaryInbox.storageLimit'
      return
    }
    blob = await response.blob()
  } catch { return }
  if (session !== archiveSession) return
  if (blob.size > MAX_ARCHIVE_FILE_BYTES) {
    archiveWarning.value = 'temporaryInbox.storageLimit'
    return
  }
  try {
    const result = await archive.saveBinary(key, kind, id, blob,
      {capturedAt, expectedClear: clearRevision})
    if (session === archiveSession && !result.saved && result.reason !== 'cleared') archiveWarning.value = 'temporaryInbox.storageLimit'
  } catch {
    if (session === archiveSession) archiveWarning.value = 'temporaryInbox.storageUnavailable'
  }
}

async function openMail(m, event) {
  let savedFull = null
  const requestId = ++viewRequestId
  const requestedAddress = address.value
  const capturedAt = Date.now()
  const session = archiveSession
  const clearRevision = archiveClearRevision
  returnFocusElement = event?.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : document.activeElement instanceof HTMLElement ? document.activeElement : null
  closePreview()
  viewing.value = m
  viewLoading.value = true
  viewError.value = false
  void nextTick(() => {
    if (requestId === viewRequestId && viewing.value?.emailId === m.emailId) {
      viewCloseButton.value?.focus()
    }
  })
  try {
    const saved = await cachedFullMail(requestedAddress, m.emailId)
    if (saved) {
      if (requestId === viewRequestId && address.value === requestedAddress) {
        savedFull = saved
        viewing.value = saved
        viewLoading.value = false
        if (isOnline.value && !m.localOnly && saved.attList?.length) {
          void cacheMedia(saved, requestedAddress, capturedAt, session, clearRevision)
        }
        if (!isOnline.value || m.localOnly || !needsInlineRecovery(saved.content, saved.inlineMedia)) return
      }
    }
  } catch { archiveUnavailable.value = true }
  if (requestId !== viewRequestId || address.value !== requestedAddress) return
  if (!isOnline.value) {
    viewLoading.value = false
    return
  }
  let full
  try {
    full = await openMailContent(m.emailId, requestedAddress)
    if (savedFull) full.inlineMedia = {...full.inlineMedia, ...savedFull.inlineMedia}
  } catch {
    if (requestId === viewRequestId && viewing.value?.emailId === m.emailId) {
      viewError.value = !savedFull
    }
  } finally {
    if (requestId === viewRequestId) viewLoading.value = false
  }
  if (!full) return
  if (requestId === viewRequestId && viewing.value?.emailId === m.emailId && address.value === requestedAddress) {
    viewing.value = full
  }
  if (!archiveUnavailable.value && session === archiveSession) {
    try {
      await archive.saveMessage(requestedAddress, full,
        {full: true, capturedAt, expectedClear: clearRevision})
      void cacheMedia(full, requestedAddress, capturedAt, session, clearRevision)
      void refreshLocalMessages()
      void refreshHistory()
      archiveChannel?.postMessage({type: 'updated'})
    } catch { archiveWarning.value = 'temporaryInbox.storageUnavailable' }
  }
}

function closeMail() {
  const wasOpen = Boolean(viewing.value)
  const opener = returnFocusElement
  returnFocusElement = null
  viewRequestId += 1
  closePreview()
  viewing.value = null
  viewError.value = false
  if (wasOpen) {
    void nextTick(() => {
      if (viewing.value) return
      if (opener?.isConnected) opener.focus()
      else document.querySelector('.tm-manual input')?.focus()
    })
  }
}

function onDialogKeydown(event) {
  if (event.key !== 'Tab' || showPreview.value || !viewDialog.value) return
  const focusable = [...viewDialog.value.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
  )].filter(element => element.getClientRects().length > 0)
  if (!focusable.length) {
    event.preventDefault()
    viewDialog.value.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === viewDialog.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function onDocumentFocusIn(event) {
  if (!viewing.value || showPreview.value || showClearConfirm.value || viewDialog.value?.contains(event.target)) return
  viewCloseButton.value?.focus()
}

function onEsc(e) {
  if (e.key !== 'Escape') return
  if (showPreview.value) {
    e.preventDefault()
    e.stopImmediatePropagation()
    closePreview()
  } else if (viewing.value) {
    e.preventDefault()
    closeMail()
  }
}

function onConnectionLost() {
  isOnline.value = false
  inboxRequestId += 1
  loading.value = false
  countdown.value = REFRESH_SEC
  void refreshLocalMessages()
}

function onConnectionRestored() {
  isOnline.value = true
  nextOnlineLookupAt = 0
  countdown.value = REFRESH_SEC
  void load()
}

onMounted(async () => {
  isOnline.value = navigator.onLine
  window.addEventListener('keydown', onEsc, true)
  window.addEventListener('online', onConnectionRestored)
  window.addEventListener('offline', onConnectionLost)
  document.addEventListener('focusin', onDocumentFocusIn)
  document.addEventListener('visibilitychange', onVisible)
  archiveChannel?.addEventListener('message', onArchiveMessage)
  timer = setInterval(() => {
    if (isOnline.value && !document.hidden) {
      countdown.value -= 1
      if (countdown.value <= 0) {
        countdown.value = Math.max(1, Math.ceil((nextOnlineLookupAt - Date.now()) / 1000))
        if (Date.now() >= nextOnlineLookupAt) void load()
      }
    }
    if (!document.hidden && Date.now() - lastHistorySync >= 60 * 60 * 1000) void onVisible()
  }, 1000)

  const domainRequest = openDomains().then(result => { domains.value = result || [] })
    .catch(() => { /* 历史记录仍可离线查看 */ })
  try {
    const session = await archive.startSession()
    if (disposed) return
    archiveClearRevision = session.clearRevision
    history.value = session.addresses
    navigator.storage?.persist?.().catch(() => {})
  } catch {
    archiveUnavailable.value = true
  }
  if (disposed) return

  let saved = null
  try {
    saved = localStorage.getItem(ADDR_KEY)
    if (!saved) saved = JSON.parse(localStorage.getItem('findInbox') || 'null')?.address
  } catch { /* 隐私模式读不到 */ }

  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)
  const sharedAddress = fragment.get('address') || query.get('address')
  if (sharedAddress) {
    saved = sharedAddress
    query.delete('address')
    const remainingQuery = query.toString()
    window.history.replaceState({}, '', window.location.pathname + (remainingQuery ? `?${remainingQuery}` : ''))
  }

  const normalized = String(saved || '').trim().toLowerCase()
  if (normalized && history.value.some(item => item.address === normalized)) {
    await selectAddress(normalized)
    return
  }
  await domainRequest
  if (disposed) return
  if (normalized && domains.value.some(domain => normalized.endsWith('@' + domain.toLowerCase()))) {
    if (sharedAddress) {
      try { await openRecentMails(normalized) }
      catch (error) { if (isRejectedPublicAddress(error)) saved = null }
    }
    if (saved) {
      await selectAddress(normalized)
      return
    }
  }
  if (history.value.length) await selectAddress(history.value[0].address)
})

onUnmounted(() => {
  disposed = true
  if (timer) clearInterval(timer)
  if (copyTimer) clearTimeout(copyTimer)
  window.removeEventListener('keydown', onEsc, true)
  window.removeEventListener('online', onConnectionRestored)
  window.removeEventListener('offline', onConnectionLost)
  document.removeEventListener('focusin', onDocumentFocusIn)
  document.removeEventListener('visibilitychange', onVisible)
  archiveChannel?.removeEventListener('message', onArchiveMessage)
  archiveChannel?.close()
  closePreview()
})

async function onVisible() {
  if (document.hidden) return
  if (isOnline.value && address.value) {
    countdown.value = Math.max(1, Math.ceil((nextOnlineLookupAt - Date.now()) / 1000))
    if (Date.now() >= nextOnlineLookupAt) void load()
  }
  if (archiveUnavailable.value) return
  lastHistorySync = Date.now()
  try {
    const session = await archive.startSession()
    const previousRevision = archiveClearRevision
    archiveClearRevision = session.clearRevision
    if (previousRevision !== null && previousRevision !== session.clearRevision) {
      archiveSession += 1
      resetLocalState()
      archiveWarning.value = 'temporaryInbox.localCleared'
    } else {
      history.value = session.addresses
    }
  } catch { archiveUnavailable.value = true }
}

function onArchiveMessage(event) {
  if (event.data?.type === 'cleared') {
    archiveSession += 1
    archiveClearRevision = null
    resetLocalState()
    archiveWarning.value = 'temporaryInbox.localCleared'
    void onVisible()
  } else if (event.data?.type === 'updated') {
    void refreshHistory()
    void refreshLocalMessages()
  }
}

function removeSavedInbox() {
  try {
    localStorage.removeItem(ADDR_KEY)
    localStorage.removeItem('findInbox')
    return true
  } catch { return false }
}

function saveInbox() {
  try {
    localStorage.setItem(ADDR_KEY, address.value)
    localStorage.removeItem('findInbox')
  } catch { /* 存不下就算了 */ }
}

async function refreshHistory() {
  if (archiveUnavailable.value) return
  const session = archiveSession
  try {
    const addresses = await archive.listAddresses()
    if (session === archiveSession) history.value = addresses
  }
  catch { archiveUnavailable.value = true }
}

async function refreshLocalMessages() {
  if (archiveUnavailable.value || !address.value) return
  const requestedAddress = address.value
  const requestId = ++localRequestId
  const session = archiveSession
  try {
    const limit = Math.max(LOCAL_PAGE_SIZE, archivedMails.value.length)
    const [rows, count] = await Promise.all([
      archive.listMessages(requestedAddress, {limit}),
      archive.countMessages(requestedAddress),
    ])
    if (requestId === localRequestId && session === archiveSession && address.value === requestedAddress) {
      archivedMails.value = rows
      hasMoreLocal.value = count > rows.length
    }
  } catch { archiveUnavailable.value = true }
}

async function loadMoreLocal() {
  if (archiveUnavailable.value || !address.value) return
  const requestedAddress = address.value
  const offset = archivedMails.value.length
  const requestId = ++localRequestId
  const session = archiveSession
  try {
    const rows = await archive.listMessages(requestedAddress, {offset, limit: LOCAL_PAGE_SIZE})
    if (requestId !== localRequestId || session !== archiveSession || requestedAddress !== address.value) return
    archivedMails.value = [...archivedMails.value, ...rows]
    const count = await archive.countMessages(requestedAddress)
    if (requestId === localRequestId && session === archiveSession && requestedAddress === address.value) {
      hasMoreLocal.value = count > archivedMails.value.length
    }
  } catch { archiveUnavailable.value = true }
}

async function loadMoreOnline() {
  if (!hasMoreOnline.value || !isOnline.value || loadingOlder.value || !address.value) return
  const requestedAddress = address.value
  const session = archiveSession
  const before = Math.min(...liveMails.value.map(mail => Number(mail.emailId)))
  if (!Number.isSafeInteger(before) || before <= 0) return
  loadingOlder.value = true
  try {
    const rows = await openRecentMails(requestedAddress, before)
    if (disposed || session !== archiveSession || address.value !== requestedAddress) return
    const combined = new Map(liveMails.value.map(mail => [Number(mail.emailId), mail]))
    for (const row of rows || []) combined.set(Number(row.emailId), row)
    liveMails.value = [...combined.values()]
    hasMoreOnline.value = (rows || []).length === ONLINE_PAGE_SIZE
    void captureRecent(rows || [], requestedAddress, {queue: true})
  } catch {
    flash(t('reqFailErrorMsg'))
  } finally {
    loadingOlder.value = false
  }
}

async function loadMoreMails() {
  if (hasMoreOnline.value) await loadMoreOnline()
  if (hasMoreLocal.value) await loadMoreLocal()
}

async function selectAddress(next) {
  if (disposed) return
  const session = archiveSession
  const capturedAt = Date.now()
  const clearRevision = archiveClearRevision
  address.value = next.toLowerCase()
  saveInbox()
  resetInbox()
  if (!archiveUnavailable.value) {
    try {
      const saved = await archive.recordAddress(address.value, capturedAt,
        {capturedAt, expectedClear: clearRevision})
      if (!saved || session !== archiveSession) return
      await refreshHistory()
      archiveChannel?.postMessage({type: 'updated'})
    } catch { archiveUnavailable.value = true }
  }
}

async function switchAddress(next) {
  if (next === address.value) return
  await selectAddress(next)
}

async function genAddr() {
  if (creating.value) return
  creating.value = true
  try {
    const inbox = await openCreateInbox()
    if (disposed) return
    await selectAddress(inbox.address)
  } catch {
    flash(t('temporaryInbox.createFailed'))
  } finally {
    creating.value = false
  }
}

function resetInbox() {
  closeMail()
  inboxRequestId += 1
  loading.value = false
  localRequestId += 1
  liveMails.value = []
  archivedMails.value = []
  hasMoreLocal.value = false
  hasMoreOnline.value = false
  loadingOlder.value = false
  searched.value = false
  inboxError.value = ''
  nextOnlineLookupAt = 0
  countdown.value = REFRESH_SEC
  void refreshLocalMessages()
  void load()
}

async function load() {
  if (disposed || !address.value || loading.value || !isOnline.value || Date.now() < nextOnlineLookupAt) return
  const requestId = ++inboxRequestId
  const requestedAddress = address.value
  loading.value = true
  nextOnlineLookupAt = Date.now() + REFRESH_SEC * 1000
  try {
    const result = await openRecentMails(requestedAddress)
    if (!disposed && requestId === inboxRequestId && address.value === requestedAddress) {
      const previouslyLoaded = liveMails.value.length
      const combined = new Map(liveMails.value.map(mail => [Number(mail.emailId), mail]))
      for (const row of result || []) combined.set(Number(row.emailId), row)
      liveMails.value = [...combined.values()]
      if (previouslyLoaded <= ONLINE_PAGE_SIZE) hasMoreOnline.value = (result || []).length === ONLINE_PAGE_SIZE
      searched.value = true
      inboxError.value = ''
      nextOnlineLookupAt = Date.now() + REFRESH_SEC * 1000
      countdown.value = REFRESH_SEC
      void captureRecent(result || [], requestedAddress)
    }
  } catch (error) {
    if (!disposed && requestId === inboxRequestId && address.value === requestedAddress) {
      const rejected = isRejectedPublicAddress(error)
      inboxError.value = publicLookupErrorKey(error)
      nextOnlineLookupAt = rejected ? Number.POSITIVE_INFINITY : Date.now() + ERROR_REFRESH_SEC * 1000
      countdown.value = rejected ? 0 : ERROR_REFRESH_SEC
    }
  } finally {
    if (requestId === inboxRequestId) loading.value = false
  }
}

function retryLoad() {
  nextOnlineLookupAt = 0
  countdown.value = REFRESH_SEC
  void load()
}

function captureRecent(recent, mailbox, {queue = false} = {}) {
  if (archiveUnavailable.value || !recent.length) return
  const previous = captureRuns.get(mailbox)
  if (previous && !queue) return previous
  const run = (previous
    ? previous.catch(() => {}).then(() => captureRecentBatch(recent, mailbox))
    : captureRecentBatch(recent, mailbox)).finally(() => {
    if (captureRuns.get(mailbox) === run) captureRuns.delete(mailbox)
  })
  captureRuns.set(mailbox, run)
  return run
}

async function captureRecentBatch(recent, mailbox) {
  const capturedAt = Date.now()
  const session = archiveSession
  const clearRevision = archiveClearRevision
  try {
    for (const mail of recent) {
      if (disposed || session !== archiveSession) return
      if (!await archive.saveMessage(mailbox, mail,
        {capturedAt, expectedClear: clearRevision})) return
    }
    if (address.value === mailbox) {
      await refreshHistory()
      await refreshLocalMessages()
    }
    const pending = []
    for (const mail of recent) {
      if (disposed || session !== archiveSession) return
      const saved = await archive.getMessage(mailbox, mail.emailId)
      if (!saved?.complete) {
        pending.push(mail)
      } else if (saved.attList?.length) {
        // 正文已保存不代表附件已保存；网络中断后仍需在有效期内补齐文件。
        void cacheMedia(saved, mailbox, capturedAt, session, clearRevision)
      }
    }
    for (let index = 0; index < pending.length; index += 2) {
      if (disposed || session !== archiveSession) return
      const jobs = pending.slice(index, index + 2).map(mail => {
        return (async () => {
          const full = await openMailContent(mail.emailId, mailbox)
          if (disposed || session !== archiveSession) return
          const saved = await archive.saveMessage(mailbox, full,
            {full: true, capturedAt, expectedClear: clearRevision})
          if (saved) void cacheMedia(full, mailbox, capturedAt, session, clearRevision)
        })().catch(() => { /* 过期或网络中断时下次刷新再试 */ })
      })
      await Promise.all(jobs)
    }
    if (!disposed && session === archiveSession) {
      await refreshHistory()
      if (address.value === mailbox) await refreshLocalMessages()
      archiveChannel?.postMessage({type: 'updated'})
    }
  } catch { archiveWarning.value = 'temporaryInbox.storageUnavailable' }
}

async function useManual() {
  const addr = manual.value.trim().toLowerCase()
  if (!addr) return
  if (history.value.some(item => item.address === addr)) {
    await selectAddress(addr)
    manual.value = ''
    return
  }
  if (!isOnline.value) {
    flash(t('temporaryInbox.offlineHistoryOnly'))
    return
  }
  if (!domains.value.length) {
    try { domains.value = await openDomains() || [] } catch { /* 查询错误在下面处理 */ }
  }
  if (!domains.value.some(d => addr.endsWith('@' + d))) {
    flash(t('temporaryInbox.ownDomainOnly'))
    return
  }
  try {
    await openRecentMails(addr)
  } catch (error) {
    flash(t(publicLookupErrorKey(error)))
    return
  }
  await selectAddress(addr)
  manual.value = ''
}

function resetLocalState() {
  closeMail()
  inboxRequestId += 1
  localRequestId += 1
  address.value = ''
  manual.value = ''
  loading.value = false
  liveMails.value = []
  archivedMails.value = []
  history.value = []
  hasMoreLocal.value = false
  hasMoreOnline.value = false
  searched.value = false
  inboxError.value = ''
  countdown.value = REFRESH_SEC
  return removeSavedInbox()
}

async function clearLocalHistory() {
  if (clearing.value) return
  clearing.value = true
  archiveSession += 1
  try {
    archiveClearRevision = await archive.clear()
    const selectionCleared = resetLocalState()
    showClearConfirm.value = false
    archiveWarning.value = selectionCleared ? 'temporaryInbox.localCleared' : 'temporaryInbox.clearFailed'
    archiveChannel?.postMessage({type: 'cleared'})
  } catch {
    // Always remove the selected address from memory and localStorage. A failed
    // archive clear is reported separately because browser copies may remain.
    resetLocalState()
    showClearConfirm.value = false
    archiveWarning.value = 'temporaryInbox.clearFailed'
  }
  finally { clearing.value = false }
}

async function copyAddr() {
  if (!address.value) return
  await copy(address.value)
}

async function copyAccessLink() {
  if (!address.value) return
  const fragment = new URLSearchParams({address: address.value})
  await copy(`${window.location.origin}/find#${fragment}`)
}

async function copyCode(code) {
  await copy(code)
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1600)
  } catch {
    flash(t('temporaryInbox.copyFailed'))
  }
}

function flash(msg) {
  // 这页面是给陌生人用的，不引 Element 的全局弹窗，原生提示够了
  alert(msg)
}

function fmt(value) {
  if (!value) return ''
  const date = tzDayjs(value).toDate()
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const today = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  return new Intl.DateTimeFormat(intlLanguage(publicLang.value), {
    ...(today ? {} : {
      month: 'short', day: 'numeric',
      ...(date.getFullYear() === now.getFullYear() ? {} : {year: 'numeric'}),
    }),
    hour: 'numeric', minute: '2-digit',
  }).format(date)
}

function mailPreview(mail) {
  return String(mail.text || '').replace(/\s+/g, ' ').trim().slice(0, 160)
}
</script>

<style scoped>
.tm {
  --bg: var(--ui-bg, #f5f7fb);
  --card: var(--ui-surface, #ffffff);
  --card-2: var(--ui-surface-alt, #edf2f8);
  --line: var(--ui-line, #d3dce6);
  --ink: var(--ui-ink, #172432);
  --ink-2: var(--ui-muted, #526174);
  --ink-3: var(--ui-muted, #526174);
  --accent: var(--ui-primary, #175cd3);
  --focus: var(--ui-focus, #175cd3);
  --good: var(--ui-success, #187a5d);
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  min-height: 100dvh;
  padding: 0 24px 52px;
  color: var(--ink);
  background: var(--bg);
  font-feature-settings: "tnum";
}
.tm-shell { max-width: 1160px; margin: 0 auto; }
.tm-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; min-height: 78px; }
.tm-brand { display: inline-flex; align-items: center; gap: 11px; font-size: 18px; font-weight: 750; letter-spacing: -.035em; }
.tm-mark { display: inline-grid; place-items: center; flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; color: #fff; background: var(--accent); }
.tm-language { display: flex; align-items: center; gap: 8px; min-width: 0; --language-control-border: var(--line); --language-control-bg: var(--card); --language-control-text: var(--ink); }
.tm-nav-link { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 9px 13px; border: 1px solid var(--line); border-radius: 9px; color: var(--ink); background: var(--card); font-size: 13px; text-decoration: none; white-space: nowrap; }
.tm-nav-link:hover { border-color: var(--accent); color: var(--accent); }
.tm-intro { margin: 27px 0 26px; }
.tm-intro h1 { margin: 0 0 8px; font-size: clamp(26px, 3vw, 32px); line-height: 1.15; letter-spacing: -.045em; }
.tm-intro p { max-width: 650px; margin: 0; color: var(--ink-2); font-size: 15px; line-height: 1.55; }
.tm-grid { display: grid; grid-template-columns: minmax(300px, 370px) minmax(0, 1fr); align-items: start; gap: 20px; }
.tm-side, .tm-workspace { min-width: 0; }
.tm-card, .tm-manual, .tm-history, .tm-inbox { border: 1px solid var(--line); border-radius: 14px; background: var(--card); }
.tm-card { padding: 22px; }
.tm-card-label { margin: 0; color: var(--ink-2); font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.tm-addr { margin: 17px 0; min-height: 50px; }
.tm-address-copy { display: block; width: 100%; padding: 13px; border: 1px dashed var(--line); border-radius: 9px; color: var(--ink); background: var(--card-2); font: 700 18px/1.3 var(--mono); overflow-wrap: anywhere; text-align: start; cursor: pointer; }
.tm-address-copy:hover { border-color: var(--accent); }
.tm-addr-skeleton { display: block; width: 70%; height: 46px; border-radius: 8px; background: var(--card-2); animation: tm-shimmer 1.3s ease-in-out infinite alternate; }
.tm-no-address { display: block; padding-top: 8px; color: var(--ink); font-size: 20px; font-weight: 700; }
.tm-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.tm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 9px 14px; border: 1px solid var(--line); border-radius: 9px; background: var(--card); color: var(--ink); font-family: inherit; font-size: 13px; font-weight: 650; line-height: 1.3; text-align: center; cursor: pointer; }
.tm-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.tm-btn:disabled { opacity: .5; cursor: not-allowed; }
.tm-btn-primary { color: #fff; background: var(--accent); border-color: var(--accent); }
.tm-btn-primary:hover:not(:disabled) { color: #fff; filter: brightness(.93); }
.tm-access-note { margin: 16px 0 0; padding-top: 14px; border-top: 1px solid var(--line); color: var(--ink-2); font-size: 12px; line-height: 1.6; }
.tm-manual { display: grid; gap: 9px; margin-top: 16px; padding: 18px; }
.tm-manual label { color: var(--ink); font-size: 13px; font-weight: 700; }
.tm-manual-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.tm-manual input { min-width: 0; width: 100%; min-height: 44px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 8px; outline: none; background: var(--card); color: var(--ink); font: inherit; font-size: 13px; }
.tm-manual input::placeholder { color: var(--ink-2); }
.tm-manual input:focus-visible { border-color: var(--accent); }
.tm-history { margin-top: 16px; padding: 16px 18px; }
.tm-history h2 { margin: 0; color: var(--ink); font-size: 14px; font-weight: 700; }
.tm-history h2 span { margin-inline-start: 4px; color: var(--ink-2); font-weight: 500; }
.tm-history-note { margin: 10px 0 0; color: var(--ink-2); font-size: 12px; line-height: 1.55; }
.tm-history-list { display: grid; grid-template-columns: minmax(0, 1fr); max-height: 240px; overflow-y: auto; margin-top: 12px; }
.tm-history-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; min-height: 48px; width: 100%; padding: 10px 8px; border: 0; border-top: 1px solid var(--line); color: var(--ink); background: transparent; text-align: start; cursor: pointer; }
.tm-history-item:hover { color: var(--accent); background: var(--card-2); }
.tm-history-item.is-active { color: var(--accent); background: var(--card-2); font-weight: 700; }
.tm-history-item svg { flex: 0 0 auto; }
.tm-history-address { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 12px var(--mono); }
.tm-history-count { flex: 0 0 auto; max-width: 45%; overflow-wrap: anywhere; color: var(--ink-2); font-size: 11px; text-align: end; }
.tm-clear { display: inline-flex; min-height: 36px; align-items: center; padding: 7px 0; border: 0; background: transparent; color: var(--ui-danger, #b42332); font-size: 12px; font-weight: 650; cursor: pointer; }
.tm-clear:hover { text-decoration: underline; }
.tm-history-empty { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 16px; color: var(--ink-2); font-size: 12px; }
.tm-history-warning { margin: 10px 0 0; color: var(--ui-danger, #b42332); font-size: 12px; line-height: 1.5; }
.tm-inbox { min-height: 380px; overflow: hidden; }
.tm-inbox-head { display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px; padding: 19px 22px 15px; border-bottom: 1px solid var(--line); }
.tm-inbox-head h2 { margin: 0; font-size: 18px; line-height: 1.3; letter-spacing: -.02em; }
.tm-inbox-address { display: block; max-width: 100%; margin-top: 5px; overflow-wrap: anywhere; color: var(--ink-2); font: 12px/1.4 var(--mono); text-align: start; }
.tm-inbox-count { display: block; margin-top: 3px; color: var(--ink-2); font-size: 12px; }
.tm-timer { display: inline-flex; align-items: center; gap: 7px; min-height: 24px; color: var(--ink-2); font-size: 12px; font-variant-numeric: tabular-nums; }
.tm-pulse { display: inline-block; width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--good); }
.tm-pulse.is-busy { background: var(--accent); animation: tm-blink .8s ease-in-out infinite; }
.tm-connection { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: 14px 18px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 9px; background: var(--card-2); color: var(--ink); font-size: 13px; line-height: 1.5; }
.tm-connection svg { flex: 0 0 auto; color: var(--accent); }
.tm-connection span { flex: 1 1 200px; min-width: 0; }
.tm-connection.is-failed svg { color: var(--ui-danger, #b42332); }
.tm-connection .tm-btn { margin-inline-start: auto; }
.tm-mail { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; min-height: 102px; padding: 17px 22px; border-bottom: 1px solid var(--line); position: relative; }
.tm-mail:last-child { border-bottom: 0; }
.tm-mail:hover, .tm-mail:focus-within { background: var(--card-2); }
.tm-mail-open { position: absolute; inset: 0; z-index: 1; width: 100%; border: 0; background: transparent; cursor: pointer; }
.tm-mail-open:focus-visible { outline-offset: -3px; }
.tm-mail-main { min-width: 0; }
.tm-mail-from, .tm-mail-subject, .tm-mail-preview { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-mail-from { color: var(--ink); font-size: 14px; font-weight: 700; }
.tm-mail-subject { margin-top: 4px; color: var(--ink); font-size: 13px; font-weight: 600; }
.tm-mail-preview { margin-top: 3px; color: var(--ink-2); font-size: 12px; }
.tm-mail-local { margin-top: 5px; color: var(--good); font-size: 11px; }
.tm-mail-side { display: flex; align-items: flex-end; flex-direction: column; gap: 12px; }
.tm-mail-time { color: var(--ink-2); font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.tm-code { position: relative; z-index: 2; min-height: 44px; padding: 6px 10px; border: 1px solid var(--accent); border-radius: 8px; color: var(--accent); background: var(--card); font: 700 15px var(--mono); letter-spacing: .05em; cursor: pointer; }
.tm-code:hover { background: var(--card-2); }
.tm-empty { display: grid; justify-items: center; align-content: center; min-height: 290px; padding: 42px 22px; text-align: center; }
.tm-empty-icon { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 14px; border-radius: 12px; color: var(--accent); background: var(--card-2); }
.tm-empty strong { color: var(--ink); font-size: 15px; }
.tm-empty p { max-width: 360px; margin: 5px 0 0; color: var(--ink-2); font-size: 13px; }
.tm-load-more { display: flex; margin: 14px auto 0; }
.tm-foot { margin: 18px 0 0; color: var(--ink-2); font-size: 12px; line-height: 1.55; }
.tm-fade-enter-active { transition: opacity .18s ease, transform .18s ease; }
.tm-fade-enter-from { opacity: 0; transform: translateY(-5px); }
.tm :is(button, input, summary, a):focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
@keyframes tm-blink { 50% { opacity: .25; } }
@keyframes tm-shimmer { to { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .tm-pulse.is-busy, .tm-addr-skeleton, .tm-fade-enter-active { animation: none; transition: none; } }

/* ---------- 正文弹窗 ---------- */

.tm-modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgba(4, 7, 11, .78);
  backdrop-filter: blur(3px);
}

.tm-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  max-height: 88vh;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, .45);
}

.tm-view-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 16px;
}

.tm-view-meta {
  flex: 1;
  min-width: 0;
}

.tm-view-subject {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ink);
}

.tm-view-info {
  padding: 0 20px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  color: var(--ink-2);
}

.tm-view-info-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  overflow-wrap: anywhere;
}

.tm-view-info-label {
  flex-shrink: 0;
  min-width: 48px;
  font-weight: 600;
  color: var(--ink);
}

.tm-view-name {
  font-weight: 500;
}

.tm-view-addr,
.tm-view-date {
  color: var(--ink-3);
}

.tm-view-date {
  display: block;
  margin: 4px 0 0;
  margin-inline-start: 54px;
  font-variant-numeric: tabular-nums;
}

.tm-view-info :deep(.el-alert) {
  margin-top: 12px;
}

.tm-view-close {
  flex-shrink: 0;
  display: inline-flex;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--card-2);
  color: var(--ink-2);
  cursor: pointer;
  transition: color .15s, border-color .15s;
}

.tm-view-close:hover {
  color: var(--ink);
  border-color: var(--ink-3);
}

/* 验证码单独一条，不跟标题挤在一起 */
.tm-view-code {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 20px 4px;
  padding: 12px 14px;
  border: 1px solid rgba(59, 130, 246, .25);
  border-radius: 10px;
  background: rgba(59, 130, 246, .08);
}

.tm-view-code-label {
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.tm-view-code-hint {
  margin-inline-start: auto;
  font-size: 12px;
  color: var(--ink-3);
}

/* 白底正文浮在深色衬底上，像一张信纸，不是硬切一刀 */
.tm-view-stage {
  min-height: 0;
  padding: 16px 20px 20px;
  overflow: auto;
}

.tm-view-frame {
  display: block;
  width: 100%;
  border: none;
  border-radius: 10px;
  background: #fff;
}

.tm-view-loading {
  padding: 60px 18px;
  text-align: center;
  font-size: 13px;
  color: var(--ink-3);
}

.tm-attachments {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
}

.tm-attachments-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
}

.tm-attachments-title span:first-child {
  font-weight: 600;
}

.tm-attachments-title span:last-child {
  color: var(--ink-2);
}

.tm-attachment {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-top: 10px;
  padding: 7px;
  border-radius: 5px;
  background: var(--card-2);
  font-size: 13px;
}

.tm-attachment-file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 44px;
  color: inherit;
  text-align: start;
}

button.tm-attachment-file {
  cursor: pointer;
}

.tm-attachment-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tm-attachment-size {
  color: var(--ink-3);
  font-size: 12px;
}

.tm-attachment-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.tm-attachment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-inline-start: 4px;
}

.tm-attachment-actions button,
.tm-attachment-actions a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--card);
  color: var(--ink-2);
  cursor: pointer;
}

.tm-attachment-actions button:hover,
.tm-attachment-actions a:hover {
  color: var(--ink);
}

.tm-view-close { min-width: 44px; min-height: 44px; justify-content: center; align-items: center; }
.tm-view-code { flex-wrap: wrap; }

@media (max-width: 900px) {
  .tm-grid { grid-template-columns: minmax(0, 1fr); }
  .tm-side { display: contents; }
  .tm-card { order: 1; }
  .tm-manual { order: 2; margin-top: -4px; }
  .tm-history, .tm-history-empty { order: 3; margin-top: -4px; }
  .tm-history-warning { order: 4; margin-top: -14px; }
  .tm-workspace { order: 5; }
}

@media (max-width: 560px) {
  .tm { padding: 0 16px 36px; }
  .tm-head { padding: 13px 0; gap: 10px; }
  .tm-brand { width: 100%; font-size: 17px; }
  .tm-language { width: 100%; }
  .tm-language :deep(.language-picker) { flex: 1 1 auto; }
  .tm-intro { margin: 14px 0 18px; }
  .tm-intro h1 { font-size: 25px; }
  .tm-intro p { font-size: 13px; }
  .tm-grid { gap: 16px; }
  .tm-card { padding: 18px; }
  .tm-addr { min-height: 42px; margin: 12px 0 16px; }
  .tm-address-copy { font-size: 16px; }
  .tm-no-address { font-size: 18px; }
  .tm-manual { margin-top: 0; padding: 15px; }
  .tm-inbox { min-height: 290px; }
  .tm-inbox-head { padding: 17px 17px 13px; }
  .tm-mail { padding: 15px 17px; min-height: 98px; }
  .tm-mail-time { max-width: 82px; white-space: normal; text-align: end; line-height: 1.25; }
  .tm-code { max-width: 105px; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
  .tm-history, .tm-history-empty { margin-top: 0; }
  .tm-modal { padding: 0; }
  .tm-view { max-width: none; max-height: 100dvh; height: 100dvh; border: 0; border-radius: 0; }
  .tm-view-head { padding: 14px 16px; }
  .tm-view-info { padding: 0 16px 12px; }
  .tm-view-code { margin: 0 16px 4px; }
  .tm-view-stage { padding: 12px 16px 18px; }
  .tm-attachment { grid-template-columns: minmax(0, 1fr) auto; }
  .tm-attachment-actions { grid-column: 1 / -1; justify-content: flex-end; padding-inline-start: 0; }
}

@media (max-width: 350px) {
  .tm { padding-inline: 12px; }
  .tm-language { gap: 5px; }
  .tm-nav-link { padding-inline: 9px; }
  .tm-actions .tm-btn-primary { flex: 1 1 100%; }
  .tm-mail { gap: 7px; }
}
</style>
