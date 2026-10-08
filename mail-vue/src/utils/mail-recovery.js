export async function loadCompleteMailPage(request, applyFullList) {
  const data = await request(1)
  const list = Array.isArray(data) ? data : data?.list
  applyFullList(list)
  return data
}

export function canPollMail({active, hidden = false, disposed = false, filtered = false, loading = false}) {
  return active && !hidden && !disposed && !filtered && !loading
}

export function mailPollingDelay(autoRefresh, failures = 0) {
  const normal = Math.max(3000, Number(autoRefresh || 0) * 1000)
  return failures ? Math.max(normal, Math.min(300000, 30000 * 2 ** Math.min(failures - 1, 4))) : normal
}

export function attachmentPath(viewMode) {
  return viewMode === 'physics' ? '/allEmail/attachment' : '/email/attachment'
}
