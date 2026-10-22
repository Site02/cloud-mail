<template>
  <div class="mail-ui-host">
    <div :class="['mail-app', { reading: activeMessage }]">
      <button
        aria-label="Close navigation"
        :class="['drawer-scrim', { show: drawerOpen }]"
        @click="drawerOpen = false"
      />
      <aside :class="['sidebar', { open: drawerOpen }]" aria-label="Main navigation">
        <div class="brand">
          <img class="brand-logo" :src="xpassLogo" alt="" />
          <div class="brand-name">XPass <em>Mail</em></div>
        </div>
        <div class="account-card">
          <div class="account-avatar" aria-hidden="true">{{ getInitials(account.name || account.email) }}</div>
          <div class="account-info">
            <div class="account-name">{{ account.name || account.email }}</div>
            <div class="account-email">{{ account.email }}</div>
          </div>
        </div>
        <button class="sidebar-compose" @click="openCompose()">
          <Icon icon="hugeicons:quill-write-01" />
          Compose
        </button>
        <div class="section-label">Workspace</div>
        <nav class="nav-list">
          <button
            v-for="item in folders"
            :key="item.id"
            :class="['nav-item', { active: folder === item.id }]"
            :aria-current="folder === item.id ? 'page' : undefined"
            @click="selectFolder(item.id)"
          >
            <Icon :icon="item.icon" />
            <span>{{ item.name }}</span>
            <span v-if="item.id === 'inbox' && unreadCount" class="nav-count">{{ unreadCount }}</span>
          </button>
        </nav>
        <div class="sidebar-spacer" />
        <div class="sidebar-bottom">
          <div class="section-label">Your account</div>
          <nav class="nav-list">
            <button class="nav-item" @click="router.push('/settings')">
              <Icon icon="fluent:settings-24-filled" />
              <span>Preferences</span>
            </button>
            <button class="nav-item" @click="notify('Support: hello@getxpass.net')">
              <Icon icon="mdi:email-outline" />
              <span>Help &amp; support</span>
            </button>
          </nav>
          <p class="plan-note">A little more room to think.<br />Your team’s mail, together.</p>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <button class="icon-button mobile-menu" aria-label="Open navigation" @click="drawerOpen = true">
            <Icon icon="akar-icons:dot-grid-fill" />
          </button>
          <div class="mobile-brand">
            <img class="mobile-logo" :src="xpassLogo" alt="" />XPass <em>Mail</em>
          </div>
          <label class="search-wrap">
            <input
              v-model="query"
              class="search-input"
              aria-label="Search mail"
              placeholder="Search your mail"
            />
          </label>
          <div class="topbar-actions">
            <button class="icon-button" aria-label="Refresh inbox" title="Refresh inbox" @click="refresh">
              <Icon icon="ion:reload" />
            </button>
            <button class="icon-button" aria-label="Notifications" title="Notifications" @click="notify('You’re all caught up.')">
              <Icon icon="fluent:mail-read-20-regular" />
            </button>
            <div class="topbar-avatar" :aria-label="account.name || account.email">
              {{ getInitials(account.name || account.email) }}
            </div>
          </div>
        </header>

        <div class="workspace">
          <section class="list-pane" :aria-label="`${folderName} messages`">
            <div class="list-heading">
              <div class="heading-row">
                <div>
                  <h1 class="page-title">{{ folderName }}</h1>
                  <div class="subtle-copy">
                    {{ folderMessages.length }} {{ folderMessages.length === 1 ? 'message' : 'messages' }}
                    · {{ unreadCount }} unread
                  </div>
                </div>
                <button class="icon-button" aria-label="Refresh inbox" title="Refresh inbox" @click="refresh">
                  <Icon icon="ion:reload" />
                </button>
              </div>
              <div class="filter-tabs" role="tablist" aria-label="Message filters">
                <button
                  v-for="item in filters"
                  :key="item"
                  :class="['filter-tab', { active: filter === item }]"
                  role="tab"
                  :aria-selected="filter === item"
                  @click="filter = item"
                >
                  {{ item[0].toUpperCase() + item.slice(1) }}
                </button>
              </div>
            </div>
            <div class="mail-list">
              <div v-if="loadError" class="empty-list" role="alert">
                {{ loadError }}<br />
                <button class="retry-button" @click="refresh">Try again</button>
              </div>
              <div v-else-if="loading" class="empty-list" role="status">Loading your messages…</div>
              <template v-else-if="visibleMessages.length">
                <div
                  v-for="message in visibleMessages"
                  :key="message.id"
                  :class="['message-card', { unread: message.unread, selected: activeMessageId === message.id }]"
                >
                  <button
                    class="message-select"
                    :aria-label="`Open ${message.subject} from ${message.from}`"
                    @click="openMessage(message.id)"
                  >
                    <div class="sender-avatar" aria-hidden="true">{{ getInitials(message.from) }}</div>
                    <div class="sender-block">
                      <div class="sender-name">{{ message.from }}</div>
                      <div class="message-subject">{{ message.subject }}</div>
                      <div class="message-preview">{{ message.preview }}</div>
                    </div>
                  </button>
                  <div class="message-meta">
                    <span>{{ message.time }}</span>
                    <button
                      class="icon-button"
                      :aria-label="message.starred ? 'Remove star' : 'Add star'"
                      :title="message.starred ? 'Remove star' : 'Add star'"
                      :style="{ width: '23px', height: '23px', marginRight: '-4px' }"
                      @click.stop="toggleStar(message)"
                    >
                      <Icon
                        icon="solar:star-line-duotone"
                        :style="{ color: message.starred ? '#e6a23c' : 'currentColor' }"
                      />
                    </button>
                    <span v-if="message.unread" class="unread-dot" aria-label="Unread" />
                  </div>
                </div>
              </template>
              <div v-else class="empty-list">
                {{ query ? 'No messages match your search.' : 'Nothing here just yet.' }}<br />
                Try another folder or filter.
              </div>
              <div v-if="loadMoreError" class="load-more-error" role="alert">{{ loadMoreError }}</div>
              <button
                v-if="hasMore[folder] && !loading"
                class="load-more"
                :disabled="loadingMore"
                @click="loadMoreMessages(folder)"
              >
                {{ loadingMore ? 'Loading…' : 'Load older messages' }}
              </button>
            </div>
          </section>

          <section class="mail-content" aria-label="Message">
            <article v-if="activeMessage" class="reader">
              <div class="reader-toolbar">
                <button class="icon-button mobile-menu" aria-label="Back to messages" @click="setActiveMessage(null)">
                  <span class="text-icon" aria-hidden="true">‹</span>
                </button>
                <button class="icon-button" title="Delete" aria-label="Delete message" @click="deleteActiveMessage">
                  <Icon icon="uiw:delete" />
                </button>
                <span class="toolbar-divider" />
                <button
                  class="icon-button"
                  :title="activeMessage.starred ? 'Remove star' : 'Star'"
                  :aria-label="activeMessage.starred ? 'Remove star' : 'Star'"
                  @click="toggleStar(activeMessage)"
                >
                  <Icon
                    icon="solar:star-line-duotone"
                    :style="{ color: activeMessage.starred ? '#e6a23c' : 'currentColor' }"
                  />
                </button>
                <div class="reader-spacer" />
                <button class="icon-button" title="Previous message" aria-label="Previous message" :disabled="activeIndex <= 0" @click="moveSelection(-1)">
                  <span class="text-icon" aria-hidden="true">‹</span>
                </button>
                <button class="icon-button" title="Next message" aria-label="Next message" :disabled="activeIndex < 0 || activeIndex >= visibleMessages.length - 1" @click="moveSelection(1)">
                  <span class="text-icon" aria-hidden="true">›</span>
                </button>
              </div>
              <h2 class="reader-subject">
                {{ activeMessage.subject }}
                <span v-if="activeMessage.attachments.length" class="tag">Attachment</span>
              </h2>
              <div class="sender-details">
                <div class="sender-avatar large" aria-hidden="true">{{ getInitials(activeMessage.from) }}</div>
                <div class="sender-info">
                  <div class="sender-fullname">{{ activeMessage.from }}</div>
                  <div class="sender-address">{{ activeMessage.email }}</div>
                  <div class="to-line">to {{ activeMessage.to }}</div>
                </div>
                <time class="sent-date">{{ activeMessage.date }}</time>
              </div>
              <div class="email-body">
                <p v-for="(line, index) in activeMessage.body.split('\n')" :key="`${index}-${line}`">{{ line || '\u00a0' }}</p>
              </div>
              <div v-for="attachment in activeMessage.attachments" :key="attachment.name" class="attachment">
                <Icon icon="solar:paperclip-rounded-2-bold" />
                <div>{{ attachment.name }}<small>{{ attachment.size }}</small></div>
              </div>
              <button class="reply-box" @click="replyToMessage">
                <Icon icon="mdi:email-outline" />
                <span>{{ activeMessage.folder === 'sent' ? `Write again to ${activeMessage.to.split(',')[0]}` : `Reply to ${activeMessage.from.split(' ')[0]}` }}</span>
                <span class="reply-button"><Icon icon="mdi:email-outline" />Reply</span>
              </button>
            </article>
            <div v-else class="reader-empty">
              <div>
                <div class="empty-mark"><Icon icon="fluent:mail-read-20-regular" /></div>
                <h2 class="empty-title">A little breathing room.</h2>
                <p class="empty-copy">Choose a message to read, or compose a note to someone on your team.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div
        v-if="composeOpen"
        class="modal-backdrop"
        @keydown.esc="closeCompose"
        @click.self="closeCompose"
      >
        <form class="compose-modal" role="dialog" aria-modal="true" aria-labelledby="compose-title" @submit.prevent="submit">
          <div class="compose-head">
            <span id="compose-title">New message</span>
            <button class="icon-button" aria-label="Close compose" type="button" @click="closeCompose">
              <span class="text-icon" aria-hidden="true">×</span>
            </button>
          </div>
          <div class="compose-field">
            <label for="compose-to">To</label>
            <input id="compose-to" v-model="draft.to" type="email" placeholder="name@company.com" required autofocus />
          </div>
          <div class="compose-field">
            <label for="compose-subject">Subject</label>
            <input id="compose-subject" v-model="draft.subject" placeholder="Add a subject" required />
          </div>
          <textarea v-model="draft.body" class="compose-body" aria-label="Message body" placeholder="Write something thoughtful…" required />
          <div v-if="composeError" class="error-state" role="alert">{{ composeError }}</div>
          <div class="compose-footer">
            <button class="send-button" type="submit" :disabled="sending">
              <template v-if="sending">Sending…</template>
              <template v-else><Icon icon="cil:send" />Send message</template>
            </button>
            <span class="draft-note">Sent from {{ account.email }}</span>
          </div>
        </form>
      </div>
      <div v-if="toast" class="toast-note" role="status">{{ toast }}</div>
    </div>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {Icon} from '@iconify/vue'
