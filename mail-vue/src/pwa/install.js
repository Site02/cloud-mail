import {ref} from 'vue'

const displayMode = typeof window !== 'undefined'
  ? window.matchMedia('(display-mode: standalone)')
  : null

export const installed = ref(Boolean(displayMode?.matches || (typeof navigator !== 'undefined' && navigator.standalone)))
let installPrompt = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    installPrompt = event
  })
  window.addEventListener('appinstalled', () => {
    installPrompt = null
    installed.value = true
  })
  const onDisplayModeChange = event => {
    installed.value = event.matches || Boolean(navigator.standalone)
  }
  if (displayMode?.addEventListener) displayMode.addEventListener('change', onDisplayModeChange)
  else displayMode?.addListener?.(onDisplayModeChange)
}

export function installPlatform() {
  const agent = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(agent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(agent)) return 'android'
  return 'desktop'
}

export async function requestInstall() {
  if (!installPrompt) return null
  const prompt = installPrompt
  installPrompt = null
  await prompt.prompt()
  const choice = await prompt.userChoice
  return choice?.outcome || 'dismissed'
}
