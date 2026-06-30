import type MockAdapter from 'axios-mock-adapter'
import {
  buildMockMixedAsset,
  buildMockTask,
  MOCK_ASSETS,
  MOCK_BGM,
  MOCK_PODCAST,
} from './data'
import type { MixedAudioAssetDTO, MixConfigDTO } from '@/types/api'
import { buildPaginatedList, type LibraryListQuery } from '@/utils/libraryList'

const taskProgress = new Map<string, number>()
let mockAssetStore: MixedAudioAssetDTO[] = [...MOCK_ASSETS]

function parseListQuery(url: string | undefined): LibraryListQuery {
  const queryString = url?.includes('?') ? url.split('?')[1] : ''
  const params = new URLSearchParams(queryString)
  return {
    page: Number(params.get('page') ?? '1'),
    page_size: Number(params.get('page_size') ?? '10'),
    q: params.get('q') ?? undefined,
    created_from: params.get('created_from') ?? undefined,
    created_to: params.get('created_to') ?? undefined,
  }
}

export function getMockAssetStore() {
  return mockAssetStore
}

export function setupPodcastMock(mock: MockAdapter) {
  mock.onPost('/podcasts/parse').reply((config) => {
    const body = JSON.parse(config.data as string) as { source_url: string }
    const url = body.source_url ?? ''
    if (!/xiaoyuzhoufm\.com\/episode\/[a-zA-Z0-9]+/.test(url)) {
      return [400, { code: 40001, message: '链接格式无效，请输入小宇宙公开单集链接', data: null }]
    }
    return [200, { code: 200, message: 'success', data: MOCK_PODCAST }]
  })
}

export function setupBgmMock(mock: MockAdapter) {
  mock.onPost('/bgm/upload').reply(() => {
    return [200, { code: 200, message: 'success', data: MOCK_BGM }]
  })

  mock.onPost('/bgm/validate-url').reply((config) => {
    const body = JSON.parse(config.data as string) as { source_url: string }
    if (!body.source_url?.startsWith('http')) {
      return [400, { code: 40005, message: 'BGM 链接不可用', data: null }]
    }
    return [
      200,
      {
        code: 200,
        message: 'success',
        data: { ...MOCK_BGM, source_type: 'url', source_url: body.source_url },
      },
    ]
  })

  mock.onPost('/bgm/validate-qishui').reply((config) => {
    const body = JSON.parse(config.data as string) as { share_url: string }
    const shareUrl = body.share_url?.trim() ?? ''
    if (!/qishui\.douyin\.com\/s\/[a-zA-Z0-9]+/.test(shareUrl)) {
      return [
        400,
        {
          code: 40007,
          message: '链接格式无效，请输入汽水音乐分享链接（qishui.douyin.com/s/...）',
          data: null,
        },
      ]
    }
    return [
      200,
      {
        code: 200,
        message: 'success',
        data: {
          ...MOCK_BGM,
          source_type: 'qishui_share',
          source_url: shareUrl,
          title: '假装看不见（却用余光看了上千遍） - 朴恩炫',
        },
      },
    ]
  })
}

