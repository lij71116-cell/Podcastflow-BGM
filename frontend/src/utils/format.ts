export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 将 API 返回的 ISO 时间转为本地时区的 `YYYY-MM-DD HH:mm` */
/** 卡片日期徽章：`YYYY-MM-DD` */
export function formatDateBadge(iso: string): string {
  const date = parseApiDateTime(iso)
  if (!date) return iso.slice(0, 10)

  const parts = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')}`
}

export function formatCreatedAt(iso: string): string {
  const date = parseApiDateTime(iso)
  if (!date) return iso

  const parts = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

export function parseApiDateTime(iso: string): Date | null {
  const raw = iso.trim()
  if (!raw) return null

  const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw
  const hasTimezone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)
  const parsed = new Date(hasTimezone ? normalized : `${normalized}Z`)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isXiaoyuzhouUrl(url: string): boolean {
  return /xiaoyuzhoufm\.com\/episode\/[a-zA-Z0-9]+/.test(url)
}

export const ACCENT_COLOR = '#2D6A4F'
