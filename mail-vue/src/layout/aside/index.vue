<template>
  <el-scrollbar id="mail-sidebar" class="scroll">
    <nav :aria-label="$t('toggleNavigation')">
      <div class="title" >
        <Icon icon="mdi:email-outline" width="24" height="24" aria-hidden="true"/>
        <div>{{settingStore.settings.title}}</div>
      </div>
      <button v-perm="'email:send'" type="button" class="compose-button" @click="uiStore.writerRef?.open()">
        <Icon icon="material-symbols:edit-outline-sharp" width="20" height="20" aria-hidden="true"/>
        <span>{{ $t('sendEmail') }}</span>
      </button>
      <el-menu :collapse="false" :default-active="activeName" text-color="#fff" active-text-color="#fff">
        <el-menu-item @click="router.push({name: 'email'})" index="email"
                      :class="activeName === 'email' ? 'choose-item' : ''">
          <Icon icon="hugeicons:mailbox-01" width="20" height="20" />
          <span class="menu-name">{{$t('inbox')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'send'})" index="send" v-perm="'email:send'"
                      :class="route.meta.name === 'send' ? 'choose-item' : ''">
          <Icon icon="cil:send" width="20" height="20" />
          <span class="menu-name">{{$t('sent')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'draft'})" index="draft" v-perm="'email:send'"
                      :class="route.meta.name === 'draft' ? 'choose-item' : ''">
          <Icon icon="ep:document" width="19" height="19" />
          <span class="menu-name">{{$t('drafts')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'address'})" index="address"
                      :class="route.meta.name === 'address' ? 'choose-item' : ''">
          <Icon icon="solar:notebook-line-duotone" width="20" height="20" />
          <span class="menu-name">{{$t('addressBook')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'star'})" index="star"
                      :class="route.meta.name === 'star' ? 'choose-item' : ''">
          <Icon icon="solar:star-line-duotone" width="20" height="20" />
          <span class="menu-name">{{$t('starred')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'setting'})" index="setting"
                      :class="route.meta.name === 'setting' ? 'choose-item' : ''">
          <Icon icon="fluent:settings-48-regular" width="20" height="20" />
          <span class="menu-name">{{$t('settings')}}</span>
        </el-menu-item>
        <div class="manage-title" v-perm="['all-email:query','user:query','role:query','setting:query','analysis:query','reg-key:query']">
          <div>{{$t('manage')}}</div>
        </div>
        <el-menu-item @click="router.push({name: 'analysis'})" index="analysis" v-perm="'analysis:query'"
                      :class="route.meta.name === 'analysis' ? 'choose-item' : ''">
          <Icon icon="fluent:data-pie-20-regular" width="24" height="24" />
          <span class="menu-name">{{$t('analytics')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'user'})" index="user" v-perm="'user:query'"
                      :class="route.meta.name === 'user' ? 'choose-item' : ''">
          <Icon icon="si:user-alt-2-line" width="20" height="20" />
          <span class="menu-name">{{$t('allUsers')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'all-email'})" index="all-email" v-perm="'all-email:query'"
                      :class="route.meta.name === 'all-email' ? 'choose-item' : ''">
          <Icon icon="fluent:mail-list-28-regular" width="22" height="22" />
          <span class="menu-name">{{$t('allMail')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'role'})" index="role" v-perm="'role:query'"
                      :class="route.meta.name === 'role' ? 'choose-item' : ''">
          <Icon icon="fluent:lock-closed-16-regular" width="22" height="22" />
          <span class="menu-name">{{$t('permissions')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'reg-key'})" index="reg-key" v-perm="'reg-key:query'"
                      :class="route.meta.name === 'reg-key' ? 'choose-item' : ''">
          <Icon icon="fluent:fingerprint-20-filled" width="22" height="22" />
          <span class="menu-name">{{$t('inviteCode')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'sys-setting'})" index="sys-setting" v-perm="'setting:query'"
                      :class="route.meta.name === 'sys-setting' ? 'choose-item' : ''">
          <Icon icon="eos-icons:system-ok-outlined" width="20" height="20" />
          <span class="menu-name">{{$t('SystemSettings')}}</span>
        </el-menu-item>
      </el-menu>
    </nav>
  </el-scrollbar>
</template>

<script setup>
import router from "@/router/index.js";
import { useRoute } from "vue-router";
import {computed} from 'vue';
import {Icon} from "@iconify/vue";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from '@/store/ui.js';
import {useEmailStore} from '@/store/email.js'

const settingStore = useSettingStore();
const route = useRoute();
const uiStore = useUiStore();
const emailStore = useEmailStore()
const activeName = computed(() => route.meta.name === 'content'
  ? emailStore.contentData.sourceRoute || (emailStore.contentData.delType === 'physics' ? 'all-email' : 'email')
  : route.meta.name);

</script>

<style lang="scss" scoped>

.title {
  margin: 10px 14px 24px;
  min-height: 50px;
  display: flex;
  font-size: 17px;
  font-weight: 700;
  align-items: center;
  gap: 10px;
  color: var(--ui-sidebar-ink, #ffffff);
  padding: 0 8px;
  > div {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }
}

.compose-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: calc(100% - 28px);
  min-height: 44px;
  margin: 0 14px 19px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  background: var(--ui-primary, #175cd3);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.compose-button:hover { filter: brightness(1.08); }
.compose-button:focus-visible { outline: 2px solid var(--ui-focus, #8cc4ff); outline-offset: 3px; }

.manage-title {
  margin: 20px 14px 7px;
  padding: 12px 8px 4px;
  border-top: 1px solid rgba(255, 255, 255, .16);
  color: var(--ui-sidebar-ink, #ffffff);
  font-size: 12px;
  font-weight: 700;
  opacity: .78;
}

.el-menu-item {
  display: flex;
  gap: 12px;
  margin: 2px 10px !important;
  border-radius: 8px;
  min-height: 44px;
  height: auto;
  padding: 9px 13px !important;
  line-height: 1.35;
  white-space: normal;
  color: var(--ui-sidebar-ink, #ffffff) !important;
  > svg { flex: 0 0 auto; }
}

.choose-item {
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14) !important;
  box-shadow: inset 3px 0 0 #8cc4ff;
}

.el-menu-item:focus-visible {
  outline: 2px solid var(--ui-focus, #8cc4ff);
  outline-offset: -2px;
}

@media (hover: hover) {
  .el-menu-item:hover {
    background: rgba(255, 255, 255, 0.08) !important;
  }
}

.menu-name {
  user-select: none;
  min-width: 0;
  overflow-wrap: anywhere;
}


:deep(.el-scrollbar__wrap--hidden-default ) {
  background: var(--ui-sidebar, var(--aside-backgound)) !important;
}

:deep(.el-menu-item) {
  background: var(--ui-sidebar, var(--aside-backgound));
}

:deep(.el-menu) {
  background: var(--ui-sidebar, var(--aside-backgound));
}

.el-menu {
  border-right: 0;
  width: 240px;
  padding-bottom: 20px;
}

:deep(.el-divider__text) {
  background: var(--ui-sidebar, var(--aside-backgound));
  color: #FFFFFF;
}

.scroll {
  height: 100%;
  background: var(--ui-sidebar, var(--aside-backgound));
}

:global([dir="rtl"] .choose-item) { box-shadow: inset -3px 0 0 #8cc4ff; }
</style>
