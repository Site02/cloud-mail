<template>
  <div id="login-box" class="login-page" v-loading="oauthLoading" :element-loading-text="t('loginLoading')">
    <div class="login-shell">
      <header class="login-topline">
        <div class="login-brand">
          <span class="login-mark"><Icon icon="fluent:mail-24-filled" width="20" height="20" aria-hidden="true" /></span>
          <span>{{ settingStore.settings.title }}</span>
        </div>
        <div class="login-top-actions">
          <LanguageSelect v-model="settingStore.lang" class="login-language" />
          <AppInstallButton />
          <a :href="publicMailboxHref" class="login-public-link">{{ t('temporaryInbox.title') }}</a>
        </div>
      </header>

      <main class="login-grid">
        <section class="login-story" :class="{'has-background': Boolean(settingStore.settings.background)}" :style="background">
          <div class="login-story-inner">
            <h1>{{ show === 'login' ? t('loginTitle') : t('regTitle') }}</h1>
            <div class="login-story-rule" aria-hidden="true"></div>
            <ul class="login-story-features">
              <li>{{ t('receiveEmail') }}</li>
              <li>{{ t('sendEmail') }}</li>
              <li>{{ t('attachments') }}</li>
            </ul>
          </div>
        </section>

        <section class="login-card" aria-labelledby="login-form-title">
          <div class="login-card-head">
            <h2 id="login-form-title">{{ show === 'login' ? t('loginBtn') : t('regBtn') }}</h2>
          </div>

          <form v-show="show === 'login'" class="login-form" @submit.prevent="submit">
            <label class="field-label" for="login-email">{{ t('emailAccount') }}</label>
            <el-input ref="loginEmailInput" id="login-email" :class="!hideLoginDomain ? 'email-input' : ''" v-model="form.email" dir="ltr"
                      type="text" :placeholder="t('emailAccount')" :autocomplete="hideLoginDomain ? 'username' : 'off'">
              <template #append v-if="!hideLoginDomain">
                <select v-model="suffix" class="domain-select" dir="ltr" :aria-label="t('domain')" :title="suffix">
                  <option v-for="item in domainList" :key="item" :value="item">{{ item }}</option>
                </select>
              </template>
            </el-input>
            <label class="field-label" for="login-password">{{ t('password') }}</label>
            <el-input id="login-password" v-model="form.password" :placeholder="t('password')" type="password" autocomplete="current-password" />
            <el-button class="submit-button" type="primary" native-type="submit" :loading="loginLoading">{{ t('loginBtn') }}</el-button>
          </form>

          <form v-show="show !== 'login'" class="login-form" @submit.prevent="submitRegister">
            <label class="field-label" for="register-email">{{ t('emailAccount') }}</label>
            <el-input ref="registerEmailInput" id="register-email" :class="!hideLoginDomain ? 'email-input' : ''" v-model="registerForm.email" dir="ltr" type="text" :placeholder="t('emailAccount')"
                      :autocomplete="hideLoginDomain ? 'username' : 'off'">
              <template #append v-if="!hideLoginDomain">
                <select v-model="suffix" class="domain-select" dir="ltr" :aria-label="t('domain')" :title="suffix">
                  <option v-for="item in domainList" :key="item" :value="item">{{ item }}</option>
                </select>
              </template>
            </el-input>
            <label class="field-label" for="register-password">{{ t('password') }}</label>
            <el-input id="register-password" v-model="registerForm.password" :placeholder="t('password')" type="password" autocomplete="new-password" />
            <label class="field-label" for="register-confirm-password">{{ t('confirmPwd') }}</label>
            <el-input id="register-confirm-password" v-model="registerForm.confirmPassword" :placeholder="t('confirmPwd')" type="password" autocomplete="new-password" />
            <label v-if="settingStore.settings.regKey === 0" class="field-label" for="register-invite-code">{{ t('regKey') }}</label>
            <el-input v-if="settingStore.settings.regKey === 0" id="register-invite-code" v-model="registerForm.code" :placeholder="t('regKey')" type="text" autocomplete="off" />
            <label v-if="settingStore.settings.regKey === 2" class="field-label" for="register-invite-code">{{ t('regKeyOptional') }}</label>
            <el-input v-if="settingStore.settings.regKey === 2" id="register-invite-code" v-model="registerForm.code" :placeholder="t('regKeyOptional')" type="text" autocomplete="off" />
            <div v-show="verifyShow" class="register-turnstile"
                 :data-sitekey="settingStore.settings.siteKey"
                 data-callback="onTurnstileSuccess"
                 data-error-callback="onTurnstileError"
                 data-after-interactive-callback="loadAfter"
                 data-before-interactive-callback="loadBefore">
              <span class="verify-error" v-if="botJsError">{{ t('verifyModuleFailed') }}</span>
            </div>
            <el-button class="submit-button" type="primary" native-type="submit" :loading="registerLoading">{{ t('regBtn') }}</el-button>
          </form>

          <div v-if="oauthProviders.length" class="oauth-options">
            <el-button v-for="p in oauthProviders" :key="p.key" class="provider-button" @click="oauthLogin(p.key)">
              <el-avatar v-if="p.iconType === 'image'" :src="p.icon" :size="18" />
              <Icon v-else :icon="p.icon" width="18" height="18" aria-hidden="true" />
              {{ t('loginBtn') }} · {{ p.label }}
            </el-button>
          </div>

          <template v-if="settingStore.settings.register === 0">
            <p class="switch" v-if="show === 'login'">{{ t('noAccount') }}
              <button type="button" class="switch-action" @click="switchMode('register')">{{ t('regSwitch') }}</button>
            </p>
            <p class="switch" v-else>{{ t('hasAccount') }}
              <button type="button" class="switch-action" @click="switchMode('login')">{{ t('loginSwitch') }}</button>
            </p>
          </template>
        </section>
      </main>
    </div>
    <el-dialog class="bind-dialog" v-model="showBindForm" :title="t('bindMailboxTitle')" width="min(440px, calc(100vw - 32px))" >
      <div class="bind-container">
        <label class="field-label" for="bind-email">{{ $t('emailAccount') }}</label>
        <el-input id="bind-email" :class="!hideLoginDomain ? 'email-input' : ''" v-model="bindForm.email" dir="ltr" type="text" :placeholder="$t('emailAccount')" autocomplete="off" @keyup.enter="bind">
          <template #append v-if="!hideLoginDomain">
            <select v-model="suffix" class="domain-select" dir="ltr" :aria-label="t('domain')" :title="suffix">
              <option v-for="item in domainList" :key="item" :value="item">{{ item }}</option>
            </select>
          </template>
        </el-input>
        <label v-if="settingStore.settings.regKey === 0" class="field-label" for="bind-invite-code">{{ $t('regKey') }}</label>
        <el-input v-if="settingStore.settings.regKey === 0" id="bind-invite-code" v-model="bindForm.code" :placeholder="$t('regKey')"
                  type="text" autocomplete="off" @keyup.enter="bind"/>
        <label v-if="settingStore.settings.regKey === 2" class="field-label" for="bind-invite-code">{{ $t('regKeyOptional') }}</label>
        <el-input v-if="settingStore.settings.regKey === 2" id="bind-invite-code" v-model="bindForm.code"
                  :placeholder="$t('regKeyOptional')" type="text" autocomplete="off" @keyup.enter="bind"/>
        <el-button class="btn" type="primary" @click="bind" :loading="bindLoading"
        >{{ t('bindAction') }}
        </el-button>
      </div>
    </el-dialog>
    <a v-show="settingStore.settings.projectLink" class="github" href="https://github.com/maillab/cloud-mail"
       aria-label="GitHub" title="GitHub">
      <Icon icon="mingcute:github-line" color="#1890ff" width="20" height="20" />
    </a>
  </div>
