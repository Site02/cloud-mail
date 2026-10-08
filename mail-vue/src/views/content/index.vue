<template>
  <div class="box">
    <div class="header-actions">
      <button type="button" class="icon-button" :aria-label="t('backToList')" :title="t('backToList')" @click="handleBack">
        <Icon icon="material-symbols-light:arrow-back-ios-new" width="20" height="20"/>
      </button>
      <button v-perm="'email:delete'" type="button" class="icon-button" :aria-label="t('delete')" :title="t('delete')" @click="handleDelete">
        <Icon icon="uiw:delete" width="16" height="16"/>
      </button>
      <button v-if="emailStore.contentData.showStar" type="button" class="icon-button star"
              :aria-label="t('star')" :aria-pressed="!!email.isStar" :title="t('star')" @click="changeStar">
        <Icon v-if="email.isStar" icon="fluent-color:star-16" width="20" height="20"/>
        <Icon v-else icon="solar:star-line-duotone" width="18" height="18"/>
      </button>
      <button v-if="emailStore.contentData.showReply" v-perm="'email:send'" type="button" class="icon-button"
              :disabled="preparingCompose" :aria-label="t('reply')" :title="t('reply')" @click="openReply">
        <Icon icon="la:reply" width="21" height="21"/>
      </button>
      <button v-if="emailStore.contentData.showReply" v-perm="'email:send'" type="button" class="icon-button"
              :disabled="preparingCompose" :aria-label="t('forward')" :title="t('forward')" @click="openForward">
        <Icon icon="iconoir:arrow-up-right" width="20" height="20"/>
      </button>
    </div>
    <div></div>
    <el-scrollbar class="scrollbar">
      <div class="container">
        <h1 ref="readerHeading" class="email-title" tabindex="-1">{{ email.subject || t('noSubject') }}</h1>
        <div class="content">
          <div class="email-info">
            <div>
              <div class="send"><span class="send-source">{{$t('from')}}</span>
                <div class="send-name">
                  <span class="send-name-title">{{ email.name }}</span>
                  <span dir="ltr">&lt;{{ email.sendEmail }}&gt;</span>
                </div>
              </div>
              <div class="receive"><span class="source">{{$t('recipient')}}</span><span class="receive-email" dir="ltr">{{ formateReceive(email.recipient) }}</span></div>
              <div class="date">
                <div>{{ formatDetailDate(email.createTime) }}</div>
              </div>
            </div>
            <el-alert v-if="email.status === 3" :closable="false" :title="toMessage(email.message)" class="email-msg" type="error" show-icon />
            <el-alert v-if="email.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
            <el-alert v-if="email.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />
          </div>
          <el-scrollbar class="htm-scrollbar" :class="!email.attList?.length ? 'bottom-distance' : ''">
            <div v-if="email.content && mediaState === 'error'" class="media-error" role="alert">
              <span>{{ t('imageReopen') }}</span>
              <button type="button" @click="loadInlineMedia">{{ t('pwa.retry') }}</button>
            </div>
            <iframe class="mail-frame" :title="t('emailText')" :srcdoc="frameHtml"
                    v-if="email.content && mediaState !== 'loading'"
                    sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"/>
            <pre v-else-if="!email.content" class="email-text" dir="auto">{{email.text}}</pre>
          </el-scrollbar>
          <div class="att" v-if="email.attList?.length > 0">
            <div class="att-title">
              <span>{{$t('attachments')}}</span>
              <span>{{$t('attCount',{total: email.attList.length})}}</span>
            </div>
            <div class="att-box">

              <div class="att-item" v-for="att in email.attList" :key="att.attId">
                <component :is="isImage(att.filename) ? 'button' : 'div'" class="att-icon"
                           :type="isImage(att.filename) ? 'button' : undefined"
                           :aria-label="isImage(att.filename) ? `${t('preview')}: ${att.filename}` : undefined"
                           @click="showImage(att)">
                  <Icon v-bind="getIconByName(att.filename)" />
                </component>
                <component :is="isImage(att.filename) ? 'button' : 'div'" class="att-name"
                           :type="isImage(att.filename) ? 'button' : undefined"
                           :aria-label="isImage(att.filename) ? `${t('preview')}: ${att.filename}` : undefined"
                           @click="showImage(att)">
                  {{ att.filename }}
                </component>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
                <div class="opt-icon att-icon">
                  <button v-if="isImage(att.filename)" type="button" :aria-label="`${t('preview')}: ${att.filename}`"
                          :title="t('preview')" @click="showImage(att)">
                    <Icon icon="hugeicons:view" width="22" height="22"/>
                  </button>
                  <button type="button" :aria-label="`${t('temporaryInbox.download')}: ${att.filename}`"
                          :title="t('temporaryInbox.download')" @click="downloadAttachment(att)">
                    <Icon icon="system-uicons:push-down" width="22" height="22"/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <el-image-viewer
        v-if="showPreview"
        :url-list="srcList"
        show-progress
        @close="() => closePreview()"
    />
  </div>
