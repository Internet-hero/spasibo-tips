export function publicTipUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${window.location.origin}/#${normalized}`
}