</template>

<script setup>
import {useEmailStore} from '@/store/email.js'
import router from "@/router";
import {useRoute} from "vue-router";
import {computed, nextTick, reactive, ref} from "vue";
import {login} from "@/request/login.js";
import {register} from "@/request/login.js";
import {websiteConfig} from "@/request/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url} from "@/utils/convert.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import {useI18n} from "vue-i18n";
import {normalizeLanguage} from '@/i18n/languages.js';
import LanguageSelect from '@/components/language-select/index.vue';
import AppInstallButton from '@/components/app-install-button/index.vue';
import {oauthBindUser, oauthLinuxDoLogin, oauthGithubLogin, oauthGoogleLogin} from "@/request/ouath.js";

const {t} = useI18n();
const accountStore = useAccountStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const route = useRoute();
const publicMailboxHref = computed(() => {
  const manualLanguage = normalizeLanguage(settingStore.lang)
  return manualLanguage ? `/find?lang=${encodeURIComponent(manualLanguage)}` : '/find'
})
const loginLoading = ref(false)
const bindLoading = ref(false)
const oauthLoading = ref(false);
const showBindForm = ref(false);
const show = ref('login')
const loginEmailInput = ref(null)
const registerEmailInput = ref(null)

function switchMode(mode) {
  show.value = mode
  void nextTick(() => {
    if (mode === 'login') loginEmailInput.value?.focus()
    else registerEmailInput.value?.focus()
  })
}