import {useAccountStore} from '@/store/account.js'
import {useUserStore} from '@/store/user.js'
import router from '@/router/index.js'
import {createMailApiAdapter} from '@/mail-ui/mail-api.js'
import xpassLogo from '@/mail-ui/xpass-logo.png'
import '@/mail-ui/styles.css'

const accountStore = useAccountStore()
const userStore = useUserStore()
const account = computed(() => {
  const user = userStore.user || {}
  const activeAccount = accountStore.currentAccount?.accountId
    ? accountStore.currentAccount
    : user.account || {}
  return {
    accountId: Number(activeAccount.accountId),
    allReceive: Number(activeAccount.allReceive) || 0,
    email: activeAccount.email || user.email || '',
    name: activeAccount.name || user.name || '',
  }
})
const mailApi = ref(createMailApiAdapter(account.value))
const folders = [
  {id: 'inbox', name: 'Inbox', icon: 'hugeicons:mailbox-01'},
  {id: 'starred', name: 'Starred', icon: 'solar:star-line-duotone'},
  {id: 'sent', name: 'Sent', icon: 'cil:send'},
]
const filters = ['all', 'unread', 'starred']
const folder = ref('inbox')
const filter = ref('all')
const query = ref('')
const drawerOpen = ref(false)
const messages = ref([])
const activeMessageId = ref(null)
const composeOpen = ref(false)
const draft = ref({to: '', subject: '', body: ''})
const loading = ref(true)
const loadingMore = ref(false)
const sending = ref(false)
const loadError = ref('')
const loadMoreError = ref('')
const composeError = ref('')
const hasMore = ref({inbox: false, sent: false, starred: false})
const toast = ref('')
let toastTimer
let accountVersion = 0

