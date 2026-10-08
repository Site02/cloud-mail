<template>
  <div class="user-box">
    <div class="header-actions">
      <button v-if="hasPerm('user:add')" type="button" class="header-add" @click="openAdd">
        <Icon icon="ion:add-outline" width="20" height="20" aria-hidden="true"/>
        <span>{{ t('addUser') }}</span>
      </button>
      <div class="search">
        <el-input
            v-model="params.email"
            class="search-input"
            :placeholder="$t('searchByEmail')"
            :aria-label="t('searchByEmail')"
            @keyup.enter="search"
        >
        </el-input>
      </div>
      <el-select v-model="params.status" :placeholder="$t('select')" class="status-select">
        <el-option :key="-1" :label="$t('all')" :value="-1"/>
        <el-option :key="0" :label="$t('active')" :value="0"/>
        <el-option :key="1" :label="$t('banned')" :value="1"/>
        <el-option :key="-2" :label="$t('deleted')" :value="-2"/>
      </el-select>
      <button type="button" class="tool-button" :aria-label="t('temporaryInbox.search')" :title="t('temporaryInbox.search')" @click="search">
        <Icon icon="iconoir:search" width="20" height="20" aria-hidden="true"/>
      </button>
      <button type="button" class="tool-button" :aria-label="t('order')" :title="t('order')"
              :aria-pressed="params.timeSort === 1" @click="changeTimeSort">
        <Icon :icon="params.timeSort === 1 ? 'material-symbols-light:timer-arrow-down-outline' : 'material-symbols-light:timer-arrow-up-outline'"
              width="23" height="23" aria-hidden="true"/>
      </button>
      <button type="button" class="tool-button" :aria-label="t('refreshMail')" :title="t('refreshMail')" @click="refresh">
        <Icon icon="ion:reload" width="18" height="18" aria-hidden="true"/>
      </button>
      <button v-if="hasPerm('user:delete') && !phonePageShow" type="button" class="tool-button destructive"
              :disabled="!selectedUsers.length" :aria-label="t('deleteUser')" :title="t('deleteUser')" @click="delUser">
        <Icon icon="uiw:delete" width="16" height="16" aria-hidden="true"/>
      </button>
    </div>
    <el-scrollbar ref="scrollbarRef" class="scrollbar">
      <div>
        <div v-if="loadError" class="load-error" role="alert">
          <span>{{ t('reqFailErrorMsg') }}</span>
          <button type="button" @click="getUserList()">{{ t('pwa.retry') }}</button>
        </div>
        <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'"
             :style="first ? 'background: transparent' : ''">
          <loading/>
        </div>
        <el-table v-if="!phonePageShow"
            @filter-change="tableFilter"
            @selection-change="onSelectionChange"
            :empty-text="first ? '' : null"
            :data="users"
            :preserve-expanded-content="preserveExpanded"
            style="width: 100%;"
            ref="tableRef"
            @cell-contextmenu="handleContextmenu"
            :cell-class-name="cellClassName"
        >
          <el-table-column :width="expandWidth" type="selection" :selectable="row => row.type !== 0" />
          <el-table-column show-overflow-tooltip :tooltip-formatter="tableRowFormatter" :label="$t('tabEmailAddress')"
                           :min-width="emailWidth">
            <template #default="props">
              <div style="display: flex;gap: 5px;align-items: center">
                <div class="email-row">{{ props.row.email }}</div>
                <template v-if="oauthPlatform(props.row)">
                  <el-avatar v-if="oauthPlatform(props.row).iconType === 'image'"
                             :src="oauthPlatform(props.row).icon"
                             :size="16"
                             class="oauth-platform-icon"/>
                  <Icon v-else
                        :icon="oauthPlatform(props.row).icon"
                        width="16"
                        height="16"
                        class="oauth-platform-icon"/>
                </template>
              </div>
            </template>
          </el-table-column>
          <el-table-column :formatter="formatterReceive" label-class-name="receive" column-key="receive"
                           :filtered-value="filteredValue" :filters="filters" :width="receiveWidth"
                           :label="$t('tabReceived')"
                           prop="receiveEmailCount"/>
          <el-table-column :formatter="formatterSend" label-class-name="send" column-key="send"
                           :filtered-value="filteredValue" :filters="filters" v-if="sendNumShow" :label="$t('tabSent')"
                           prop="sendEmailCount"/>
          <el-table-column :formatter="formatterAccount" label-class-name="account" column-key="account"
                           :filtered-value="filteredValue" :filters="filters" v-if="accountNumShow"
                           :label="$t('tabMailboxes')"
                           prop="accountCount"/>
          <el-table-column v-if="createTimeShow" :label="$t('tabRegisteredAt')" min-width="160" prop="createTime">
            <template #default="props">
              {{ formatUserDate(props.row.createTime, true) }}
            </template>
          </el-table-column>
          <el-table-column v-if="statusShow" min-width="60px" :label="$t('tabStatus')" prop="status">
            <template #default="props">
              <el-tag disable-transitions v-if="props.row.isDel === 1" type="info">{{ $t('deleted') }}</el-tag>
              <el-tag disable-transitions v-else-if="props.row.status === 0" type="primary">{{ $t('active') }}</el-tag>
              <el-tag disable-transitions v-else-if="props.row.status === 1" type="danger">{{ $t('banned') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="typeShow" :label="$t('tabRole')" min-width="140" prop="type">
            <template #default="props">
              <div class="type">
                {{ toRoleName(props.row.type) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('tabSetting')" :width="settingWidth">
            <template #default="props">
              <el-button size="small" type="primary" v-if="(props.row.type === 0 && userStore.user.type !== 0)" >{{ $t('action') }}</el-button>
              <el-dropdown v-else >
                <el-button size="small" type="primary">{{ $t('action') }}</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="hasPerm('user:set-pwd')" @click="openSetPwd(props.row)">{{ $t('chgPwd') }}</el-dropdown-item>
                    <el-dropdown-item v-if="hasPerm('user:set-type')" @click="openSetType(props.row)">{{ $t('perm') }}</el-dropdown-item>
                    <template v-if="props.row.type !== 0 && hasPerm('user:set-status')">
                      <el-dropdown-item v-if="props.row.isDel !== 1" @click="setStatus(props.row)">
                        {{ setStatusName(props.row) }}
                      </el-dropdown-item>
                      <el-dropdown-item v-else @click="restore(props.row)">{{ $t('restore') }}</el-dropdown-item>
                    </template>
                    <el-dropdown-item @click="openAccountList(props.row.userId)" >{{ $t('account') }}</el-dropdown-item>
                    <el-dropdown-item @click="openDetails(props.row)" >{{ $t('details') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="mobile-user-list">
          <article v-for="row in users" :key="row.userId" class="mobile-user-card">
            <div class="mobile-user-primary">
              <strong dir="ltr">{{ row.email }}</strong>
              <el-tag v-if="row.isDel === 1" type="info">{{ t('deleted') }}</el-tag>
              <el-tag v-else-if="row.status === 0" type="primary">{{ t('active') }}</el-tag>
              <el-tag v-else type="danger">{{ t('banned') }}</el-tag>
            </div>
            <div class="mobile-user-meta">{{ t('tabRole') }}: {{ toRoleName(row.type) }}</div>
            <div class="mobile-user-actions">
              <el-button @click="openDetails(row)">{{ t('details') }}</el-button>
              <el-dropdown v-if="!(row.type === 0 && userStore.user.type !== 0)" trigger="click">
                <el-button>{{ t('action') }}</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="hasPerm('user:set-pwd')" @click="openSetPwd(row)">{{ t('chgPwd') }}</el-dropdown-item>
                    <el-dropdown-item v-if="hasPerm('user:set-type')" @click="openSetType(row)">{{ t('perm') }}</el-dropdown-item>
                    <el-dropdown-item v-if="row.type !== 0 && row.isDel !== 1 && hasPerm('user:set-status')" @click="setStatus(row)">{{ setStatusName(row) }}</el-dropdown-item>
                    <el-dropdown-item v-if="row.type !== 0 && row.isDel === 1 && hasPerm('user:set-status')" @click="restore(row)">{{ t('restore') }}</el-dropdown-item>
                    <el-dropdown-item @click="openAccountList(row.userId)">{{ t('account') }}</el-dropdown-item>
                    <el-dropdown-item v-if="row.type !== 0 && hasPerm('user:delete')" @click="delOneUser(row)">{{ t('delete') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </article>
          <el-empty v-if="!users.length && !tableLoading && !loadError" :description="t('noMessagesFound')"/>
        </div>
        <div class="pagination" v-if="total > 10">
          <el-pagination
              :size="pageSize"
              :current-page="params.num"
              :page-size="params.size"
              :pager-count="pagerCount"
              :page-sizes="[10, 15, 20, 25, 30, 50]"
              background
              :layout="layout"
              :total="total"
              @size-change="sizeChange"
              @current-change="numChange"
          />
          <el-pagination
              v-if="phonePageShow"
              :size="pageSize"
              :current-page="params.num"
              :page-size="params.size"
              :pager-count="pagerCount"
              :page-sizes="[10, 15, 20, 25, 30, 50]"
              background
              layout="sizes, total"
              :total="total"
              @size-change="sizeChange"
              @current-change="numChange"
          />
        </div>
      </div>
    </el-scrollbar>
    <el-dialog class="dialog" v-model="setPwdShow" :title="$t('changePassword')" @closed="resetUserForm">
      <div class="dialog-box">
        <el-input v-model="userForm.password" type="password" :placeholder="$t('newPassword')" autocomplete="off" @keyup.enter="updatePwd">
        </el-input>
        <el-button class="btn" type="primary" :loading="settingLoading" @click="updatePwd"
        >{{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog class="dialog" v-model="setTypeShow" :title="$t('changePerm')" @closed="resetUserForm">
      <div class="dialog-box">
        <el-input disabled :model-value="$t('admin')" v-if="userForm.type === 0"/>
        <el-select v-else v-model="userForm.type" :placeholder="$t('select')">
          <el-option v-for="item in roleList" :label="displayRoleName(item, t)" :value="item.roleId" :key="item.roleId"/>
        </el-select>
        <el-button :disabled="userForm.type === 0" class="btn" :loading="settingLoading" type="primary" @click="setType"
        >{{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog v-model="showAdd" :title="$t('addUser')" @closed="resetAddForm">
      <div class="container">
        <el-input v-model="addForm.email" type="text" :placeholder="$t('emailAccount')" autocomplete="off" @keyup.enter="submit">
          <template #append>
            <div @click.stop="openSelect">
              <div inert>
                <el-select
                    ref="mySelect"
                    v-model="addForm.suffix"
                    :placeholder="$t('select')"
                    class="select"
                >
                  <el-option
                      v-for="item in domainList"
                      :key="item"
                      :label="item"
                      :value="item"
                  />
                </el-select>
              </div>
              <div>
                <span>{{ addForm.suffix }}</span>
                <Icon class="setting-icon" icon="mingcute:down-small-fill" width="20" height="20"/>
              </div>
            </div>
          </template>
        </el-input>
        <el-input type="password" v-model="addForm.password" :placeholder="$t('password')" @keyup.enter="submit"/>
        <el-select v-model="addForm.type" :placeholder="$t('perm')">
          <el-option v-for="item in roleList" :label="displayRoleName(item, t)" :value="item.roleId" :key="item.roleId"/>
        </el-select>
        <el-button class="btn" type="primary" @click="submit" :loading="addLoading"
        >{{ $t('add') }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog class="account-dialog" v-model="accountShow" :title="t('userAccount')" @closed="resetAccountList" >
      <el-table :data="accountList" style="height: 480px" v-loading="accountLoading" element-loading-background="transparent" :empty-text="accountLoading ? '' : null">
        <el-table-column property="email" :label="t('emailAccount')" >
          <template #default="props">
            <div class="email-row">{{ props.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column property="address" :label="t('tabStatus')" min-width="105" >
          <template #default="props">
            <el-tag type="primary" disable-transitions v-if="props.row.isDel === 0">{{$t('active')}}</el-tag>
            <el-tag type="info" disable-transitions v-if="props.row.isDel === 1">{{$t('deleted')}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('action')" min-width="105" >
          <template #default="props">
            <el-dropdown trigger="click">
              <el-button type="primary" size="small">{{t('action')}}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="deleteAccount(props.row)">{{ $t('delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <div class="account-pagination">
        <el-pagination
            :disabled="accountLoading"
            background

            layout="prev, pager, next"
            :pager-count="3"
            :total="accountParams.total"
            @current-change="accountCurChange"
        />
      </div>
    </el-dialog>
    <el-dialog class="account-dialog" v-model="detailsShow" :title="t('userDetails')"  >
      <div class="details">
        <div v-if="userDetails.platform || userDetails.username" class="oauth-details">
          <el-avatar :src="userDetails.avatar" :size="30" class="oauth-avatar"/>
          <span>{{ $t('username') }}：{{ userDetails.username }}</span>
          <span v-if="userDetails.trustLevel != null">
            {{ $t('trustLevel') }}：<el-tag type="success">{{ userDetails.trustLevel }}</el-tag>
          </span>
        </div>
        <div v-if="!sendNumShow"><span
            class="details-item-title">{{ $t('tabSent') }}:</span>{{ userDetails.sendEmailCount }}
        </div>
        <div v-if="!accountNumShow"><span class="details-item-title">{{ $t('tabMailboxes') }}:</span>{{
            userDetails.accountCount
          }}
        </div>
        <div v-if="!createTimeShow"><span class="details-item-title">{{ $t('tabRegisteredAt') }}:</span>{{
            formatUserDate(userDetails.createTime, true)
          }}
        </div>
        <div v-if="!typeShow"><span class="details-item-title">{{ $t('perm') }}:</span>
          {{ toRoleName(userDetails.type) }}
        </div>
        <div v-if="!statusShow">
          <span class="details-item-title">{{ $t('tabStatus') }}:</span>
          <el-tag disable-transitions v-if="userDetails.isDel === 1" type="info">{{ $t('deleted') }}</el-tag>
          <el-tag disable-transitions v-else-if="userDetails.status === 0" type="primary">{{ $t('active') }}
          </el-tag>
          <el-tag disable-transitions v-else-if="userDetails.status === 1" type="danger">{{ $t('banned') }}
          </el-tag>
        </div>
        <div><span class="details-item-title">{{ $t('registrationIp') }}:</span>{{
            userDetails.createIp || $t('unknown')
          }}
        </div>
        <div><span class="details-item-title">{{ $t('recentIP') }}:</span>{{
            userDetails.activeIp || $t('unknown')
          }}
        </div>
        <div><span class="details-item-title">{{ $t('recentActivity') }}:</span>{{
            userDetails.activeTime ? formatUserDate(userDetails.activeTime) : $t('unknown')
          }}
        </div>
        <div><span
            class="details-item-title">{{ $t('loginDevice') }}:</span>{{ userDetails.device || $t('unknown') }}
        </div>
        <div><span class="details-item-title">{{ $t('loginSystem') }}:</span>{{ userDetails.os || $t('unknown') }}
        </div>
        <div><span
            class="details-item-title">{{ $t('browserLogin') }}:</span>{{ userDetails.browser || $t('unknown') }}
        </div>
        <div>
          <span class="details-item-title">{{ $t('sendEmail') }}:</span>
          <span>{{ formatSendCount(userDetails) }}</span>
          <el-tag style="margin-left: 10px" v-if="userDetails.sendAction.hasPerm">
            {{ formatSendType(userDetails) }}
          </el-tag>
          <el-button size="small" style="margin-left: 10px"
                     v-if="userDetails.sendAction.hasPerm && userDetails.sendAction.sendCount"
                     @click="resetSendCount(userDetails)" type="primary">{{ $t('reset') }}
          </el-button>
        </div>
      </div>
    </el-dialog>
    <el-dropdown
        :show-timeout="0"
        :hide-timeout="0"
        ref="dropdownRef"
        @visible-change="visibleChange"
        :virtual-ref="triggerRef"
        :show-arrow="false"
        :popper-options="{
      modifiers: [{ name: 'offset', options: { offset: [0, 0] } }],
    }"
        virtual-triggering
        trigger="contextmenu"
        placement="bottom-start"
    >
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="hasPerm('user:set-pwd')" @click="openSetPwd(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item">
                <icon icon="fluent:fingerprint-20-filled" width="22" height="22" />
                <span>{{t('changePassword')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="hasPerm('user:set-type')" @click="openSetType(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item">
                <icon icon="fluent:lock-closed-16-regular" width="21" height="21" />
                <span>{{ t('setRole') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="rightClickUser.type !== 0 && hasPerm('user:set-status')">
            <template #default>
              <div class="right-dropdown-item" v-if="rightClickUser.isDel !== 1" @click="setStatus(rightClickUser)" >
                <Icon icon="ion:reload" v-if="rightClickUser.status" style="margin-left: 1px;margin-right: 1px" width="19" height="19" />
                <Icon icon="ion:ban-outline" v-else style="margin-left: 1px;margin-right: 1px" width="19" height="19" />
                <span>{{ setRightStatusName(rightClickUser) }}</span>
              </div>
              <div class="right-dropdown-item" v-else @click="restore(rightClickUser)">
                <Icon icon="ion:reload" style="margin-left: 1px;margin-right: 1px" width="19" height="19" />
                <span>{{ t('restoreUser') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openAccountList(rightClickUser.userId)" >
            <template #default>
              <div class="right-dropdown-item" >
                <Icon icon="hugeicons:mailbox-01" width="20" height="20" />
                <span>{{ t('userEmail') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openDetails(rightClickUser)" >
            <template #default>
              <div class="right-dropdown-item" >
                <Icon icon="si:user-alt-2-line" width="20" height="20" />
                <span>{{ t('userDetails') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="rightClickUser.type !== 0 && hasPerm('user:delete')" @click="delOneUser(rightClickUser)" >
            <template #default>
              <div class="right-dropdown-item" >
                <Icon icon="uiw:delete" width="18" height="18" style="margin-left: 1px;margin-right: 1px" />
                <span>{{ t('adminDeleteUser') }}</span>
              </div>
            </template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import {computed, defineOptions, h, onActivated, onDeactivated, onUnmounted, reactive, ref, watch} from 'vue'
import {
  userList,
  userDelete,
  userSetPwd,
  userSetStatus,
  userSetType,
  userAdd,
  userRestSendCount,
  userRestore,
  userDeleteAccount,
  userAllAccount
} from '@/request/user.js'
import {roleSelectUse} from "@/request/role.js";
import {Icon} from "@iconify/vue";
import loading from "@/components/loading/index.vue";
import {tzDayjs} from "@/utils/day.js";
import {useSettingStore} from "@/store/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useRoleStore} from "@/store/role.js";
import {useUserStore} from "@/store/user.js";
import {useI18n} from 'vue-i18n';
import {hasPerm} from '@/perm/perm.js';
import {intlLanguage} from '@/i18n/languages.js';
import {displayRoleName} from '@/i18n/system-defaults.js';

defineOptions({
  name: 'user'
})

const {t, locale} = useI18n();

function formatUserDate(time, includeTime = false) {
  const options = {year: 'numeric', month: 'short', day: 'numeric'}
  if (includeTime) Object.assign(options, {hour: 'numeric', minute: '2-digit'})
  return new Intl.DateTimeFormat(intlLanguage(locale.value), options).format(tzDayjs(time).toDate())
}
const roleStore = useRoleStore()
const userStore = useUserStore()
const settingStore = useSettingStore()
const oauthPlatformMap = {
  google: { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
  github: { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
  linuxdo: { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
}
function oauthPlatform(row) {
  if (row?.platform && oauthPlatformMap[row.platform]) {
    return oauthPlatformMap[row.platform]
  }
  // 旧数据可能只有 username、无 platform
  if (row?.username) return oauthPlatformMap.linuxdo
  return null
}
const filteredValue = ['normal', 'del']
const filters = computed(() => [{text: t('active'), value: 'normal'}, {text: t('deleted'), value: 'del'}])
const preserveExpanded = ref(false)
const emailWidth = ref(230)
const expandWidth = ref(40)
const settingWidth = ref(null)
const sendNumShow = ref(true)
const accountNumShow = ref(true)
const createTimeShow = ref(true)
const statusShow = ref(true)
const typeShow = ref(true)
const receiveWidth = ref(null)
const phonePageShow = ref(false)
const detailsShow = ref(false);
const layout = ref('prev, pager, next,  sizes, total')
const pageSize = ref('')
const users = ref([])
const selectedUsers = ref([])
const loadError = ref(false)
function onSelectionChange(rows) { selectedUsers.value = rows }
let listRequestId = 0
const tableRef = ref({})
const userDetails = ref({})
const total = ref(0)
const first = ref(true)
const scrollbarRef = ref(null)
const accountLoading = ref(false)
const dropdownRef = ref(null);
const dropdownShow = ref(false);
const rightClickUser = ref({});
const position = ref(
    DOMRect.fromRect({
      x: 0,
      y: 0,
    })
)

const triggerRef = ref({
  getBoundingClientRect() {
    return position.value;
  }
})
const domainList = settingStore.domainList

const addForm = reactive({
  email: '',
  suffix: settingStore.domainList[0],
  password: '',
  type: null,
})

const params = reactive({
  email: '',
  num: 1,
  size: 15,
  timeSort: 0,
  status: -1
})
let chooseUser = {}
const userForm = reactive({
  password: null,
  type: -1,
  userId: 0,
})

const showAdd = ref(false)
const accountShow = ref(false)
const addLoading = ref(false);
const setTypeShow = ref(false)
const setPwdShow = ref(false)
const pagerCount = ref(10)
const settingLoading = ref(false)
const tableLoading = ref(true)
const roleList = reactive([])
const mySelect = ref({})
const accountList = reactive([])
const accountParams = reactive({
  size: 10,
  num: 0,
  total: 0,
  userId: 0,
})

roleSelectUse().then(list => {
  roleList.length = 0
  roleList.push(...list)
})

const paramsStar = localStorage.getItem('user-params')
if (paramsStar) {
  const localParams = JSON.parse(paramsStar)
  params.num = localParams.num
  params.size = localParams.size
  params.timeSort = localParams.timeSort
  params.status = localParams.status
}

watch(() => params, () => {
  localStorage.setItem('user-params', JSON.stringify(params))
}, {
  deep: true
})

watch(() => roleStore.refresh, () => {
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
})

watch(() => userStore.refreshList, () => {
  getUserList(false)
})

getUserList()

const filterItem = reactive({
  send: ['normal', 'del'],
  account: ['normal', 'del'],
  receive: ['normal', 'del']
})

function closeDropdownOnWheel() {
  if (dropdownShow.value) {
    dropdownRef.value.handleClose();
  }
}

function visibleChange(e) {
  dropdownShow.value = e;
  if (!e) {
    rightClickUser.value.checkedClass = '';
  }
}

function cellClassName({ row }) {
  return row.checkedClass;
}

const handleContextmenu = (row, column, cell, event) => {

  if (row.type === 0 && userStore.user.type !== 0) {
    return
  }

  rightClickUser.value.checkedClass = '';

  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({
    x: clientX,
    y: clientY,
  })
  event.preventDefault()
  dropdownRef.value?.handleOpen()

  row.checkedClass = 'checked-row';
  rightClickUser.value = row;
}

function deleteAccount(account) {
  ElMessageBox.confirm(t('delConfirm', {msg: account.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDeleteAccount(account.accountId).then(() => {
      getAccountList()
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}
function accountCurChange(e) {
  accountParams.num = e
  getAccountList()
}

function resetAccountList() {
  accountList.length = 0
  accountParams.num = 0
  accountParams.size = 10
  accountParams.total = 0
}

function openAccountList(userId) {
  accountParams.userId = userId
  getAccountList(true)
  accountShow.value = true
}

function openDetails(user) {
  userDetails.value = user;
  detailsShow.value = true;
}

function getAccountList(loading = false) {
  accountLoading.value = loading
  userAllAccount(accountParams.userId,accountParams.num, accountParams.size).then(({list,total}) => {
    accountList.length = 0
    accountList.push(...list)
    accountParams.total = total
    accountLoading.value = false
  })
}

function tableFilter(e) {

  if (e.send) filterItem.send = e.send
  if (e.account) filterItem.account = e.account
  if (e.receive) filterItem.receive = e.receive

}

function formatterSend(e) {

  if (filterItem.send.length === 2) {
    return e.sendEmailCount + e.delSendEmailCount
  }

  if (filterItem.send.includes('normal')) {
    return e.sendEmailCount
  }

  if (filterItem.send.includes('del')) {
    return e.delSendEmailCount
  }

  return 0
}

function formatterAccount(e) {

  if (filterItem.account.length === 2) {
    return e.accountCount + e.delAccountCount
  }

  if (filterItem.account.includes('normal')) {
    return e.accountCount
  }

  if (filterItem.account.includes('del')) {
    return e.delAccountCount
  }

  return 0
}

function formatterReceive(e) {


  if (filterItem.receive.length === 2) {
    return e.receiveEmailCount + e.delReceiveEmailCount
  }

  if (filterItem.receive.includes('normal')) {
    return e.receiveEmailCount
  }

  if (filterItem.receive.includes('del')) {
    return e.delReceiveEmailCount
  }

  return 0
}

function setStatusName(user) {
  if (user.isDel === 1) return t('restore')
  if (user.status === 0) return t('btnBan')
  if (user.status === 1) return t('enable')
}

function setRightStatusName(user) {
  if (user.isDel === 1) return t('adminDeleteUser')
  if (user.status === 0) return t('banUser')
  if (user.status === 1) return t('enableUser')
}

const tableRowFormatter = (data) => {
  return data.row.email
}

const openSelect = () => {
  mySelect.value.toggleMenu()
}

function resetAddForm() {
  addForm.email = ''
  addForm.password = ''
}

function openAdd() {
  showAdd.value = true
}

function submit() {

  if (addLoading.value) return

  if (!addForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!isEmail(addForm.email + addForm.suffix)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (addForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.type) {
    ElMessage({
      message: t('emptyRole'),
      type: "error",
      plain: true
    })
    return
  }

  addLoading.value = true
  const form = {...addForm}
  form.email = form.email + form.suffix
  userAdd(form).then(() => {
    addLoading.value = false
    showAdd.value = false
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    getUserList(false)
  }).finally(res => {
    addLoading.value = false
  })
}


function formatSendType(user) {
  if (user.sendAction.sendType === 'day') return t('daily')
  if (user.sendAction.sendType === 'count') return t('total')
  if (user.sendAction.sendType === 'ban') return t('sendBanned')
  if (user.sendAction.sendType === 'internal') return t('sendInternal')
}

function formatSendCount(user) {

  if (!user.sendAction.hasPerm) {
    return t('unauthorized')
  }

  if (!user.sendAction.sendCount) {
    return t('unlimited');
  }

  let count = user.sendCount + '/' + user.sendAction.sendCount

  return count
}

function toRoleName(type) {

  if (type === 0) {
    return t('admin')
  }

  const index = roleList.findIndex(role => role.roleId === type)
  if (index > -1) {
    return displayRoleName(roleList[index], t)
  }
  return ""
}

function resetSendCount(user) {

  ElMessageBox.confirm(t('reSendConfirm', {msg: user.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userRestSendCount(user.userId).then(() => {
      ElMessage({
        message: t('reSuccessMsg'),
        type: "success",
        plain: true
      })
      user.sendCount = 0
    })
  });
}

function delUser(user) {
  const rows = tableRef.value.getSelectionRows();
  const userIds = rows.map(row => row.userId);
  if (userIds.length === 0) {
    return;
  }
  ElMessageBox.confirm(t('delUsersConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete(userIds).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
      getUserList(true)
    })
  });
}

function delOneUser(user) {
  ElMessageBox.confirm(t('delConfirm', {msg: user.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete([user.userId]).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
      getUserList(true)
    })
  });
}

function restore(user) {

  const type = ref(0)

  ElMessageBox.confirm(null, {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    message: () => h('div', [
      h('div', {class: 'mb-2'}, t('restoreConfirm', {msg: user.email}))
      // h(ElRadioGroup, {
      //   modelValue: type.value,
      //   'onUpdate:modelValue': (val) => (type.value = val),
      // }, [
      //   h(ElRadio, {label: 'option1', value: 0}, t('normalRestore')),
      //   h(ElRadio, {label: 'option2', value: 1}, t('allRestore')),
      // ])
    ]),
    type: 'warning'
  }).then(() => {
    userRestore(user.userId, type.value).then(() => {
      user.isDel = 0
      ElMessage({
        message: t('restoreSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}

function setStatus(user) {
  httpSetStatus(user);
}

function httpSetStatus(user) {
  let status = user.status ? 0 : 1
  userSetStatus({status: status, userId: user.userId}).then(() => {
    user.status = status
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
  })
}

function setType() {
  if (settingLoading.value) return
  settingLoading.value = true
  userSetType({type: userForm.type, userId: userForm.userId}).then(() => {
    chooseUser.type = userForm.type
    setTypeShow.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })

  }).finally(() => {
    settingLoading.value = false
  })
}


function resetUserForm() {
  userForm.password = null
  userForm.userId = 0
}

function search() {
  params.num = 1
  getUserList()
}

function updatePwd() {

  if (settingLoading.value) return

  if (!userForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (userForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  settingLoading.value = true
  userSetPwd({password: userForm.password, userId: userForm.userId}).then(() => {
    setPwdShow.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
  }).finally(() => {
    settingLoading.value = false
  })
}

function openSetType(user) {
  chooseUser = user
  userForm.userId = user.userId
  userForm.type = user.type
  setTypeShow.value = true
}

function openSetPwd(user) {
  userForm.userId = user.userId
  setPwdShow.value = true
}

function refresh() {
  params.email = ''
  params.num = 1
  params.status = -1
  params.timeSort = 0
  getUserList();
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
}

function changeTimeSort() {
  params.num = 1
  params.timeSort = params.timeSort ? 0 : 1
  getUserList()
}

function numChange(num) {
  params.num = num
  getUserList()
}

function sizeChange(size) {
  params.size = size
  getUserList()
}

function getUserList(loading = true) {

  const requestId = ++listRequestId
  tableLoading.value = loading
  loadError.value = false
  const newParams = {...params}

  if (newParams.status === -2) {
    delete newParams.status
    newParams.isDel = 1
  }
  userList(newParams).then(data => {
    if (requestId !== listRequestId) return
    users.value = data.list.map(item => ({...item, checkedClass: ''}))
    total.value = data.total
    selectedUsers.value = []
    scrollbarRef.value?.setScrollTop(0);
  }).catch(() => {
    if (requestId !== listRequestId) return
    loadError.value = true
  }).finally(() => {
    if (requestId !== listRequestId) return
    tableLoading.value = false
    setTimeout(() => {
      first.value = false
    }, 200)
  })
}

function bindWindowEvents() {
  window.addEventListener('resize', adjustWidth)
  window.addEventListener('wheel', closeDropdownOnWheel)
  adjustWidth()
}
function unbindWindowEvents() {
  window.removeEventListener('resize', adjustWidth)
  window.removeEventListener('wheel', closeDropdownOnWheel)
}
onActivated(bindWindowEvents)
onDeactivated(unbindWindowEvents)
onUnmounted(unbindWindowEvents)

adjustWidth()

function adjustWidth() {
  const width = window.innerWidth
  statusShow.value = width >= 768
  createTimeShow.value = width > 1367
  accountNumShow.value = width > 1000
  sendNumShow.value = width > 1000
  typeShow.value = width > 1150
  emailWidth.value = width > 480 ? 230 : null
  settingWidth.value = width < 480 ? 110 : null
  expandWidth.value = width < 480 ? 30 : 35
  pagerCount.value = width < 768 ? 7 : 11
  receiveWidth.value = width < 480 ? 90 : null
  layout.value = width < 768 ? 'pager' : 'prev, pager, next,sizes, total'
  phonePageShow.value = width < 768
  pageSize.value = width < 380 ? 'small' : ''
}

</script>

<style>
.el-message-box__container {
  align-items: start !important;
}

.el-message-box__message {
  word-break: break-all;
}

.el-table-filter__content {
  min-width: 0;
}
</style>
<style lang="scss" scoped>

:deep(.el-table .checked-row) {
  background: var(--el-color-warning-light-9);
}

.user-box {
  overflow: hidden;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--ui-surface, var(--el-bg-color));
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.account-dialog) {
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.header-actions {
  min-height: 56px;
  flex: 0 0 auto;
  padding: 8px 15px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid var(--ui-line, var(--el-border-color));
  font-size: 18px;

  .search-input {
    width: clamp(180px, 24vw, 330px);
  }

  .search {
    :deep(.el-input-group) {
      height: 28px;
    }

    :deep(.el-input__inner) {
      height: 28px;
    }
  }

  .icon {
    cursor: pointer;
  }

  .header-add,
  .tool-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    border-radius: 8px;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
  }

  .header-add {
    padding: 8px 14px;
    border: 1px solid var(--ui-primary, var(--el-color-primary));
    color: #fff;
    background: var(--ui-primary, var(--el-color-primary));
    font-weight: 700;
  }

  .tool-button {
    width: 40px;
    padding: 0;
    border: 0;
    color: var(--ui-ink, var(--el-text-color-primary));
    background: transparent;
  }

  .tool-button:hover { background: var(--ui-surface-alt, var(--el-fill-color-light)); }
  .tool-button.destructive { color: var(--el-color-danger); }
  .tool-button:disabled { opacity: .45; cursor: default; }
  button:focus-visible { outline: 2px solid var(--ui-focus, var(--el-color-primary)); outline-offset: 2px; }
}

.container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.type {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.choose-star {
  color: var(--el-color-primary)
}

.scrollbar {
  width: 100%;
  overflow: auto;
  flex: 1 1 auto;
  min-height: 0;
  height: 0;
}

.load-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ui-line, var(--el-border-color));
  color: var(--el-color-danger);
  background: var(--ui-surface-alt, var(--el-fill-color-light));
  font-size: 14px;
  button {
    min-height: 36px;
    padding: 6px 12px;
    border: 1px solid var(--ui-line, var(--el-border-color));
    border-radius: 7px;
    color: var(--ui-ink, var(--el-text-color-primary));
    background: var(--ui-surface, var(--el-bg-color));
    cursor: pointer;
  }
}

.mobile-user-list { display: grid; }
.mobile-user-card {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--ui-line, var(--el-border-color));
  .mobile-user-primary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
  strong { min-width: 0; overflow-wrap: anywhere; text-align: start; color: var(--ui-ink, var(--el-text-color-primary)); }
  .mobile-user-meta { color: var(--ui-muted, var(--el-text-color-regular)); font-size: 13px; }
  .mobile-user-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .mobile-user-actions .el-button { min-height: 40px; margin: 0; }
}

@media (max-width: 767px) {
  .header-actions {
    padding: 10px 12px;
    .header-add { order: 0; }
    .search { order: 1; flex: 1 1 150px; min-width: 0; }
    .search-input { width: 100%; }
    .status-select { order: 2; width: 120px; }
    .tool-button { order: 3; }
  }
}

.details {
  padding: 0 10px 10px 10px;
  display: grid;
  gap: 10px;
  .details-item-title {
    white-space: pre;
    color: #909399;
    font-weight: bold;
    padding-right: 10px;
  }
}

.oauth-details {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

:deep(.oauth-avatar) {
  flex-shrink: 0;
}

:deep(.oauth-platform-icon) {
  flex-shrink: 0;
}

.account-pagination {
  display: flex;
  justify-content: end;
  width: 100%;
}

.pagination {
  margin-top: 15px;
  margin-bottom: 20px;
  padding-right: 30px;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: end;
  gap: 10px;
  @media (max-width: 767px) {
    padding-right: 10px;
  }

  .el-pagination {
    align-self: end;
  }
}


.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-select {
  width: clamp(120px, 30vw, 190px);
  :deep(.el-select__wrapper) {
    min-height: 28px;
  }
}

.dialog {
  .dialog-box {
    .el-button {
      width: 100%;
      margin-top: 15px;
    }
  }
}

.select {
  position: absolute;
  right: 30px;
  width: 100px;
  opacity: 0;
  pointer-events: none;
}

.loading {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--loadding-background);
  left: 0;
  z-index: 2;
  top: 0;
  width: 100%;
  height: 100%;
}

.loading-show {
  transition: all 200ms ease 200ms;
  opacity: 1;
}

.loading-hide {
  pointer-events: none;
  transition: var(--loading-hide-transition);
  opacity: 0;
}

.setting-icon {
  position: relative;
  top: 6px;
}

.right-dropdown-item {
  display: flex;
  gap: 10px;
}

.btn {
  width: 100%;
}

:deep(.el-pagination .el-select) {
  width: 100px;
  background: var(--el-bg-color);
}

:deep(.el-input-group__append) {
  padding: 0 !important;
  padding-left: 8px !important;
  background: var(--el-bg-color);
}

:deep(.cell) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

:deep(.receive .cell) {
  white-space: nowrap;
}

:deep(.send .cell) {
  white-space: nowrap;
}

:deep(.account .cell) {
  white-space: nowrap;
}

:deep(.el-table) {
  @media (pointer: coarse) {
    /* 触屏 */
    user-select: none;
  }
}

:deep(.el-table th.el-table__cell>.cell.highlight) {
  color: #909399;
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}

:deep(.el-message-box__container) {
  align-items: start;
}
</style>