export function setupMixedAudioMock(mock: MockAdapter) {
  // 播放走浏览器原生 audio 请求 /api/mixed-audios/{id}/stream（不经 axios mock）
  mock.onPost('/mixed-audios').reply(() => {
    const mixed = buildMockMixedAsset(MOCK_PODCAST, MOCK_BGM)
    mixed.status = 'completed'
    mixed.created_at = new Date().toISOString()
    mixed.updated_at = mixed.created_at
    mockAssetStore = [mixed, ...mockAssetStore.filter((a) => a.id !== mixed.id)]
    taskProgress.set(mixed.id, 0)
    return [
      200,
      {
        code: 200,
        message: 'success',
        data: {
          mixed_audio: mixed,
          task: buildMockTask(mixed.id, 0),
        },
      },
    ]
  })

  mock.onGet('/mixed-audios').reply((config) => {
    const query = parseListQuery(config.url)
    const data = buildPaginatedList(mockAssetStore, query)
    return [200, { code: 200, message: 'success', data }]
  })

  mock.onDelete('/mixed-audios/batch').reply((config) => {
    const body = JSON.parse(config.data as string) as { ids?: string[] }
    const ids = body.ids ?? []
    mockAssetStore = mockAssetStore.filter((asset) => !ids.includes(asset.id))
    return [
      200,
      {
        code: 200,
        message: 'success',
        data: { deleted_count: ids.length, deleted_ids: ids },
      },
    ]
  })

  mock.onGet(/^\/mixed-audios\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!
    const asset = mockAssetStore.find((a) => a.id === id)
    if (!asset) {
      return [404, { code: 40401, message: '组合音频不存在', data: null }]
    }
    return [200, { code: 200, message: 'success', data: asset }]
  })

  mock.onDelete(/^\/mixed-audios\/[^/]+$/).reply((config) => {
    const id = config.url!.split('/').pop()!
    mockAssetStore = mockAssetStore.filter((a) => a.id !== id)
    return [200, { code: 200, message: 'success', data: { deleted: true, id } }]
  })

  mock.onPost(/\/mixed-audios\/[^/]+\/regenerate$/).reply((config) => {
    const mixedId = config.url!.split('/')[2]
    const body = JSON.parse(config.data as string) as { mix_config?: MixConfigDTO }
    const asset = mockAssetStore.find((a) => a.id === mixedId)
    if (!asset) {
      return [404, { code: 40401, message: '组合音频不存在', data: null }]
    }
    if (asset.status === 'pending' || asset.status === 'mixing') {
      return [409, { code: 40901, message: '合成进行中，请勿重复提交', data: null }]
    }
    const updated: MixedAudioAssetDTO = {
      ...asset,
      mix_config: body.mix_config ?? asset.mix_config,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }
    mockAssetStore = mockAssetStore.map((a) => (a.id === mixedId ? updated : a))
    taskProgress.set(mixedId, 0)
    return [
      200,
      {
        code: 200,
        message: 'success',
        data: {
          mixed_audio: updated,
          task: buildMockTask(mixedId, 0),
        },
      },
    ]
  })

  mock.onGet(/\/mixed-audios\/[^/]+\/task$/).reply((config) => {
    const mixedId = config.url!.split('/')[2]
    const current = Math.min((taskProgress.get(mixedId) ?? 0) + 25, 100)
    taskProgress.set(mixedId, current)
    if (current >= 100) {
      mockAssetStore = mockAssetStore.map((asset) =>
        asset.id === mixedId ? { ...asset, status: 'completed', updated_at: new Date().toISOString() } : asset,
      )
    }
    return [200, { code: 200, message: 'success', data: buildMockTask(mixedId, current) }]
  })

  const mockProgressStore = new Map<string, { global?: number; inline?: number }>()

  mock.onPut(/\/mixed-audios\/[^/]+\/playback-progress$/).reply((config) => {
    const mixedId = config.url!.split('/')[2]
    const body = JSON.parse(config.data as string) as {
      player_context: 'global' | 'inline'
      position_seconds: number
      duration_seconds?: number
    }
    const entry = mockProgressStore.get(mixedId) ?? {}
    entry[body.player_context] = body.position_seconds
    mockProgressStore.set(mixedId, entry)
    return [
      200,
      {
        code: 200,
        message: 'success',
        data: {
          mixed_audio_id: mixedId,
          player_context: body.player_context,
          position_seconds: body.position_seconds,
          duration_seconds: body.duration_seconds ?? null,
          updated_at: new Date().toISOString(),
        },
      },
    ]
  })

  mock.onGet(/\/mixed-audios\/[^/]+\/playback-progress$/).reply((config) => {
    const mixedId = config.url!.split('/')[2]
    const context = new URL(config.url!, 'http://local').searchParams.get('player_context') as
      | 'global'
      | 'inline'
      | null
    const entry = mockProgressStore.get(mixedId)
    const position = context && entry ? entry[context] : undefined
    if (position === undefined) {
      return [200, { code: 200, message: 'success', data: null }]
    }
    return [
      200,
      {
        code: 200,
        message: 'success',
        data: {
          mixed_audio_id: mixedId,
          player_context: context,
          position_seconds: position,
          duration_seconds: null,
          updated_at: new Date().toISOString(),
        },
      },
    ]
  })
}
