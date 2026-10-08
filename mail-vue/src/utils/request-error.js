export function requestErrorMessage(error, fallbackKey, t) {
  if (Number.isInteger(error?.code) && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return t('timeoutErrorMsg')
  }
  if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error')) {
    return t('networkErrorMsg')
  }
  return t(fallbackKey)
}
