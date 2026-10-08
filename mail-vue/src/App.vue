<template>
  <el-config-provider :locale="elementLocale">
    <main v-if="startupFailed" class="app-connect-error" role="alert">
      <img src="/app-icon-192.png" alt="" width="72" height="72" />
      <h1>{{ $t('pwa.connectTitle') }}</h1>
      <p>{{ $t('pwa.connectBody') }}</p>
      <button type="button" @click="retryConnection">{{ $t('pwa.retry') }}</button>
    </main>
    <router-view v-else />
    <div v-if="!startupFailed && (languageError || !online || updateAvailable)" class="app-status"
         :role="languageError ? 'alert' : 'status'">
      <template v-if="languageError">
        <span>{{ $t('language') }}: {{ $t('reqFailErrorMsg') }}</span>
        <button type="button" @click="retryLanguage">{{ $t('pwa.retry') }}</button>
      </template>
      <template v-else>
        <span>{{ !online ? $t(route.name === 'find' ? 'temporaryInbox.offlineHistoryOnly' : 'pwa.offlineNotice') : $t('pwa.updateReady') }}</span>
        <button v-if="online && updateAvailable" type="button" @click="applyUpdate">{{ $t('pwa.updateNow') }}</button>
        <button v-if="online && updateAvailable" type="button" @click="dismissUpdate">{{ $t('pwa.updateLater') }}</button>
      </template>
    </div>
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";
import {useSettingStore} from "@/store/setting.js";
import {getBrowserLanguage, resolveLanguage} from "@/i18n/index.js";
import {prepareLanguage} from '@/i18n/ready.js';
import {intlLanguage, languageDirection, manifestPath} from '@/i18n/languages.js';
import en from 'element-plus/es/locale/lang/en';
import {setExtend} from '@/utils/day.js';
import {startupFailed, online, updateAvailable, applyUpdate, dismissUpdate} from '@/pwa/status.js';
function retryConnection() { window.location.reload() }
const settingStore = useSettingStore()
const route = useRoute()
const browserLang = ref(getBrowserLanguage())
const temporaryPage = computed(() => route.name === 'find'
  || (!route.name && (window.location.hostname.startsWith('temp.') || window.location.pathname === '/find')))
const effectiveLang = computed(() => temporaryPage.value
  ? resolveLanguage(settingStore.publicMailboxLanguage, browserLang.value)
  : resolveLanguage(settingStore.lang, browserLang.value))
import('@/icons/index.js')
const elementLocale = shallowRef(en)
const { locale, t, te } = useI18n()
const languageError = ref(false)
// A failed JavaScript module import is cached by the browser for this page.
// A fresh navigation gives the language chunk another network attempt.
function retryLanguage() { window.location.reload() }

function refreshBrowserLanguage() {
  browserLang.value = getBrowserLanguage()
}

function onVisibilityChange() {
  if (!document.hidden) refreshBrowserLanguage()
}

function onStorage(event) {
  if (event.key !== 'setting' || !event.newValue) return
  try {
    const next = JSON.parse(event.newValue)
    if (typeof next.lang === 'string' && next.lang !== settingStore.lang) settingStore.lang = next.lang
    if (typeof next.publicMailboxLanguage === 'string' && next.publicMailboxLanguage !== settingStore.publicMailboxLanguage) {
      settingStore.publicMailboxLanguage = next.publicMailboxLanguage
    }
  } catch { /* Ignore unrelated or malformed browser storage. */ }
}

onMounted(() => {
  window.addEventListener('languagechange', refreshBrowserLanguage)
  window.addEventListener('focus', refreshBrowserLanguage)
  window.addEventListener('storage', onStorage)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('languagechange', refreshBrowserLanguage)
  window.removeEventListener('focus', refreshBrowserLanguage)
  window.removeEventListener('storage', onStorage)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

let languageRevision = 0
function applyDocumentLanguage(lang) {
  document.documentElement.lang = intlLanguage(lang)
  document.documentElement.dir = languageDirection(lang)
  setExtend(lang)
  const temporary = temporaryPage.value
  const siteTitle = settingStore.settings.title || t('pwa.appName')
  const routeTitle = route.meta.title
  document.title = temporary
    ? t('temporaryInbox.title')
    : (typeof routeTitle === 'string' && te(routeTitle) ? `${t(routeTitle)} · ${siteTitle}` : siteTitle)
  const description = document.querySelector('meta[name="description"]')
  if (description) description.content = temporary ? t('temporaryInbox.tagline') : t('pwa.description')
  document.querySelector('link[rel="manifest"]')?.setAttribute('href', manifestPath(lang, temporary))
}

watch([effectiveLang, () => route.name, () => route.meta.title, () => settingStore.settings.title,
  () => settingStore.languageLoadRevision], async ([lang]) => {
  const revision = ++languageRevision
  try {
    const {elementLocale: componentLocale} = await prepareLanguage(lang)
    if (revision !== languageRevision) return
    elementLocale.value = componentLocale
  } catch (error) {
    if (revision === languageRevision) {
      languageError.value = true
      applyDocumentLanguage(locale.value)
      console.error('Could not load selected language:', error)
    }
    return
  }
  languageError.value = false
  locale.value = lang
  applyDocumentLanguage(lang)
}, { immediate: true, flush: 'sync' })
</script>
<style scoped>
.app-connect-error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
  background: var(--ui-bg);
  color: var(--ui-ink);
}
.app-connect-error img { border-radius: 16px; }
.app-connect-error h1 { font-size: 22px; }
.app-connect-error p { max-width: 420px; color: var(--ui-muted); line-height: 1.6; }
.app-connect-error button, .app-status button {
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #fff;
  cursor: pointer;
  padding: 9px 15px;
}
.app-connect-error button:focus-visible, .app-status button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
.app-status {
  position: fixed;
  z-index: 3000;
  bottom: calc(16px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(640px, calc(100vw - 24px));
  padding: 12px 14px;
  border: 1px solid var(--ui-line);
  border-radius: 12px;
  background: var(--ui-surface);
  color: var(--ui-ink);
  box-shadow: var(--el-box-shadow);
  line-height: 1.4;
}
.app-status button:last-child { background: transparent; color: var(--el-text-color-regular); }
@media (max-width: 520px) { .app-status { width: calc(100vw - 24px); flex-wrap: wrap; } }
</style>
