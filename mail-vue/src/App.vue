<template>
  <el-config-provider :locale="componentLocales[settingStore.lang]">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { watch } from "vue";
import {useSettingStore} from "@/store/setting.js";
const settingStore = useSettingStore()
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import zhTw from 'element-plus/es/locale/lang/zh-tw';
import en from 'element-plus/es/locale/lang/en';
import {htmlLanguages} from '@/i18n/locale.js';
const componentLocales = {zh: zhCn, 'zh-TW': zhTw, en};
import('@/icons/index.js')
const { locale } = useI18n()
watch(() => settingStore.lang, lang => {
  locale.value = lang
  document.documentElement.lang = htmlLanguages[lang] || 'en'
}, {immediate: true})
</script>