</template>
<script setup>
import {mailFramePolicy} from '@/utils/mail-frame-policy.js'
import {computed, reactive, ref, watch, onMounted, onUnmounted, nextTick} from "vue";
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailContentMedia, emailDelete, emailRead} from "@/request/email.js";
import {Icon} from "@iconify/vue";
import {useEmailStore} from "@/store/email.js";
import {useAccountStore} from "@/store/account.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes, fileToBase64} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {allEmailDelete, allEmailContentMedia} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
import {inlineMediaKeys, hasCompleteInlineMedia} from '@/utils/inline-media.js'
import {attachmentPath} from '@/utils/mail-recovery.js'
import {prepareComposeMail} from '@/utils/compose-media.js'

const uiStore = useUiStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const router = useRouter()
const readerHeading = ref(null)
const email = computed(() => emailStore.contentData.email || {
  emailId: 0,
  attList: [],
  content: '',
  text: '',
  recipient: '[]',
})
const showPreview = ref(false)
const srcList = reactive([])
const inlineMedia = ref({})
const mediaState = ref('loading')
const previewUrls = new Set()
let mediaRequestId = 0
let mediaLoadedAt = 0
let previewRequestId = 0

const inlineKeys = computed(() => inlineMediaKeys(email.value?.content))

async function loadInlineMedia() {
  const requestId = ++mediaRequestId
  inlineMedia.value = {}
  mediaState.value = 'loading'
  if (!inlineKeys.value.length) {
    mediaState.value = 'ready'
    return
  }
  if (!email.value?.emailId) {
    mediaState.value = 'error'
    return
  }
  try {
    const urls = await (emailStore.contentData.delType === 'physics'
      ? allEmailContentMedia(email.value.emailId)
      : emailContentMedia(email.value.emailId))
    if (requestId !== mediaRequestId) return
    if (!hasCompleteInlineMedia(inlineKeys.value, urls)) {
      mediaState.value = 'error'
      return
    }
    inlineMedia.value = urls
    mediaLoadedAt = Date.now()
    mediaState.value = 'ready'
  } catch {
    if (requestId === mediaRequestId) mediaState.value = 'error'
  }
}

watch(() => [email.value?.emailId, email.value?.content, emailStore.contentData.delType], loadInlineMedia, { immediate: true })

function refreshInlineMedia() {
  if (document.hidden || !inlineKeys.value.length) return
  if (mediaState.value === 'error' || (mediaState.value === 'ready' && Date.now() - mediaLoadedAt > 12 * 60 * 1000)) {
    loadInlineMedia()
  }
}

const frameHtml = computed(() => {
  const content = String(email.value?.content || '').replace(
      /\{\{domain\}\}(attachments\/[A-Za-z0-9._-]+)/g,
      (_, key) => inlineMedia.value[key] || ''
  ).replace(/\{\{domain\}\}/g, '')
  const origin = window.location.origin
  return `<!doctype html><meta charset="utf-8">`
      + `<meta http-equiv="Content-Security-Policy" content="${mailFramePolicy(origin)}">`
      + `<meta name="referrer" content="no-referrer"><base target="_blank">`
      + `<style>body{margin:0;padding:16px;background:#fff;color:#13181d;font:14px/1.5 sans-serif;word-break:break-word}`
      + `img{max-width:100%;height:auto}table{max-width:100%}</style>${content}`
})