const activeMessage = computed(() => messages.value.find((message) => message.id === activeMessageId.value) || null)
const folderName = computed(() => folders.find((item) => item.id === folder.value)?.name || 'Inbox')
const folderMessages = computed(() => messages.value.filter((message) => (
  folder.value === 'starred' ? message.starred : message.folder === folder.value
)))
const visibleMessages = computed(() => {
  const search = query.value.trim().toLowerCase()
  return folderMessages.value.filter((message) => {
    const matchesFilter = filter.value === 'unread'
      ? message.unread
      : filter.value === 'starred' ? message.starred : true
    const matchesSearch = !search || `${message.from} ${message.email} ${message.subject} ${message.preview} ${message.body}`.toLowerCase().includes(search)
    return matchesFilter && matchesSearch
  })
})
const activeIndex = computed(() => visibleMessages.value.findIndex((message) => message.id === activeMessageId.value))
const unreadCount = computed(() => messages.value.filter((message) => message.folder === 'inbox' && message.unread).length)

async function refreshMessages() {
  const version = accountVersion
  const adapter = mailApi.value
  loading.value = true
  loadError.value = ''
  try {
    const page = await adapter.loadMessages()
    if (version !== accountVersion) return false
    messages.value = page.messages
    hasMore.value = page.hasMore
    return true
  } catch (error) {
    if (version !== accountVersion) return false
    console.error('Unable to load mail messages:', error)
    loadError.value = 'Your messages could not be loaded. Check your connection and try again.'
    return false
  } finally {
    if (version === accountVersion) loading.value = false
  }
}

