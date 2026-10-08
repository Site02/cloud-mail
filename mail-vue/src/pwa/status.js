import {ref} from 'vue'
import {registerSW} from 'virtual:pwa-register'

export const startupFailed = ref(false)
export const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
export const updateAvailable = ref(false)

let updateSW = null
let registration = null
let lastCheck = 0

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { online.value = true; checkForUpdate() })
  window.addEventListener('offline', () => { online.value = false })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForUpdate()
  })
}

async function checkForUpdate() {
  if (!registration || !online.value || Date.now() - lastCheck < 15 * 60 * 1000) return
  lastCheck = Date.now()
  try { await registration.update() } catch (_) { /* Retry on the next visit. */ }
}

export function startServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() { updateAvailable.value = true },
    onRegisteredSW(_url, activeRegistration) {
      registration = activeRegistration
      window.setInterval(checkForUpdate, 60 * 60 * 1000)
    },
  })
}

export function applyUpdate() {
  updateSW?.(true)
}

export function dismissUpdate() {
  updateAvailable.value = false
}