const oauthKeys = ['linuxdo', 'github', 'google']

const oauthProvider = computed(() => {
  const fromState = route.query.state
  const expectedState = sessionStorage.getItem('oauthState')
  const fromStore = sessionStorage.getItem('oauthProvider')
  return expectedState && fromState === expectedState && oauthKeys.includes(fromStore) ? fromStore : null
})

const oauthProviders = computed(() => {
  const allProviders = [
    { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
    { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
    { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
  ]
  return allProviders.filter(p => settingStore.settings[p.key + 'Switch'] === 0)
})

const loginOpacity = computed(() => {
  const opacity = settingStore.settings.loginOpacity
  return uiStore.dark ? `rgba(21, 31, 44, ${opacity})` : `rgba(255, 255, 255, ${opacity})`
})

const bindForm = reactive({
  email: '',
  bindToken: '',
  code: ''
})

const form = reactive({
  email: '',
  password: '',

});
const suffix = ref('')
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: null
})
const domainList = settingStore.domainList;
const registerLoading = ref(false)
suffix.value = domainList[0]
const verifyShow = ref(false)
let verifyToken = ''
let turnstileId = null
let botJsError = ref(false)
let verifyErrorCount = 0

window.onTurnstileSuccess = (token) => {
  verifyToken = token;
};

window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) {
    return
  }
  verifyErrorCount++
  console.warn('人机验加载失败', e)
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.register-turnstile')
      } else {
        window.turnstile.reset(turnstileId);
      }
    })
  }, 1500)
};

window.loadAfter = (e) => {
  console.log('loadAfter')
}

window.loadBefore = (e) => {
  console.log('loadBefore')
}

const hideLoginDomain = computed(() => settingStore.settings.loginDomain === 1)

const background = computed(() => {

  return settingStore.settings.background ? {
    'background-image': `url(${cvtR2Url(settingStore.settings.background)})`,
    'background-repeat': 'no-repeat',
    'background-size': 'cover',
    'background-position': 'center'
  } : ''
})

const getFullEmail = (email) => {
  return hideLoginDomain.value ? email : email + suffix.value
}

const getEmailName = (email) => {
  return email.split('@')[0]
}

