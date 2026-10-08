<template>
  <el-container class="layout">
    <el-aside
        class="aside"
        :inert="!uiStore.asideShow"
        :aria-hidden="!uiStore.asideShow"
        :class="uiStore.asideShow ? 'aside-show' : 'el-aside-hide'">
      <Aside />
    </el-aside>
    <div
        :class="(uiStore.asideShow && isMobile)? 'overlay-show':'overlay-hide'"
        aria-hidden="true"
        @click="uiStore.asideShow = false"
    ></div>
    <el-container class="main-container" :inert="isMobile && uiStore.asideShow">
      <el-main>
        <el-header>
            <Header />
        </el-header>
        <Main />
      </el-main>
    </el-container>
  </el-container>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import {useUiStore} from "@/store/ui.js";
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore();
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)
const drawerFocusSelector = 'button:not([disabled]), a[href], [role="menuitem"]:not([aria-disabled="true"]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

function drawerFocusables() {
  const aside = document.querySelector('.layout .aside')
  return Array.from(aside?.querySelectorAll(drawerFocusSelector) || [])
    .filter(element => element instanceof HTMLElement && element.getClientRects().length > 0)
}

watch(() => [uiStore.asideShow, isMobile.value], ([open, mobile], [previousOpen]) => {
  if (!mobile || open === previousOpen) return
  nextTick(() => {
    if (open) drawerFocusables()[0]?.focus()
    else document.querySelector('.menu-toggle')?.focus()
  })
})
const handleResize = () => {
  const nextIsMobile = window.innerWidth < 1025
  if (nextIsMobile !== isMobile.value) {
    isMobile.value = nextIsMobile
    uiStore.asideShow = !nextIsMobile
  }
}

const handleDrawerKeyDown = (event) => {
  if (!isMobile.value || !uiStore.asideShow) return
  if (event.key === 'Escape') {
    uiStore.asideShow = false
    return
  }
  if (event.key !== 'Tab') return
  const focusables = drawerFocusables()
  if (!focusables.length) return
  const currentIndex = focusables.indexOf(document.activeElement)
  const nextIndex = currentIndex < 0
    ? (event.shiftKey ? focusables.length - 1 : 0)
    : (currentIndex + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length
  event.preventDefault()
  focusables[nextIndex].focus()
}

onMounted(() => {
  uiStore.writerRef = writerRef
  uiStore.asideShow = !isMobile.value
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleDrawerKeyDown, true)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleDrawerKeyDown, true)
})
</script>

<style lang="scss" scoped>
.el-aside-hide {
  position: fixed;
  inset-inline-start: 0;
  height: 100%;
  z-index: 100;
  transform: translateX(-100%);
  transition: all 100ms ease;
}

.aside-show {
  -webkit-box-shadow: var(--aside-right-border);
  box-shadow: var(--aside-right-border);
  transform: translateX(0);
  transition: all 100ms ease;
  z-index: 101;
  @media (max-width: 1025px) {
    position: fixed;
    top: 0;
    inset-inline-start: 0;
    z-index: 101;
    height: 100%;
    background: var(--ui-sidebar, var(--aside-backgound));
  }
}

.el-aside {
  width: auto;
  transition: all 100ms ease;
}

.layout {
  height: 100%;
  position: fixed;
  width: 100%;
  top: 0;
  inset-inline-start: 0;
  overflow: hidden;
  background: var(--ui-bg, var(--el-bg-color));
}

.main-container {
  min-height: 100%;
  min-width: 0;
  background: var(--ui-bg, var(--el-bg-color));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.el-main {
  padding: 0;
  min-width: 0;
  height: 100dvh;
  overflow: hidden;
}

.el-header {
  background: var(--ui-surface, var(--el-bg-color));
  border-bottom: solid 1px var(--ui-line, var(--el-border-color));
  padding: 0 0 0 0;
}

.overlay-show {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  transition: all 0.3s;
}

:global([dir="rtl"] .el-aside-hide) { transform: translateX(100%); }

.overlay-hide {
  display: flex;
  pointer-events: none;
  opacity: 0;
}
</style>