async function loadMoreMessages(selectedFolder) {
  if (loadingMore.value || !hasMore.value[selectedFolder]) return
  const version = accountVersion
  const adapter = mailApi.value
  loadingMore.value = true
  loadMoreError.value = ''
  try {
    const page = await adapter.loadMoreMessages(selectedFolder)
    if (version !== accountVersion) return
    const messagesById = new Map(messages.value.map((message) => [message.id, message]))
    for (const message of page.messages) messagesById.set(message.id, message)
    messages.value = [...messagesById.values()].sort((a, b) => b.timestamp - a.timestamp)
    hasMore.value = {...hasMore.value, [selectedFolder]: page.hasMore}
  } catch (error) {
    if (version !== accountVersion) return
    console.error(`Unable to load more ${selectedFolder} mail:`, error)
    loadMoreError.value = 'Older messages could not be loaded. Try again.'
  } finally {
    if (version === accountVersion) loadingMore.value = false
  }
}

async function setActiveMessage(id) {
  const version = accountVersion
  if (id) {
    const message = messages.value.find((item) => item.id === id)
    if (message?.unread) {
      await mailApi.value.markRead(id)
      if (version !== accountVersion) return
      messages.value = messages.value.map((item) => item.id === id ? {...item, unread: false} : item)
    }
  }
  if (version !== accountVersion) return
  activeMessageId.value = id
}

