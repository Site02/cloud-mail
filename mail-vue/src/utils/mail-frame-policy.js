// Only images may load remote resources; mail scripts, frames and requests stay blocked.
export function mailFramePolicy(origin) {
  const url = new URL(origin)
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Invalid mail origin')
  return `default-src 'none'; img-src ${url.origin} https: data: blob:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`
}
