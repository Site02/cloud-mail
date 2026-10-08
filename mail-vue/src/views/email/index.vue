<template>
  <emailScroll ref="scroll"
               :cancel-success="cancelStar"
               :star-success="addStar"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :star-add="starAdd"
               :star-cancel="starCancel"
               :time-sort="params.timeSort"
               :email-read="emailRead"
               :show-unread="true"
               actionLeft="4px"
               @jump="jumpContent"
  >
    <template #header>
      <div class="temp-addr">
        <div class="temp-addr-label">{{ t('temporaryAddressHint') }}</div>
        <div class="temp-addr-row">
          <Icon class="temp-addr-icon" icon="eva:email-outline" width="22" height="22"/>
          <button type="button" class="temp-addr-text" :class="tempAddr ? '' : 'is-empty'"
                  :disabled="!tempAddr || randomLoading" :aria-label="t('copy')" @click="copyTemp">
            {{ tempAddr || t('generatingAddress') }}
          </button>
          <el-button type="primary" :disabled="!tempAddr" @click="copyTemp">
            <Icon icon="fluent:copy-24-regular" width="16" height="16" style="margin-right: 5px"/>
            {{ t('copy') }}
          </el-button>
          <el-button v-perm="'account:add'" :loading="randomLoading" :title="t('newAddress')" :aria-label="t('newAddress')" @click="newTempAddr">
            <Icon v-if="!randomLoading" icon="mingcute:refresh-2-line" width="16" height="16"/>
          </el-button>
        </div>
      </div>
    </template>

    <template #first>
      <button type="button" class="sort-button" :title="t('order')" :aria-label="t('order')"
              :aria-pressed="params.timeSort === 1" @click="changeTimeSort">
        <Icon :icon="params.timeSort === 0 ? 'material-symbols-light:timer-arrow-down-outline' : 'material-symbols-light:timer-arrow-up-outline'"
              width="25" height="25" aria-hidden="true"/>
      </button>
    </template>

  </emailScroll>
</template>

<script setup>
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {useSettingStore} from "@/store/setting.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {emailList, emailDelete, emailLatest, emailRead} from "@/request/email.js";
import {starAdd, starCancel} from "@/request/star.js";
import {defineOptions, h, onMounted, onUnmounted, nextTick, reactive, ref, watch} from "vue";
import {sleep} from "@/utils/time-utils.js";
import {canPollMail, mailPollingDelay} from '@/utils/mail-recovery.js'
import router from "@/router/index.js";
import {Icon} from "@iconify/vue";
import { useRoute } from 'vue-router'
import {accountAdd} from "@/request/account.js";
import {ElMessage} from "element-plus";
import {useI18n} from 'vue-i18n';
import {requestErrorMessage} from '@/utils/request-error.js';

defineOptions({
  name: 'email'
})

const route = useRoute();
const {t} = useI18n();
const emailStore = useEmailStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const scroll = ref({})
const params = reactive({
  timeSort: 0,
})
let disposed = false
let lastOpenedRow = null
let lastOpenedEmailId = null

onMounted(() => {
  emailStore.emailScroll = scroll;
  latest()
  initTempAddr()
})

onUnmounted(() => {
  disposed = true
  lastOpenedRow = null
  lastOpenedEmailId = null
})

watch(() => route.name, (name, previousName) => {
  if (name === 'email' && previousName === 'content') {
    nextTick(() => {
      const rowButtons = scroll.value?.$el?.querySelectorAll('.row-open-action[data-email-id]') || []
      const currentRow = Array.from(rowButtons).find(button => button.dataset.emailId === String(lastOpenedEmailId))
      const target = currentRow || (lastOpenedRow?.isConnected ? lastOpenedRow : null)
      target?.focus()
    })
  }
})


watch(() => accountStore.currentAccountId, () => {
  scroll.value.refreshList();
})

const TEMP_ADDR_KEY = 'tempAddr'
const TEMP_SAVED_KEY = 'tempAddrSaved'

const tempAddr = ref('')      // 显示的候选地址，未必已经建号
const tempSaved = ref(false)  // 是否已在后端建成邮箱
const randomLoading = ref(false)

// 只生成字符串，不碰后端。没被复制过的地址就是个候选，不该占数据库和配额。
// 字符集去掉 0/1/i/l/o，手抄不会认错；用 crypto 而非 Math.random，地址可猜就会招垃圾邮件
function genTempAddr() {
  const domain = settingStore.domainList?.[0]
  if (!domain) return false

  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const buf = new Uint32Array(10)
  crypto.getRandomValues(buf)
  tempAddr.value = Array.from(buf, n => chars[n % chars.length]).join('') + domain
  tempSaved.value = false

  try {
    localStorage.setItem(TEMP_ADDR_KEY, tempAddr.value)
    localStorage.setItem(TEMP_SAVED_KEY, '0')
  } catch { /* 隐私模式存不下就算了 */ }
  return true
}

function initTempAddr() {
  let saved = '', savedFlag = '0'
  try {
    saved = localStorage.getItem(TEMP_ADDR_KEY) || ''
    savedFlag = localStorage.getItem(TEMP_SAVED_KEY) || '0'
  } catch { /* 读不到就当没有 */ }

  if (saved) {
    tempAddr.value = saved
    tempSaved.value = savedFlag === '1'
    return
  }
  genTempAddr()
}

