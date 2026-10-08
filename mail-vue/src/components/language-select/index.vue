<template>
  <div class="language-picker">
    <button ref="trigger" type="button" class="language-picker-trigger" :aria-label="`${t('language')}: ${selectedName}`"
            aria-haspopup="dialog" :aria-expanded="open" @click="open = true">
      <Icon icon="mdi:translate" width="18" height="18" aria-hidden="true" />
      <span class="language-picker-name" :lang="selectedLanguage?.intl || null"
            :dir="selectedDirection">{{ selectedName }}</span>
      <Icon icon="mingcute:down-small-fill" width="16" height="16" aria-hidden="true" />
    </button>

    <el-dialog v-model="open" :title="t('language')" class="language-picker-dialog"
               width="min(480px, calc(100vw - 24px))" append-to-body align-center
               @opened="focusSearch" @closed="restoreFocus">
      <div class="language-picker-search-wrap">
        <Icon icon="lucide:search" width="18" height="18" aria-hidden="true" />
        <input ref="searchInput" v-model="query" type="search" :aria-label="t('languageSearch')"
               :placeholder="t('languageSearch')" autocomplete="off" />
      </div>

      <p v-if="pickerError" class="language-picker-error" role="alert">
        <span>{{ t('reqFailErrorMsg') }}</span>
        <button type="button" @click="retryFailedChoice">{{ t('pwa.retry') }}</button>
      </p>
      <div class="language-picker-list" :aria-busy="loading" @keydown="onListKeydown">
        <button v-if="matchesAuto" type="button" class="language-picker-option" :disabled="loading"
                :class="{'is-selected': modelValue === 'auto' || !modelValue}"
                :aria-pressed="modelValue === 'auto' || !modelValue" @click="choose('auto')">
          <span class="language-picker-option-text">
            <strong>{{ t('languageAuto') }}</strong>
            <small>
              <span>{{ t('temporaryInbox.followBrowser') }}</span>
              <span :lang="intlLanguage(browserLanguage)" :dir="languageDirection(browserLanguage)">{{ browserLanguageName }}</span>
            </small>
          </span>
          <Icon v-if="modelValue === 'auto' || !modelValue" icon="lucide:check" width="18" height="18" aria-hidden="true" />
        </button>
        <button v-for="language in filteredLanguages" :key="language.code" type="button" :disabled="loading"
                class="language-picker-option" :class="{'is-selected': manuallySelected(language.code)}"
                :aria-pressed="manuallySelected(language.code)" @click="choose(language.code)">
          <span class="language-picker-option-text">
            <strong :lang="language.intl" :dir="language.dir">{{ language.name }}</strong>
            <small>
              <span lang="en" dir="ltr">{{ englishName(language) }}</span>
              <span v-if="language.status === 'preview'" :lang="intlLanguage(locale)"
                    :dir="languageDirection(locale)" class="language-picker-preview">{{ t('languagePreview') }}</span>
            </small>
          </span>
          <Icon v-if="manuallySelected(language.code)" icon="lucide:check" width="18" height="18" aria-hidden="true" />
        </button>
        <p v-if="!matchesAuto && !filteredLanguages.length" class="language-picker-empty" role="status">
          {{ t('languageNoResults') }}
        </p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {Icon} from '@iconify/vue'
import {useI18n} from 'vue-i18n'
import {getBrowserLanguage, intlLanguage, languages, languageDirection, normalizeLanguage} from '@/i18n/languages.js'
import {prepareLanguage} from '@/i18n/ready.js'
import {useSettingStore} from '@/store/setting.js'

const props = defineProps({modelValue: {type: String, default: 'auto'}})
const emit = defineEmits(['update:modelValue'])
const {t, locale} = useI18n()
const settingStore = useSettingStore()
const open = ref(false)
const query = ref('')
const trigger = ref(null)
const searchInput = ref(null)
const loading = ref(false)
const pickerError = ref(false)
const failedChoice = ref(null)
const browserLanguage = ref(getBrowserLanguage())
const englishDisplayNames = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], {type: 'language'})
  : null

const selectedLanguage = computed(() => languages.find(language => language.code === normalizeLanguage(locale.value)))
const browserLanguageName = computed(() => languages.find(language => language.code === browserLanguage.value)?.name || 'English')
const selectedName = computed(() => props.modelValue === 'auto' || !props.modelValue
  ? `${t('languageAuto')} · ${selectedLanguage.value?.name || 'English'}`
  : selectedLanguage.value?.name || 'English')
const selectedDirection = computed(() => selectedLanguage.value?.dir || 'ltr')

function manuallySelected(code) {
  return props.modelValue !== 'auto' && Boolean(props.modelValue) && selectedLanguage.value?.code === code
}

function englishName(language) {
  try { return englishDisplayNames?.of(language.intl) || language.code }
  catch { return language.code }
}

function fold(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase()
}

