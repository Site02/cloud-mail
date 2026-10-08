export function restoreAllMailPreferences(value) {
  try {
    const saved = JSON.parse(value || '{}')
    return {
      timeSort: saved?.timeSort === 1 ? 1 : 0,
      searchType: ['name', 'subject', 'user', 'account'].includes(saved?.searchType)
        ? saved.searchType : 'name',
    }
  } catch {
    return {timeSort: 0, searchType: 'name'}
  }
}
