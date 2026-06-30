import type {
  BgmSourceDTO,
  MixTaskDTO,
  MixedAudioAssetDTO,
  PodcastSourceDTO,
} from '@/types/api'

export const MOCK_PODCAST: PodcastSourceDTO = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  source_type: 'xiaoyuzhou_episode',
  source_url: 'https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e',
  episode_id: '696f522e109824f9e18a114e',
  title: '自我进化论｜No.78：情关过后，人生尽是自由',
  podcast_name: '自我进化论',
  cover_url: 'https://example.com/cover.jpg',
  duration: 3180,
  description: '探讨情感关系中的成长与自我解放，如何在经历情关后找到内在自由。',
  created_at: '2026-06-23T16:00:00+08:00',
}

export const MOCK_BGM: BgmSourceDTO = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  source_type: 'upload',
  source_url: null,
  title: 'Focus Rain',
  duration: 180,
  format: 'mp3',
  status: 'available',
  cover_url: '',
  created_at: '2026-06-23T16:05:00+08:00',
}

export const MOCK_COVER_COLORS: Record<string, string> = {}

const LIBRARY_SEED: Array<{
  title: string
  podcast_name: string
  bgm_title: string
  duration: number
  daysAgo: number
  coverColor: string
  bgmColor: string
}> = [
  { title: '如何建立可持续的专注习惯', podcast_name: '效率圆桌', bgm_title: 'Focus Rain', duration: 3180, daysAgo: 0, coverColor: '#2D6A4F', bgmColor: '#B32B00' },
  { title: '夜间放松漫谈', podcast_name: '睡前故事', bgm_title: 'Ambient Night', duration: 2535, daysAgo: 1, coverColor: '#4A5568', bgmColor: '#102A43' },
  { title: '产品思维入门：从零构建复杂系统', podcast_name: '创新工坊', bgm_title: 'Product Design', duration: 4530, daysAgo: 2, coverColor: '#40655C', bgmColor: '#40655C' },
  { title: '自我进化论｜No.78 - Focus Mix', podcast_name: '自我进化论', bgm_title: 'Focus Rain', duration: 3180, daysAgo: 3, coverColor: '#2D6A4F', bgmColor: '#B32B00' },
  { title: '文化有限｜Vol.312 - Night Mix', podcast_name: '文化有限', bgm_title: 'Night Ambient', duration: 2538, daysAgo: 4, coverColor: '#5C4D7D', bgmColor: '#102A43' },
  { title: '硅谷早知道：AI 时代的创作者经济', podcast_name: '硅谷早知道', bgm_title: 'Soft Pulse', duration: 2100, daysAgo: 5, coverColor: '#1E5248', bgmColor: '#163D35' },
  { title: '忽左忽右：城市漫步与记忆', podcast_name: '忽左忽右', bgm_title: 'City Walk', duration: 3720, daysAgo: 6, coverColor: '#6B705C', bgmColor: '#512D24' },
  { title: '声东击西：远程工作的边界', podcast_name: '声东击西', bgm_title: 'Lo-Fi Desk', duration: 2880, daysAgo: 7, coverColor: '#457B9D', bgmColor: '#40655C' },
  { title: '纵横四海：习惯与意志力', podcast_name: '纵横四海', bgm_title: 'Morning Light', duration: 4200, daysAgo: 8, coverColor: '#E09F3E', bgmColor: '#B32B00' },
  { title: '无人知晓：关于不确定性的对话', podcast_name: '无人知晓', bgm_title: 'Deep Focus', duration: 3300, daysAgo: 9, coverColor: '#264653', bgmColor: '#163D35' },
  { title: '得意忘形：创作与心流', podcast_name: '得意忘形', bgm_title: 'Flow State', duration: 2760, daysAgo: 10, coverColor: '#2A9D8F', bgmColor: '#40655C' },
  { title: '随机波动：女性主义与日常', podcast_name: '随机波动', bgm_title: 'Gentle Rain', duration: 2940, daysAgo: 11, coverColor: '#9D4EDD', bgmColor: '#512D24' },
  { title: '谐星聊天会：段子背后的结构', podcast_name: '谐星聊天会', bgm_title: 'Warm Vinyl', duration: 3600, daysAgo: 12, coverColor: '#BC6C25', bgmColor: '#B32B00' },
  { title: '日谈公园：电影与人生', podcast_name: '日谈公园', bgm_title: 'Cinema Hall', duration: 3180, daysAgo: 13, coverColor: '#6D597A', bgmColor: '#102A43' },
  { title: 'Steve说：情绪与关系', podcast_name: 'Steve说', bgm_title: 'Calm Ocean', duration: 3420, daysAgo: 14, coverColor: '#0077B6', bgmColor: '#163D35' },
  { title: '知行小酒馆：理财入门', podcast_name: '知行小酒馆', bgm_title: 'Market Open', duration: 2400, daysAgo: 15, coverColor: '#588157', bgmColor: '#40655C' },
  { title: '三五环：产品评审现场', podcast_name: '三五环', bgm_title: 'Whiteboard', duration: 3900, daysAgo: 16, coverColor: '#3D405B', bgmColor: '#512D24' },
  { title: '疯投圈：早期投资复盘', podcast_name: '疯投圈', bgm_title: 'Boardroom', duration: 2700, daysAgo: 17, coverColor: '#E63946', bgmColor: '#B32B00' },
  { title: '商业就是这样：品牌叙事', podcast_name: '商业就是这样', bgm_title: 'Brand Story', duration: 2550, daysAgo: 18, coverColor: '#F4A261', bgmColor: '#40655C' },
  { title: '播客公社：剪辑技巧分享', podcast_name: '播客公社', bgm_title: 'Edit Bay', duration: 2220, daysAgo: 19, coverColor: '#2B2D42', bgmColor: '#102A43' },
  { title: '科技乱炖：大模型一周报', podcast_name: '科技乱炖', bgm_title: 'Neural Net', duration: 3480, daysAgo: 20, coverColor: '#118AB2', bgmColor: '#163D35' },
  { title: '设计药丸：界面与体验', podcast_name: '设计药丸', bgm_title: 'UI Kit', duration: 2640, daysAgo: 21, coverColor: '#8338EC', bgmColor: '#512D24' },
  { title: '故事FM：普通人的非凡时刻', podcast_name: '故事FM', bgm_title: 'Story Bed', duration: 3060, daysAgo: 22, coverColor: '#606C38', bgmColor: '#40655C' },
  { title: '黑水公园：悬疑电影夜', podcast_name: '黑水公园', bgm_title: 'Dark Alley', duration: 3360, daysAgo: 23, coverColor: '#212529', bgmColor: '#102A43' },
]