const foldedQuery = computed(() => fold(query.value.trim()))
const matchesAuto = computed(() => !foldedQuery.value || fold(`${t('languageAuto')} ${browserLanguageName.value} auto ${t('temporaryInbox.followBrowser')}`).includes(foldedQuery.value))
const filteredLanguages = computed(() => {
  if (!foldedQuery.value) return languages
  return languages.filter(language => fold(`${language.name} ${englishName(language)} ${language.code} ${language.intl}`).includes(foldedQuery.value))
})

async function choose(value) {
  if (loading.value) return
  loading.value = true
  pickerError.value = false
  failedChoice.value = null
  try {
    await prepareLanguage(value === 'auto' ? browserLanguage.value : value)
    emit('update:modelValue', value)
    settingStore.languageLoadRevision += 1
    open.value = false
  } catch {
    failedChoice.value = value
    pickerError.value = true
  } finally {
    loading.value = false
  }
}

async function retryFailedChoice() {
  if (failedChoice.value === null) return
  emit('update:modelValue', failedChoice.value)
  await nextTick()
  window.location.reload()
}

function focusSearch() {
  searchInput.value?.focus()
}

function restoreFocus() {
  query.value = ''
  pickerError.value = false
  failedChoice.value = null
  nextTick(() => trigger.value?.focus())
}

function onListKeydown(event) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const items = [...event.currentTarget.querySelectorAll('.language-picker-option')]
  if (!items.length) return
  const index = items.indexOf(document.activeElement)
  let next = index
  if (event.key === 'ArrowDown') next = Math.min(index + 1, items.length - 1)
  if (event.key === 'ArrowUp') next = Math.max(index - 1, 0)
  if (event.key === 'Home') next = 0
  if (event.key === 'End') next = items.length - 1
  event.preventDefault()
  items[next]?.focus()
}

function refreshBrowserLanguage() {
  browserLanguage.value = getBrowserLanguage()
}

function onVisibilityChange() {
  if (!document.hidden) refreshBrowserLanguage()
}

watch(open, value => { if (value) refreshBrowserLanguage() })
onMounted(() => {
  window.addEventListener('languagechange', refreshBrowserLanguage)
  window.addEventListener('focus', refreshBrowserLanguage)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('languagechange', refreshBrowserLanguage)
  window.removeEventListener('focus', refreshBrowserLanguage)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.language-picker { display: inline-flex; min-width: 0; max-width: 100%; }
.language-picker-trigger {
  display: inline-flex; align-items: center; justify-content: space-between; gap: 7px;
  min-width: 0; max-width: 100%; min-height: 44px; padding: 0 10px;
  border: 1px solid var(--language-control-border, var(--el-border-color)); border-radius: 9px;
  background: var(--language-control-bg, var(--el-fill-color-blank));
  color: var(--language-control-text, var(--el-text-color-primary)); font: inherit; font-size: 13px; cursor: pointer;
}
.language-picker-trigger:hover { border-color: var(--el-color-primary); }
.language-picker-trigger:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.language-picker-name { min-width: 0; max-width: 155px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.language-picker-search-wrap {
  display: flex; align-items: center; gap: 9px; min-height: 44px; padding: 0 12px;
  border: 1px solid var(--el-border-color); border-radius: 9px;
  color: var(--el-text-color-secondary);
}
.language-picker-search-wrap:focus-within { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.language-picker-search-wrap input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--el-text-color-primary); font: inherit; font-size: 15px; }
.language-picker-list { max-height: min(55vh, 440px); overflow-y: auto; overscroll-behavior: contain; padding: 6px 0 0; }
.language-picker-option {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; min-height: 48px; padding: 8px 10px; border: 0; border-radius: 8px;
  background: transparent; color: var(--el-text-color-primary); text-align: start; cursor: pointer;
}
.language-picker-option:hover, .language-picker-option:focus-visible { background: var(--el-fill-color-light); }
.language-picker-option:disabled { cursor: wait; opacity: .65; }
.language-picker-option:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: -2px; }
.language-picker-option.is-selected { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.language-picker-option-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.language-picker-option-text strong { font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.language-picker-option-text small { display: flex; flex-wrap: wrap; gap: 4px; font-size: 12px; color: var(--el-text-color-secondary); overflow-wrap: anywhere; }
.language-picker-preview::before { content: '· '; }
.language-picker-empty { padding: 18px 10px; color: var(--el-text-color-secondary); text-align: center; }
.language-picker-error { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 8px 0 0; color: var(--el-color-danger); font-size: 13px; }
.language-picker-error button { border: 0; background: transparent; color: var(--el-color-primary); font: inherit; font-weight: 600; cursor: pointer; text-decoration: underline; }
.language-picker-error button:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
@media (max-width: 480px) {
  .language-picker { flex: 1 1 auto; }
  .language-picker-trigger { width: 100%; }
  .language-picker-name { max-width: min(155px, 30vw); }
}
</style>