function oauthLogin(provider) {
  const clientId = settingStore.settings[provider + 'ClientId']
  const redirectUri = encodeURIComponent(window.location.origin + '/login')
  const state = crypto.randomUUID()
  sessionStorage.setItem('oauthProvider', provider)
  sessionStorage.setItem('oauthState', state)
  const authorizeUrls = {
    linuxdo: `https://connect.linux.do/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${state}`,
    github: `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${state}`,
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${state}`,
  }
  window.location.href = authorizeUrls[provider]
}

const loginFns = {
  linuxdo: oauthLinuxDoLogin,
  github: oauthGithubLogin,
  google: oauthGoogleLogin,
}

oauthGetUser();

async function oauthGetUser() {

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code) return
  if (!oauthProvider.value) {
    window.history.replaceState({}, '', window.location.origin + window.location.pathname)
    ElMessage.error(t('oauthValidationFailed'))
    return
  }

  const provider = oauthProvider.value
  oauthLoading.value = true
  sessionStorage.removeItem('oauthProvider')
  sessionStorage.removeItem('oauthState')
  window.history.replaceState({}, '', window.location.origin + window.location.pathname)

  loginFns[provider](code, window.location.origin + '/login').then(data => {

    bindForm.bindToken = data.bindToken || '';

    if (!data.token) {
      showBindForm.value = true
      oauthLoading.value = false
      ElMessage({
        message: t('bindMailboxPrompt'),
        type: 'warning',
        duration: 4000,
        plain: true,
      })
      return;
    }

    saveToken(data.token);
  }).catch(() => {
    oauthLoading.value = false
  })
}

function bind() {

  if (bindLoading.value) return

  if (!bindForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }


  if (getEmailName(bindForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(bindForm.email);


  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!bindForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  const form = {email, bindToken: bindForm.bindToken, code: bindForm.code}

  bindLoading.value = true
  oauthBindUser(form).then(data => {
    saveToken(data.token)
  }).catch(() => {
    bindLoading.value = false
  })
}

const submit = () => {

  if (loginLoading.value) return

  if (!form.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(form.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  loginLoading.value = true
  login(email, form.password).then(async data => {
    await saveToken(data.token)
  }).finally(() => {
    loginLoading.value = false
  })
}

async function saveToken(token) {
  useEmailStore().clearPrivateSession()
  localStorage.setItem('token', token)
  refreshWebsiteConfig()
  const user = await loginUserInfo();
  useEmailStore().setSessionUser(user.userId)
  accountStore.currentAccountId = user.account.accountId;
  accountStore.currentAccount = user.account;
  userStore.user = user;
  const routers = permsToRouter(user.permKeys);
  routers.forEach(routerData => {
    router.addRoute('layout', routerData);
  });
  await router.replace({name: 'layout'})
  uiStore.showNotice()
  oauthLoading.value = false;
  bindLoading.value = false;
}

function refreshWebsiteConfig() {
  websiteConfig().then(setting => {
    settingStore.settings = setting
    settingStore.domainList = setting.domainList
    if (!suffix.value && setting.domainList.length > 0) {
      suffix.value = setting.domainList[0]
    }
    document.title = setting.title
  }).catch(e => {
    console.error(e)
  })
}


function submitRegister() {

  if (registerLoading.value) return

  if (!registerForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  console.log(registerForm.email)

  if (getEmailName(registerForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  const email = getFullEmail(registerForm.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!registerForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {

    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {

    if (!registerForm.code) {

      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }

  }

  if (!verifyToken && (settingStore.settings.registerVerify === 0 || (settingStore.settings.registerVerify === 2 && settingStore.settings.regVerifyOpen))) {
    if (!verifyShow.value) {
      verifyShow.value = true
      nextTick(() => {
        if (!turnstileId) {
          try {
            turnstileId = window.turnstile.render('.register-turnstile')
          } catch (e) {
            botJsError.value = true
            console.log('人机验证js加载失败')
          }
        } else {
          window.turnstile.reset('.register-turnstile')
        }
      })
    } else if (!botJsError.value) {
      ElMessage({
        message: t('botVerifyMsg'),
        type: "error",
        plain: true
      })
    }
    return;
  }

  registerLoading.value = true

  const form = {
    email,
    password: registerForm.password,
    token: verifyToken,
    code: registerForm.code
  }

  register(form).then(({regVerifyOpen}) => {
    show.value = 'login'
    registerForm.email = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
    registerForm.code = ''
    registerLoading.value = false
    verifyToken = ''
    settingStore.settings.regVerifyOpen = regVerifyOpen
    verifyShow.value = false
    ElMessage({
      message: t('regSuccessMsg'),
      type: 'success',
      plain: true,
    })
  }).catch(res => {

    registerLoading.value = false

    if (res.code === 400) {
      verifyToken = ''
      settingStore.settings.regVerifyOpen = true
      if (turnstileId) {
        window.turnstile.reset(turnstileId)
      } else {
        nextTick(() => {
          turnstileId = window.turnstile.render('.register-turnstile')
        })
      }
      verifyShow.value = true

    }
  });
}

</script>


<style>
.el-select-dropdown__item {
  padding: 0 15px;
}

.no-autofill-pwd {
  .el-input__inner {
    -webkit-text-security: disc !important;
  }
}
</style>

<style lang="scss" scoped>
.login-page {
  min-height: 100dvh;
  padding: 0 24px 52px;
  overflow-x: clip;
  color: var(--ui-ink, #172432);
  background: var(--ui-bg, #f5f7fb);
}
.login-shell { max-width: 1160px; margin: 0 auto; }
.login-topline { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; min-height: 78px; }
.login-brand { display: inline-flex; align-items: center; gap: 11px; min-width: 0; font-size: 18px; font-weight: 750; letter-spacing: -.035em; }
.login-brand > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.login-mark { display: inline-grid; place-items: center; flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; color: #fff; background: var(--ui-primary, #175cd3); }
.login-top-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 8px; min-width: 0; --language-control-border: var(--ui-line); --language-control-bg: var(--ui-surface); --language-control-text: var(--ui-ink); }
.login-public-link { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 9px 13px; border: 1px solid var(--ui-line); border-radius: 9px; color: var(--ui-ink); background: var(--ui-surface); font-size: 13px; font-weight: 650; line-height: 1.3; text-align: center; text-decoration: none; }
.login-public-link:hover { border-color: var(--ui-primary); color: var(--ui-primary); }
.login-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 430px); align-items: center; gap: clamp(32px, 7vw, 96px); min-height: min(690px, calc(100dvh - 130px)); }
.login-story { position: relative; min-width: 0; padding: 32px 12px 32px 0; background-size: cover; background-position: center; }
.login-story.has-background { min-height: 500px; display: flex; align-items: center; padding: 38px; border-radius: 16px; overflow: hidden; }
.login-story.has-background::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(9, 25, 47, .89), rgba(9, 25, 47, .58)); }
.login-story-inner { position: relative; z-index: 1; }
.login-story.has-background .login-story-inner { color: #fff; }
.login-story h1 { max-width: 580px; margin: 0; color: inherit; font-size: clamp(38px, 5vw, 58px); font-weight: 780; line-height: 1.07; letter-spacing: -.055em; overflow-wrap: anywhere; }
.login-story-rule { width: 76px; height: 4px; margin: 36px 0; border-radius: 9px; background: var(--ui-primary); }
.login-story-features { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
.login-story-features li { display: flex; align-items: center; gap: 12px; color: var(--ui-muted); font-size: 14px; }
.login-story-features li::before { content: ''; display: inline-block; flex: 0 0 auto; width: 8px; height: 8px; border: 2px solid var(--ui-primary); border-radius: 50%; }
.login-story.has-background .login-story-features li { color: #e2eaf4; }
.login-story.has-background .login-story-features li::before { border-color: #8cc4ff; }
.login-card { width: 100%; min-width: 0; padding: 32px; border: 1px solid var(--ui-line); border-radius: 14px; background: v-bind(loginOpacity); backdrop-filter: blur(14px); box-shadow: 0 12px 36px rgba(17, 42, 72, .06); }
.login-card-head h2 { margin: 0 0 24px; font-size: 25px; line-height: 1.3; letter-spacing: -.04em; }
.login-form { display: grid; gap: 8px; }
.field-label { display: block; color: var(--ui-ink); font-size: 13px; font-weight: 700; line-height: 1.4; }
.login-form .field-label:not(:first-child) { margin-top: 8px; }
.login-form :deep(.el-input) { width: 100%; min-width: 0; min-height: 46px; }
.login-form :deep(.el-input__wrapper) { min-height: 46px; border-radius: 8px; background: var(--ui-surface); box-shadow: 0 0 0 1px var(--ui-line) inset; }
.login-form :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px var(--ui-primary) inset; }
.login-form :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px var(--ui-focus) inset; }
.login-form :deep(.el-input__inner) { color: var(--ui-ink); font-size: 14px; }
.login-form :deep(.el-input-group__append) { padding-inline: 8px; border-start-end-radius: 8px; border-end-end-radius: 8px; background: var(--ui-surface-alt); box-shadow: 0 0 0 1px var(--ui-line) inset; }
.login-form .email-input :deep(.el-input__wrapper) { border-start-end-radius: 0; border-end-end-radius: 0; }
.domain-select { width: clamp(96px, 30vw, 145px); height: 44px; padding-inline: 3px; border: 0; background: transparent; color: var(--ui-ink); font-size: 13px; cursor: pointer; }
.submit-button { width: 100%; min-height: 46px; margin-top: 14px; border-radius: 9px; font-weight: 700; }
.register-turnstile { max-width: 100%; margin-top: 10px; overflow-x: auto; }
.verify-error { color: var(--ui-danger, #b42332); font-size: 12px; }
.oauth-options { display: grid; gap: 8px; margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--ui-line); }
.provider-button { width: 100%; min-height: 44px; margin: 0; border-radius: 9px; color: var(--ui-ink); background: var(--ui-surface); font-weight: 650; }
.oauth-options :deep(.el-button + .el-button) { margin-inline-start: 0; }
.provider-button :deep(.el-avatar), .provider-button :deep(svg) { margin-inline-end: 8px; }
.switch { margin: 25px 0 0; color: var(--ui-muted); font-size: 13px; line-height: 1.5; text-align: center; }
.switch-action { padding: 4px; border: 0; color: var(--ui-primary); background: transparent; font: inherit; font-weight: 700; cursor: pointer; }
.switch-action:hover { text-decoration: underline; }
.bind-container { display: grid; gap: 8px; }
.bind-container :deep(.el-input) { min-height: 44px; margin-bottom: 8px; }
.bind-container :deep(.el-input__wrapper) { min-height: 44px; }
.bind-container :deep(.el-input-group__append) { padding-inline: 8px; background: var(--ui-surface-alt); }
.bind-container .btn { min-height: 44px; margin-top: 8px; }
.github { position: fixed; inset-block-end: 12px; inset-inline-end: 12px; z-index: 10; display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--ui-line); border-radius: 9px; background: var(--ui-surface); }
.login-page :is(button, input, select, a):focus-visible { outline: 3px solid var(--ui-focus); outline-offset: 2px; }
@media (max-width: 900px) {
  .login-grid { grid-template-columns: minmax(0, 1fr); align-items: start; gap: 14px; min-height: 0; }
  .login-story { padding: 20px 0 10px; }
  .login-story.has-background { min-height: 180px; padding: 26px; }
  .login-story h1 { font-size: 34px; margin-bottom: 8px; }
  .login-story-rule, .login-story-features { display: none; }
  .login-card { max-width: 540px; }
}
@media (max-width: 560px) {
  .login-page { padding: 0 16px 36px; }
  .login-topline { gap: 10px; padding: 13px 0; }
  .login-brand { width: 100%; font-size: 17px; }
  .login-top-actions { width: 100%; justify-content: flex-start; }
  .login-language { flex: 1 1 140px; }
  .login-story { padding: 15px 0 2px; }
  .login-story.has-background { min-height: 130px; padding: 20px; }
  .login-story h1 { font-size: 29px; }
  .login-card { padding: 22px; }
  .login-card-head h2 { font-size: 23px; }
}
@media (max-width: 350px) {
  .login-page { padding-inline: 12px; }
  .login-top-actions { gap: 5px; }
  .login-public-link { padding-inline: 9px; }
  .login-card { padding: 18px; }
  .domain-select { width: 96px; }
}
</style>