function buildLibraryMockAsset(index: number): MixedAudioAssetDTO {
  const seed = LIBRARY_SEED[index % LIBRARY_SEED.length]
  const id = `550e8400-e29b-41d4-a716-44665544${String(1000 + index).padStart(4, '0')}`
  const created = new Date()
  created.setDate(created.getDate() - seed.daysAgo)
  created.setHours(10 + (index % 8), (index * 7) % 60, 0, 0)
  const createdAt = created.toISOString()

  MOCK_COVER_COLORS[id] = seed.coverColor

  return {
    id,
    title: seed.title,
    duration: seed.duration,
    status: 'completed',
    play_url: `/api/mixed-audios/${id}/stream`,
    download_enabled: false,
    created_at: createdAt,
    updated_at: createdAt,
    podcast: {
      id: `550e8400-e29b-41d4-a716-44665544${String(2000 + index).padStart(4, '0')}`,
      title: seed.title,
      podcast_name: seed.podcast_name,
      cover_url: index % 3 === 0 ? `https://picsum.photos/seed/pf-${index}/640/360` : '',
      source_url: `https://www.xiaoyuzhoufm.com/episode/mock-${index}`,
      description:
        index % 2 === 0
          ? '本期为 Mock 短介绍，可直接完整展示。'
          : '在信息过载的时代，专注力已成为最稀缺的资源之一。本期节目，我们邀请到行为设计专家，从环境搭建、时间块管理、以及「最小专注单元」三个维度，拆解如何建立一套可持续的专注习惯——不是依靠意志力硬撑，而是让专注变成低摩擦的日常默认选项。内容较长时会自动出现收起/展开。',
    },
    bgm: {
      id: `550e8400-e29b-41d4-a716-44665544${String(3000 + index).padStart(4, '0')}`,
      title: seed.bgm_title,
      source_type: index % 4 === 0 ? 'url' : 'upload',
      duration: 180 + (index % 5) * 30,
      cover_url: index % 3 === 0 ? `https://picsum.photos/seed/bgm-${index}/320/320` : '',
    },
    mix_config: {
      podcast_volume: 1.0,
      podcast_playback_rate: 1.0,
      bgm_volume: 0.12 + (index % 5) * 0.01,
      bgm_playback_rate: 1.0,
      bgm_loop: true,
      fade_in: 2,
      fade_out: 3,
    },
  }
}

export const MOCK_ASSETS: MixedAudioAssetDTO[] = Array.from({ length: 24 }, (_, index) =>
  buildLibraryMockAsset(index),
)

export const MOCK_BGM_BADGE_COLORS: Record<string, string> = Object.fromEntries(
  MOCK_ASSETS.map((asset, index) => [
    asset.id,
    LIBRARY_SEED[index % LIBRARY_SEED.length].bgmColor,
  ]),
)

export const MOCK_COVER_COLOR = '#2D6A4F'

export function buildMockMixedAsset(
  podcast: PodcastSourceDTO,
  bgm: BgmSourceDTO,
): MixedAudioAssetDTO {
  const id = '550e8400-e29b-41d4-a716-446655440003'
  return {
    id,
    title: `${podcast.title} - Focus Mix`,
    duration: podcast.duration,
    status: 'pending',
    play_url: `/api/mixed-audios/${id}/stream`,
    download_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    podcast: {
      id: podcast.id,
      title: podcast.title,
      podcast_name: podcast.podcast_name,
      cover_url: podcast.cover_url,
      source_url: podcast.source_url,
      description: podcast.description,
    },
    bgm: {
      id: bgm.id,
      title: bgm.title,
      source_type: bgm.source_type,
      duration: bgm.duration,
      cover_url: bgm.cover_url ?? '',
    },
    mix_config: {
      podcast_volume: 1.0,
      podcast_playback_rate: 1.0,
      bgm_volume: 0.15,
      bgm_playback_rate: 1.0,
      bgm_loop: true,
    },
  }
}

export function buildMockTask(mixedAudioId: string, progress = 0): MixTaskDTO {
  return {
    id: '550e8400-e29b-41d4-a716-446655440004',
    mixed_audio_id: mixedAudioId,
    status: progress >= 100 ? 'completed' : 'mixing',
    progress,
    error_message: null,
    started_at: new Date().toISOString(),
    completed_at: progress >= 100 ? new Date().toISOString() : null,
  }
}
