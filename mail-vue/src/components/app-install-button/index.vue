<template>
  <button v-if="!installed" class="app-install-button" :class="{compact}" type="button" :title="t('pwa.install')"
          :aria-label="t('pwa.install')" @click="install">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
    <span class="app-install-label">{{ t('pwa.install') }}</span>
  </button>
  <el-dialog v-model="showHelp" :title="t('pwa.install')" width="min(420px, calc(100vw - 32px))"
             append-to-body align-center>
    <div class="app-install-help">
      <img src="/app-icon-192.png" alt="" width="56" height="56" />
      <p>{{ installHelp }}</p>
      <p>{{ t(`pwa.install${platform}`) }}</p>
    </div>
    <template #footer>
      <el-button type="primary" @click="showHelp = false">{{ t('pwa.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRoute} from 'vue-router'
import {installed, installPlatform, requestInstall} from '@/pwa/install.js'

defineProps({compact: {type: Boolean, default: false}})
const {t} = useI18n()
const route = useRoute()
const showHelp = ref(false)
const platform = installPlatform()
const installHelp = computed(() => route.name === 'find'
  ? t('pwa.installHelpTemporary')
  : t('pwa.installHelp'))

async function install() {
  try {
    const result = await requestInstall()
    if (result !== 'accepted') showHelp.value = true
  } catch (_) {
    showHelp.value = true
  }
}
</script>

<style scoped>
.app-install-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 11px;
  border: 1px solid var(--language-control-border, var(--el-border-color));
  border-radius: 9px;
  background: var(--language-control-bg, var(--el-fill-color-blank));
  color: var(--language-control-text, var(--el-text-color-primary));
  cursor: pointer;
  white-space: nowrap;
}
.app-install-button:hover { border-color: var(--el-color-primary); color: var(--el-color-primary); }
.app-install-button:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
.app-install-button.compact { width: 34px; min-height: 34px; padding: 0; border: 0; }
.app-install-button.compact .app-install-label { display: none; }
.app-install-help { display: grid; gap: 14px; line-height: 1.6; }
.app-install-help img { border-radius: 12px; }
@media (max-width: 480px) {
  .app-install-button:not(.compact) { width: 44px; padding: 0; }
  .app-install-button:not(.compact) .app-install-label { display: none; }
}
</style>
