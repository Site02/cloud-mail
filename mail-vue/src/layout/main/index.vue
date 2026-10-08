<template>
  <div :class="accountShow && hasPerm('account:query') ? 'main-box-show' : 'main-box-hide'">
    <div :class="accountShow && hasPerm('account:query') ? 'block-show' : 'block-hide'" @click="uiStore.accountShow = false"></div>
    <account  :class="accountShow && hasPerm('account:query') ? 'show' : 'hide'" />
    <div v-if="mailWorkspace" class="mail-workspace" :class="{ 'is-reading': route.name === 'content' }">
      <EmailView class="mail-list-pane" />
      <ContentView v-if="route.name === 'content'" class="mail-reader-pane" />
    </div>
    <router-view v-else class="main-view" v-slot="{ Component,route: viewRoute }">
      <keep-alive :include="['all-email','send','sys-setting','star','user','role','analysis','reg-key','draft']">
        <component :is="Component" :key="viewRoute.name"/>
      </keep-alive>
    </router-view>
  </div>
</template>
<script setup>
import account from '@/layout/account/index.vue'
import EmailView from '@/views/email/index.vue'
import ContentView from '@/views/content/index.vue'
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {computed, onBeforeUnmount, onMounted, watch} from "vue";
import { useRoute } from 'vue-router'
import { hasPerm } from "@/perm/perm.js"
import {useI18n} from 'vue-i18n'
import {displayNoticeContent, isBuiltInNoticeContent} from '@/i18n/system-defaults.js'

const settingStore = useSettingStore()
const uiStore = useUiStore();
const route = useRoute()
const {t, locale} = useI18n()
// 详情页只在从收件箱进入时保留收件箱双栏；其他来源使用各自的列表返回路径。
const mailWorkspace = computed(() => route.name === 'email'
  || (route.name === 'content' && /^\/inbox(?:[?#]|$)/.test(window.history.state?.back || '')))
let  innerWidth =  window.innerWidth

let elNotification = null
let activeNotice = null
let noticeStyle = null

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

watch(() => uiStore.changeNotice, () => {

  const settings = settingStore.settings

  let data = {
    notice: settings.notice,
    noticeWidth: settings.noticeWidth,
    noticeTitle: settings.noticeTitle,
    noticeContent: settings.noticeContent,
    noticeType: settings.noticeType,
    noticeDuration: settings.noticeDuration,
    noticePosition: settings.noticePosition,
    noticeOffset: settings.noticeOffset
  }

  showNotice(data)
})

watch(() => uiStore.changePreview, () => {
  showNotice(uiStore.previewData)
})

watch(locale, () => {
  if (elNotification && activeNotice && isBuiltInNoticeContent(activeNotice.noticeContent)) {
    showNotice(activeNotice)
  }
})

function showNotice(data) {
  elNotification?.close()
  elNotification = null
  activeNotice = null
  if (data.notice === 1) return

  if (!noticeStyle) {
    noticeStyle = document.createElement('style')
    document.head.appendChild(noticeStyle)
  }
  const noticeWidth = Math.max(240, Math.min(720, Number(data.noticeWidth) || 400));
  noticeStyle.textContent = `
  .custom-notice.el-notification {
    --el-notification-width: min(${noticeWidth}px,calc(100% - 30px)) !important;
  }
  `;

  activeNotice = {...data}
  const notification = ElNotification({
    title: data.noticeTitle,
    message: displayNoticeContent(data.noticeContent, t),
    type: data.noticeType === 'none' ? '' : data.noticeType,
    duration: data.noticeDuration,
    position: data.noticePosition,
    offset: data.noticeOffset,
    customClass: 'custom-notice',
    onClose() {
      if (elNotification === notification) {
        elNotification = null
        activeNotice = null
      }
    },
  })
  elNotification = notification
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  elNotification?.close()
  noticeStyle?.remove()
})

const handleResize = () => {
  if (['content','email','send'].includes(route.meta.name)) {
    if (innerWidth !==  window.innerWidth) {
      innerWidth = window.innerWidth;
      uiStore.accountShow = window.innerWidth >= 1440;
    }
  }
}

</script>
<style lang="scss" scoped>

.block-show {
  position: fixed;
  @media (max-width: 767px) {
    position: absolute;
    right: 0;
    border: 0;
    height: 100%;
    width: 100%;
    background: #000000;
    opacity: 0.6;
    z-index: 10;
    transition: all 300ms;
  }
}

.block-hide {
  position: fixed;
  pointer-events: none;
  transition: all 300ms;
}

.show {
  transition: all 100ms;
  @media (max-width: 767px) {
    position: fixed;
    z-index: 100;
    width: 260px;
  }
}

.hide {
  transition: all 100ms;
  position: fixed;
  transform: translateX(-100%);
  opacity: 0;
  @media (max-width: 1024px) {
    width: 260px;
    z-index: 100;
  }
}


.main-box-show {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  height: calc(100% - 60px);
  min-width: 0;
  @media (max-width: 1439px) {
    grid-template-columns: 1fr;
  }
}

.main-box-hide {
  display: grid;
  grid-template-columns: 1fr;
  height: calc(100% - 60px);
  min-width: 0;
}


.main-view {
  min-width: 0;
  background: var(--ui-surface, var(--el-bg-color));
}

.mail-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: var(--ui-surface, var(--el-bg-color));
}

.mail-list-pane,
.mail-reader-pane {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.mail-workspace.is-reading .mail-list-pane {
  display: none;
}

@media (min-width: 1200px) {
  .mail-workspace.is-reading {
    grid-template-columns: minmax(320px, 38%) minmax(0, 1fr);
  }

  .mail-workspace.is-reading .mail-list-pane {
    display: block;
    border-inline-end: 1px solid var(--ui-line, var(--el-border-color));
  }

  .mail-reader-pane {
    background: var(--ui-surface, var(--el-bg-color));
  }
}

@media (max-width: 1439px) {
  .main-box-show > :deep(.show) {
    position: fixed;
    z-index: 100;
    inset-block: 60px 0;
    inset-inline-start: 0;
    width: min(300px, 88vw);
    box-shadow: var(--aside-right-border);
  }
  .main-box-show > .block-show {
    position: fixed;
    z-index: 99;
    inset: 60px 0 0;
    background: rgba(0, 0, 0, .42);
  }
}

@media (max-width: 1199px) {
  .mail-workspace.is-reading .mail-reader-pane {
    display: block;
  }
}


.navigation {
  height: 30px;
  border-bottom: solid 1px var(--el-menu-border-color);
  display: inline-flex;
  justify-items: center;
  align-items: center;
  width: 100%;
  .tag {
    background: var(--el-bg-color);
    margin-left: 5px;
  }
}
</style>
