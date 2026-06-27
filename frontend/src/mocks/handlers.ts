import type MockAdapter from 'axios-mock-adapter'
import {
  buildMockMixedAsset,
  buildMockTask,
  MOCK_ASSETS,
  MOCK_BGM,
  MOCK_PODCAST,
} from './data'
import type { MixedAudioAssetDTO } from '@/types/api'

const taskProgress = new Map<string, number>()
let mockAssetStore: MixedAudioAssetDTO[] = [...MOCK_ASSETS]

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

  mock.onGet('/mixed-audios').reply(() => {
    const items = [...mockAssetStore].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    return [200, { code: 200, message: 'success', data: { items, total: items.length } }]
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

  mock.onGet(/\/mixed-audios\/[^/]+\/task$/).reply((config) => {
    const mixedId = config.url!.split('/')[2]
    const current = Math.min((taskProgress.get(mixedId) ?? 0) + 25, 100)
    taskProgress.set(mixedId, current)
    return [200, { code: 200, message: 'success', data: buildMockTask(mixedId, current) }]
  })
}