async function openMessage(id) {
  const version = accountVersion
  try {
    await setActiveMessage(id)
    if (version !== accountVersion) return
    drawerOpen.value = false
  } catch {
    if (version === accountVersion) notify('This message could not be opened.')
  }
}

function selectFolder(nextFolder) {
  folder.value = nextFolder
  filter.value = 'all'
  activeMessageId.value = null
  drawerOpen.value = false
}

async function toggleStar(message) {
  const version = accountVersion
  try {
    await mailApi.value.toggleStar(message.id, !message.starred)
    if (version !== accountVersion) return
    messages.value = messages.value.map((item) => item.id === message.id
      ? {...item, starred: !message.starred}
      : item)
  } catch {
    if (version === accountVersion) notify('The star could not be updated.')
  }
}

async function deleteActiveMessage() {
  if (!activeMessage.value) return
  const version = accountVersion
  const messageId = activeMessage.value.id
  try {
    await mailApi.value.deleteMessage(messageId)
    if (version !== accountVersion) return
    messages.value = messages.value.filter((item) => item.id !== messageId)
    activeMessageId.value = null
    notify('Message deleted.')
  } catch {
    if (version === accountVersion) notify('This message could not be deleted.')
  }
}

function openCompose(initial = {}) {
  draft.value = {
    to: initial.to || '',
    subject: initial.subject || '',
    body: initial.body || '',
  }
  composeError.value = ''
  composeOpen.value = true
  drawerOpen.value = false
}

function closeCompose() {
  composeOpen.value = false
}

function replyToMessage() {
  const message = activeMessage.value
  if (!message) return
  const recipient = message.folder === 'sent' ? message.to.split(',')[0]?.trim() : message.email
  openCompose({
    to: recipient,
    subject: `Re: ${message.subject}`,
    body: `\n\n—\nOn ${message.date}, ${message.from} wrote:\n> ${message.preview}`,
  })
}

async function submit() {
  if (!draft.value.to.trim() || !draft.value.subject.trim() || !draft.value.body.trim()) {
    composeError.value = 'Add a recipient, subject, and message before sending.'
    return
  }
  sending.value = true
  composeError.value = ''
  const version = accountVersion
  const adapter = mailApi.value
  try {
    await adapter.sendMessage(draft.value)
    if (version !== accountVersion) return
    composeOpen.value = false
    draft.value = {to: '', subject: '', body: ''}
    await refreshMessages()
  } catch {
    if (version === accountVersion) composeError.value = 'Your message could not be sent. Please try again.'
  } finally {
    if (version === accountVersion) sending.value = false
  }
}

async function refresh() {
  notify(await refreshMessages() ? 'Messages refreshed.' : 'Your messages could not be refreshed.')
}

function notify(message) {
  toast.value = message
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = '' }, 2400)
}

function moveSelection(offset) {
  const nextIndex = activeIndex.value + offset
  if (nextIndex >= 0 && nextIndex < visibleMessages.value.length) {
    void openMessage(visibleMessages.value[nextIndex].id)
  }
}

function getInitials(name) {
  return String(name || '').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
}

onMounted(() => {
  void refreshMessages()
})

watch(() => account.value.accountId, (accountId, previousAccountId) => {
  if (accountId === previousAccountId) return
  accountVersion += 1
  mailApi.value = createMailApiAdapter(account.value)
  messages.value = []
  activeMessageId.value = null
  hasMore.value = {inbox: false, sent: false, starred: false}
  loadingMore.value = false
  loadMoreError.value = ''
  composeOpen.value = false
  sending.value = false
  void refreshMessages()
})

onBeforeUnmount(() => {
  window.clearTimeout(toastTimer)
})
</script>

<style scoped>
.mail-ui-host {
  position: fixed;
  z-index: 1000;
  inset: 0;
  min-height: 100dvh;
}
</style>
