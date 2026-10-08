const available = new Set([
  'ar', 'de', 'es', 'fr_FR', 'hi', 'id', 'it', 'ja', 'ko_KR', 'pt_BR',
  'ru', 'tr', 'vi', 'zh_CN', 'zh_TW',
])

const aliases = {
  zh: 'zh_CN',
  'zh-Hant': 'zh_TW',
  pt: 'pt_BR',
  fr: 'fr_FR',
  ko: 'ko_KR',
}

export function editorLocale(code) {
  const candidates = [aliases[code], code.replaceAll('-', '_'), code, code.split('-')[0]]
  return candidates.find(candidate => available.has(candidate)) || 'en'
}

export function hasEditorLocale(code) {
  return editorLocale(code) !== 'en'
}