function newTempAddr() {
  if (!genTempAddr()) {
    ElMessage({message: t('noAvailableDomain'), type: 'error', plain: true})
  }
}

// 复制 = 打算用它，到这一步才真的建邮箱，收到的信才能进收件箱
async function copyTemp() {
  if (!tempAddr.value || randomLoading.value) return

  if (!tempSaved.value) {
    randomLoading.value = true
    try {
      const account = await accountAdd(tempAddr.value, '', {noMsg: true})
      tempSaved.value = true
      try { localStorage.setItem(TEMP_SAVED_KEY, '1') } catch { /* 忽略 */ }
      accountStore.newAccountSignal++
    } catch (e) {
      ElMessage({message: requestErrorMessage(e, 'mailboxCreateFailed', t), type: 'error', plain: true})
      return
    } finally {
      randomLoading.value = false
    }
  }

  try {
    await navigator.clipboard.writeText(tempAddr.value)
    ElMessage({message: t('copiedValue', {value: tempAddr.value}), type: 'success', plain: true})
  } catch {
    ElMessage({message: t('mailboxCreatedCopyBlocked'), type: 'error', plain: true})
  }
}

function changeTimeSort() {
  params.timeSort = params.timeSort ? 0 : 1
  scroll.value.refreshList();
}

function jumpContent(email) {
  emailStore.contentData.sourceRoute = 'email'
  lastOpenedRow = document.activeElement instanceof HTMLElement ? document.activeElement : null
  lastOpenedEmailId = email?.emailId
  emailStore.contentData.email = emailStore.toContentEmail(email)
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showUnread = true
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  router.push('/mail')
}

const existIds = new Set();

async function latest() {
  let failures = 0
  while (!disposed) {

    let autoRefresh = settingStore.settings.autoRefresh;
    await sleep(mailPollingDelay(autoRefresh, failures));

    if (disposed) break

    if (!canPollMail({active: route.name === 'email', hidden: document.hidden, disposed})) {
      continue;
    }

    const latestId = scroll.value.latestEmail?.emailId

    if (!scroll.value.firstLoad && autoRefresh > 1) {
      try {
        const accountId = accountStore.currentAccountId
        const allReceive = scroll.value.latestEmail?.allReceive
        const curTimeSort = params.timeSort
        let list = []

        //确保发起请求时最后一个邮件是当前账号的,或者
        if (accountId === scroll.value.latestEmail?.reqAccountId) {
          list = await emailLatest(latestId, accountId, allReceive);
          failures = 0
        }

        //确保请求回来后，账号没有切换，时间排序没有改变，全部邮件类型没变
        if (canPollMail({active: route.name === 'email', hidden: document.hidden, disposed}) && accountId === accountStore.currentAccountId && params.timeSort === curTimeSort && allReceive === accountStore.currentAccount.allReceive) {
          if (list.length > 0) {
            emailStore.applyFullList(list)

            for (let email of list) {

              email.reqAccountId = accountId;
              email.allReceive = allReceive;

              if (!existIds.has(email.emailId)) {

                existIds.add(email.emailId)
                scroll.value.addItem(email)

                await sleep(50)
              }

            }

          }

        }
      } catch (e) {
        failures += 1
        if (e.code === 401 || e.code === 403) {
          settingStore.settings.autoRefresh = 0;
        }
        console.error(e)
      }
    }
  }
}

function addStar(email) {
  emailStore.starScroll?.addItem(email)
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId])
}

function getEmailList(emailId, size) {
  const accountId =  accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  return emailStore.fetchList(full =>
    emailList(accountId, allReceive, emailId, params.timeSort, size, 0, full)
  ).then(data => {
    data.latestEmail.reqAccountId = accountId;
    data.latestEmail.allReceive = allReceive;
    return data;
  })
}

</script>
<style>
.icon {
  cursor: pointer;
}

.temp-addr {
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.temp-addr-label {
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--el-text-color-placeholder);
  margin-bottom: 8px;
}

.temp-addr-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
}

.temp-addr-row > .el-button {
  flex: 0 0 auto;
}

.temp-addr-icon {
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.temp-addr-text {
  flex: 1;
  min-width: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: .01em;
  color: var(--el-text-color-primary);
  cursor: pointer;
  border: 0;
  padding: 0;
  background: transparent;
  text-align: start;
  direction: ltr;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.temp-addr-text:focus-visible,
.sort-button:focus-visible {
  outline: 2px solid var(--ui-focus, var(--el-color-primary));
  outline-offset: 3px;
  border-radius: 4px;
}

.sort-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ui-ink, var(--el-text-color-primary));
  cursor: pointer;
}

.sort-button:hover {
  background: var(--ui-surface-alt, var(--el-fill-color-light));
}

.temp-addr-text.is-empty {
  color: var(--el-text-color-placeholder);
  font-weight: 400;
  cursor: default;
}

@media (max-width: 767px) {
  .temp-addr-row {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .temp-addr-icon {
    grid-column: 1;
    grid-row: 1;
  }

  .temp-addr-text {
    font-size: 15px;
    grid-column: 2 / 4;
    grid-row: 1;
  }

  .temp-addr-row > .el-button:not(:last-child) {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
  }

  .temp-addr-row > .el-button:last-child {
    grid-column: 3;
    grid-row: 2;
  }
}
</style>
