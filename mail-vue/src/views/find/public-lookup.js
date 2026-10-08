export function publicLookupErrorKey(error) {
  const code = Number(error?.code ?? error?.response?.data?.code)
  if (code === 400) return 'temporaryInbox.invalidAddress'
  if (code === 403) return 'temporaryInbox.registeredAddress'
  if (code >= 500 || Number(error?.response?.status) >= 500) return 'serverBusyErrorMsg'
  return 'reqFailErrorMsg'
}

export function isRejectedPublicAddress(error) {
  const code = Number(error?.code ?? error?.response?.data?.code)
  return code === 400 || code === 403
}