const { t } = useI18n()
watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

let readRequesting = false

function tryMarkRead() {
  if (!emailStore.contentData.showUnread || readRequesting) return
  const current = email.value
  if (!current?.emailId || current.unread !== EmailUnreadEnum.UNREAD) return

  // 等详情数据就绪（detailMap 已写入，或正文已有内容）再标已读
  const full = emailStore.detailMap[current.emailId]
  const detailReady = !!full || !!(current.content || current.text)
  if (!detailReady) return

  readRequesting = true
  const emailId = current.emailId
  current.unread = EmailUnreadEnum.READ
  if (emailStore.detailMap[emailId]) {
    emailStore.detailMap[emailId].unread = EmailUnreadEnum.READ
  }
  emailStore.markListRead(emailId)
  emailRead([emailId]).finally(() => {
    readRequesting = false
  })
}

watch(
  () => [
    email.value?.emailId,
    email.value?.content,
    email.value?.text,
    emailStore.detailMap[email.value?.emailId]
  ],
  () => tryMarkRead(),
  { flush: 'post' }
)

onMounted(() => {
  if (!email.value?.emailId) {
    router.replace({name: 'email'})
    return
  }
  tryMarkRead()
  window.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('visibilitychange', refreshInlineMedia)
  nextTick(() => readerHeading.value?.focus())
})

onUnmounted(() => {
  emailStore.contentData.showUnread = false;
  readRequesting = false
  window.removeEventListener('keydown', handleKeyDown, true);
  document.removeEventListener('visibilitychange', refreshInlineMedia)
  ++mediaRequestId
  closePreview(false)
})

function handleKeyDown(event) {
  if (event.key !== 'Escape') return;
  if (showPreview.value) return;
  if (document.querySelector('.el-message-box')) return;
  const writeBox = document.querySelector('.write-box');
  if (writeBox && writeBox.offsetParent !== null) return;
  handleBack();
}

const preparingCompose = ref(false)
async function openCompose(forward) {
  if (preparingCompose.value) return
  preparingCompose.value = true
  const source = email.value
  const revision = emailStore.sessionRevision
  try {
    const urls = inlineMediaKeys(source.content).length ? await emailContentMedia(source.emailId) : {}
    const prepared = await prepareComposeMail(source, {
      inlineUrls: urls, forward,
      readInline: async url => {
        const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(12000)})
        if (!response.ok || !response.headers.get('Content-Type')?.startsWith('image/')) throw new Error('Unavailable image')
        return fileToBase64(await response.blob(), true)
      },
      readAttachment: async att => {
        const blob = await attachmentBlob(att)
        return {content:await fileToBase64(blob),size:blob.size}
      }
    })
    if (email.value !== source || emailStore.sessionRevision !== revision) return
    if (forward) uiStore.writerRef.openForward(prepared)
    else uiStore.writerRef.openReply(prepared)
  } catch {
    ElMessage({message:t('attachmentReopen'),type:'error',plain:true})
  } finally { preparingCompose.value = false }
}
function openReply() { return openCompose(false) }
function openForward() { return openCompose(true) }

function toMessage(message) {
  if (!message) return ''
  try { return JSON.parse(message).message || '' }
  catch { return String(message) }
}

function attachmentUrl(att) {
  const params = new URLSearchParams({emailId: String(email.value.emailId), attId: String(att.attId)})
  return `${import.meta.env.VITE_BASE_URL.replace(/\/$/, '')}${attachmentPath(emailStore.contentData.delType)}?${params}`
}

async function attachmentBlob(att) {
  const response = await fetch(attachmentUrl(att), {
    headers: {Authorization: localStorage.getItem('token') || ''},
    signal: AbortSignal.timeout(12000),
    cache: 'no-store'
  })
  if (!response.ok || response.headers.get('Content-Type')?.startsWith('application/json')) {
    throw new Error(t('attachmentReopen'))
  }
  return response.blob()
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
  } catch {
    ElMessage.error(t('attachmentReopen'))
  }
}

