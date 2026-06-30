import type { Dayjs } from 'dayjs'
import type { MixedAudioAssetDTO } from '@/types/api'
import { parseApiDateTime } from '@/utils/format'

export const LIBRARY_PAGE_SIZE = 10

export interface LibraryListQuery {
  page?: number
  page_size?: number
  q?: string
  created_from?: string
  created_to?: string
}

export function filterLibraryAssets(
  assets: MixedAudioAssetDTO[],
  keyword: string,
  dateRange: [Dayjs, Dayjs] | null,
): MixedAudioAssetDTO[] {
  const query = keyword.trim().toLowerCase()

  return assets.filter((asset) => {
    if (query) {
      const searchable = [asset.title, asset.podcast.title, asset.podcast.podcast_name]
        .join(' ')
        .toLowerCase()
      if (!searchable.includes(query)) return false
    }

    if (dateRange) {
      const created = parseApiDateTime(asset.created_at)
      if (!created) return false
      const start = dateRange[0].startOf('day').toDate().getTime()
      const end = dateRange[1].endOf('day').toDate().getTime()
      const time = created.getTime()
      if (time < start || time > end) return false
    }

    return true
  })
}

export function filterLibraryAssetsByQuery(
  assets: MixedAudioAssetDTO[],
  query: LibraryListQuery,
): MixedAudioAssetDTO[] {
  const keyword = query.q ?? ''

  if (query.created_from && query.created_to) {
    const from = query.created_from
    const to = query.created_to
    return assets.filter((asset) => {
      if (keyword.trim()) {
        const searchable = [asset.title, asset.podcast.title, asset.podcast.podcast_name]
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(keyword.trim().toLowerCase())) return false
      }

      const created = parseApiDateTime(asset.created_at)
      if (!created) return false
      const day = created.toISOString().slice(0, 10)
      return day >= from && day <= to
    })
  }

  return filterLibraryAssets(assets, keyword, null)
}

export function paginateAssets<T>(items: T[], page: number, pageSize: number): T[] {
  const offset = (page - 1) * pageSize
  return items.slice(offset, offset + pageSize)
}

export function buildPaginatedList(
  assets: MixedAudioAssetDTO[],
  query: LibraryListQuery,
): { items: MixedAudioAssetDTO[]; total: number; page: number; page_size: number } {
  const page = Math.max(1, query.page ?? 1)
  const page_size = Math.min(50, Math.max(1, query.page_size ?? LIBRARY_PAGE_SIZE))
  const filtered = filterLibraryAssetsByQuery(assets, query)
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return {
    items: paginateAssets(sorted, page, page_size),
    total: sorted.length,
    page,
    page_size,
  }
}
