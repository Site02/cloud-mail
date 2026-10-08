import {createApp} from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';
import { init } from '@/init/init.js';
import { createPinia } from 'pinia';
import piniaPersistedState from 'pinia-plugin-persistedstate';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'nprogress/nprogress.css';
import perm from "@/perm/perm.js";
const pinia = createPinia().use(piniaPersistedState)
import i18n from "@/i18n/index.js";
import '@/pwa/install.js';
import {startupFailed, startServiceWorker} from '@/pwa/status.js';

async function bootstrap() {
    const app = createApp(App).use(pinia)
    try {
        await init()
    } catch (_) {
        const publicPage = window.location.hostname.startsWith('temp.') || window.location.pathname === '/find'
        startupFailed.value = !publicPage
        document.title = i18n.global.t(publicPage ? 'temporaryInbox.title' : 'pwa.appName')
    }
    app.use(router).use(i18n).directive('perm', perm)
    app.config.devtools = true

    app.mount('#app')
    document.getElementById('loading-first')?.remove()
    startServiceWorker()
}

void bootstrap()