let previewOpener = null

function closePreview(restoreFocus = true) {
  ++previewRequestId
  showPreview.value = false
  srcList.length = 0
  for (const url of previewUrls) URL.revokeObjectURL(url)
  previewUrls.clear()
  const opener = previewOpener
  previewOpener = null
  if (restoreFocus && opener?.isConnected) {
    nextTick(() => {
      if (opener.isConnected) opener.focus()
    })
  }
}

async function showImage(att) {
  if (!isImage(att.filename)) return
  closePreview(false)
  const requestId = previewRequestId
  const emailId = email.value.emailId
  previewOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  try {
    const blob = await attachmentBlob(att)
    if (requestId !== previewRequestId || email.value.emailId !== emailId) return
    const url = URL.createObjectURL(blob)
    previewUrls.add(url)
    srcList.push(url)
    showPreview.value = true
  } catch {
    if (requestId === previewRequestId) ElMessage.error(t('imageReopen'))
  }
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif','jfif'].includes(getExtName(filename))
}

function formateReceive(recipient) {
  if (!recipient) return ''
  recipient = JSON.parse(recipient)
  return recipient.map(item => item.address).join(', ')
}

function changeStar() {
  if (email.value.isStar) {
    email.value.isStar = 0;
    starCancel(email.value.emailId).then(() => {
      email.value.isStar = 0;
      emailStore.cancelStarEmailId = email.value.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.value.emailId])
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 1;
    })
  } else {
    email.value.isStar = 1;
    starAdd(email.value.emailId).then(() => {
      email.value.isStar = 1;
      emailStore.addStarEmailId = email.value.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email.value)
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 0;
    })
  }
}

const handleBack = () => {
  if (window.history.state?.back) router.back()
  else router.push({name: 'email'})
}

const handleDelete = () => {
  ElMessageBox.confirm(t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic') {
      emailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    } else  {

      allEmailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    }

    router.back()
  })
}
</script>
<style scoped lang="scss">
.box {
  height: 100%;
  overflow: hidden;
}

.header-actions {
  padding: 9px 15px 8px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: var(--header-actions-border);
  font-size: 18px;
  .star {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 21px;
  }
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    min-height: 30px;
    color: inherit;
    cursor: pointer;
  }
}

.icon-button:focus-visible,
.att-item button:focus-visible,
.media-error button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

.media-error {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0;
  padding: 10px 12px;
  border: 1px solid var(--el-color-danger-light-7);
  border-radius: 6px;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);

  button {
    padding: 4px 8px;
    border: 1px solid currentColor;
    border-radius: 4px;
    color: inherit;
    cursor: pointer;
  }
}


.scrollbar {
  height: calc(100% - 38px);
  width: 100%;
}

