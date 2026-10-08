<template>
  <div class="addr-page">
    <div class="addr-toolbar">
      <el-input v-model="keyword" :placeholder="t('searchAddressesPlaceholder')" clearable
                @keyup.enter="load(1)" @clear="load(1)">
        <template #append>
          <el-button @click="load(1)">
            <Icon icon="iconoir:search" width="16" height="16"/>
          </el-button>
        </template>
      </el-input>
      <span class="addr-hint">{{ t('addressHistoryHint') }}</span>
    </div>

    <el-table :data="rows" v-loading="loading" class="addr-table"
              :empty-text="t('addressHistoryEmpty')">
      <el-table-column :label="t('account')" min-width="230">
        <template #default="{ row }">
          <span class="addr-email" @click="copy(row.toEmail)">{{ row.toEmail }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="t('platform')" min-width="140">
        <template #default="{ row }">{{ platformOf(row.lastSender) }}</template>
      </el-table-column>
      <el-table-column :label="t('latestCode')" min-width="120">
        <template #default="{ row }">
          <span v-if="row.lastCode" class="addr-code" @click="copy(row.lastCode)">{{ row.lastCode }}</span>
          <span v-else class="addr-dim">—</span>
        </template>
      </el-table-column>
      <el-table-column :label="t('received')" width="100" align="right">
        <template #default="{ row }">{{ row.mailCount }}</template>
      </el-table-column>
      <el-table-column :label="t('firstSeen')" min-width="130">
        <template #default="{ row }"><span class="addr-dim">{{ fmt(row.firstTime) }}</span></template>
      </el-table-column>
      <el-table-column :label="t('lastSeen')" min-width="130">
        <template #default="{ row }"><span class="addr-dim">{{ fmt(row.lastTime) }}</span></template>
      </el-table-column>
      <el-table-column label="" width="140" align="right">
        <template #default="{ row }">
          <el-button size="small" text @click="copy(row.toEmail)">{{ t('copy') }}</el-button>
          <el-button v-if="!row.accountId" v-perm="'account:add'" size="small" type="primary" text
                     :loading="claiming === row.toEmail" @click="claim(row)">{{ t('claimAddress') }}
          </el-button>
          <span v-else class="addr-owned">{{ t('claimedAddress') }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="addr-more" v-if="hasMore">
      <el-button :loading="loading" @click="load(page + 1)">{{ t('loadMore') }}</el-button>
    </div>
  </div>
</template>

<script setup>
import {defineOptions, onMounted, ref} from "vue";
import {Icon} from "@iconify/vue";
import {ElMessage} from "element-plus";
import {emailAddresses} from "@/request/email.js";
import {accountAdd} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useSettingStore} from '@/store/setting.js';
import {useI18n} from 'vue-i18n';
import {intlLanguage, resolveLanguage} from '@/i18n/languages.js';
import {tzDayjs} from '@/utils/day.js';
import {requestErrorMessage} from '@/utils/request-error.js';

defineOptions({
  name: 'address'
})

const SIZE = 30

const accountStore = useAccountStore()
const settingStore = useSettingStore()
const {t} = useI18n()
const rows = ref([])
const keyword = ref('')
const loading = ref(false)
const page = ref(1)
const hasMore = ref(false)
const claiming = ref('')

onMounted(() => load(1))

async function load(p) {
  loading.value = true
  try {
    const list = await emailAddresses(keyword.value, p, SIZE) || []
    rows.value = p === 1 ? list : rows.value.concat(list)
    page.value = p
    hasMore.value = list.length === SIZE
  } catch (e) {
    ElMessage({message: requestErrorMessage(e, 'loadFailed', t), type: 'error', plain: true})
  } finally {
    loading.value = false
  }
}

// 从发件域名推平台：noreply@github.com → github.com。
// 用 SendGrid/Mailgun 代发的推不准，那种只能看主题认。
function platformOf(sender) {
  if (!sender) return '—'
  const domain = String(sender).split('@')[1] || ''
  return domain.replace(/^(mail|email|mailer|noreply|no-reply|smtp|mg|em|notifications?)\./i, '') || '—'
}

function fmt(value) {
  return value ? new Intl.DateTimeFormat(intlLanguage(resolveLanguage(settingStore.lang)), {
    dateStyle: 'short', timeStyle: 'short',
  }).format(tzDayjs(value).toDate()) : '—'
}

async function copy(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage({message: t('copiedValue', {value: text}), type: 'success', plain: true})
  } catch {
    ElMessage({message: t('copyBlocked'), type: 'error', plain: true})
  }
}

// 收编：建成正式邮箱。后端的 claimNoOne 会把这个地址之前收到的信一并归进去
async function claim(row) {
  if (claiming.value) return
  claiming.value = row.toEmail
  try {
    const account = await accountAdd(row.toEmail, '', {noMsg: true})
    row.accountId = account.accountId
    accountStore.newAccountSignal++
    ElMessage({message: t('claimedWithHistory', {value: row.toEmail}), type: 'success', plain: true})
  } catch (e) {
    ElMessage({message: requestErrorMessage(e, 'claimFailed', t), type: 'error', plain: true})
  } finally {
    claiming.value = ''
  }
}
</script>

<style scoped>
.addr-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 14px 16px;
  gap: 12px;
}

.addr-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.addr-toolbar .el-input {
  max-width: 340px;
}

.addr-hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.addr-table {
  flex: 1;
  min-height: 0;
}

.addr-email {
  font-weight: 500;
  cursor: pointer;
  word-break: break-all;
}

.addr-email:hover {
  color: var(--el-color-primary);
}

.addr-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 600;
  letter-spacing: .05em;
  color: var(--el-color-primary);
  cursor: pointer;
}

.addr-dim {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.addr-owned {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  padding-right: 8px;
}

.addr-more {
  flex-shrink: 0;
  text-align: center;
}
</style>
