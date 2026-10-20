function supportedLanguage(tag) {
    const parts = tag.toLowerCase().replaceAll('_', '-').split('-')
    if (parts[0] === 'en') return 'en'
    if (parts[0] !== 'zh') return null
    if (parts.includes('hans')) return 'zh'
    return parts.some(part => ['hant', 'tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh'
}

export function resolveLanguage(header = '') {
    const preferences = header.split(',').map((entry, index) => {
        const [tag, ...parameters] = entry.trim().split(';')
        const quality = parameters.find(value => value.trim().startsWith('q='))
        const weight = quality === undefined ? 1 : Number(quality.trim().slice(2))
        return {language: supportedLanguage(tag.trim()), weight, index}
    }).filter(entry => entry.language && Number.isFinite(entry.weight) && entry.weight > 0 && entry.weight <= 1)
    preferences.sort((a, b) => b.weight - a.weight || a.index - b.index)
    return preferences[0]?.language || 'zh'
}
