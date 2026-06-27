import type { Dayjs } from 'dayjs'
import type { MixedAudioAssetDTO } from '@/types/api'
import { parseApiDateTime } from '@/utils/format'

export const LIBRARY_PAGE_SIZE = 12

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

export function paginateAssets<T>(items: T[], page: number, pageSize: number): T[] {
  const offset = (page - 1) * pageSize
  return items.slice(offset, offset + pageSize)
}