.container {
  font-size: 14px;
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 10px;
  @media (max-width: 1023px) {
    padding-left: 15px;
    padding-right: 15px;
  }

  .email-title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .htm-scrollbar {
  }

  .content {
    display: flex;
    flex-direction: column;

    .att {
      margin-top: 30px;
      margin-bottom: 30px;
      border: 1px solid var(--light-border-color);
      padding: 14px;
      border-radius: 6px;
      width: fit-content;
      .att-box {
        min-width: min(410px,calc(100vw - 60px));
        max-width: 600px;
        display: grid;
        gap: 12px;
        grid-template-rows: 1fr;
      }

      .att-title {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        span:first-child {
          font-weight: bold;
        }
      }

      .att-item {
        cursor: default;
        div {
          align-self: center;
        }
        background: var(--light-ill);
        padding: 5px 7px;
        border-radius: 4px;
        align-self: start;
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        .att-icon {
          display: grid;
        }

        button {
          color: inherit;
          cursor: pointer;
        }

        .att-size {
          color: var(--secondary-text-color);
        }

        .att-name {
          margin-left: 8px;
          margin-right: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
          text-align: start;
        }

        .att-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .opt-icon {
          padding-left: 10px;
          color: var(--secondary-text-color);
          align-items: center;
          display: flex;
          gap: 8px;
          cursor: pointer;
          button {
            color: var(--secondary-text-color);
            align-items: center;
            display: flex;
          }
        }
      }
    }

    .email-info {

      border-bottom: 1px solid var(--light-border-color);
      margin-bottom: 20px;
      padding-bottom: 8px;
      @media (max-width: 1024px) {
        margin-bottom: 15px;
      }
      .date {
        color: var(--regular-text-color);
        margin-bottom: 6px;
      }

      .email-msg {
        max-width: 400px;
        width: fit-content;
        margin-bottom: 15px;
      }

      .send {
        display: flex;
        margin-bottom: 6px;

        .send-name {
          color: var(--regular-text-color);
          display: flex;
          flex-wrap: wrap;
        }

        .send-name-title {
          padding-right: 5px;
        }
      }

      .receive {
        margin-bottom: 6px;
        display: flex;
        .receive-email {
          max-width: 700px;
          word-break: break-word;
        }
        span:nth-child(2) {
          color: var(--regular-text-color);
        }
      }

      .send-source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }

      .source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }
    }
  }
}

.mail-frame {
  width: 100%;
  min-height: 52vh;
  border: 0;
  background: #fff;
}

.email-text {
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.bottom-distance {
  margin-bottom: 30px;
}

.box {
  min-width: 0;
  background: var(--ui-surface, var(--el-bg-color));
}

.header-actions {
  min-height: 56px;
  padding: 5px 16px;
  gap: 6px;
  border-bottom: 1px solid var(--ui-line, var(--el-border-color));
  box-shadow: none;

  .icon-button {
    min-width: 44px;
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    background: transparent;
  }

  .icon-button:hover { background: var(--ui-surface-alt, var(--el-fill-color-light)); }
}

.icon-button:focus-visible,
.att-item button:focus-visible {
  outline-color: var(--ui-focus, var(--el-color-primary));
}

.scrollbar { height: calc(100% - 56px); }

.container {
  width: min(100%, 900px);
  margin-inline: auto;
  padding: 26px clamp(18px, 3vw, 46px) 64px;
  font-size: 15px;
  line-height: 1.65;

  .email-title {
    margin: 0 0 22px;
    color: var(--ui-ink, var(--el-text-color-primary));
    font-size: clamp(22px, 2.3vw, 30px);
    line-height: 1.25;
    letter-spacing: -.025em;
    overflow-wrap: anywhere;
  }

  .email-title:focus { outline: none; }

  .content {
    .email-info {
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-color: var(--ui-line, var(--light-border-color));
      .date, .send .send-name, .receive span:nth-child(2) { color: var(--ui-muted, var(--regular-text-color)); }
      .send .send-name { min-width: 0; gap: 4px; overflow-wrap: anywhere; }
      .send-source, .source { padding-inline-end: 10px; padding-right: 0; }
      .receive-email { text-align: start; }
    }

    .att {
      width: min(100%, 680px);
      margin-block: 28px 30px;
      padding: 16px;
      border-color: var(--ui-line, var(--light-border-color));
      border-radius: 10px;
      .att-box { min-width: 0; width: 100%; max-width: none; }
      .att-item {
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        gap: 7px;
        padding: 10px;
        border-radius: 8px;
        button { min-width: 36px; min-height: 36px; }
        .att-name { margin-inline: 4px; margin-left: 0; margin-right: 0; }
        .opt-icon { padding-inline-start: 8px; padding-left: 0; }
      }
    }
  }
}

@media (max-width: 600px) {
  .header-actions { padding-inline: 8px; }
  .container { padding: 22px 16px 72px; }
  .container .content .att .att-item {
    grid-template-columns: auto minmax(0, 1fr) auto;
    .att-size { grid-column: 2; }
    .opt-icon { grid-column: 3; grid-row: 1 / 3; }
  }
}

:global([dir="rtl"] .box .header-actions .icon-button:first-child svg) { transform: scaleX(-1); }

</style>
