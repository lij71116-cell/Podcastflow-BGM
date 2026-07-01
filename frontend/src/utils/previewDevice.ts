/** 是否应在创建页使用服务端混音试听（移动端/PWA 双路 audio 不稳定）。 */
export function isTouchPreviewDevice(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 1024px)').matches)
  )
}
