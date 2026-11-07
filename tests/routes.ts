export function route(path: string) {
  return path === '/' ? '/' : `/#${path}`
}
