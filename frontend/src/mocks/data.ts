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
  created_at: '2026-06-23T16:05:00+08:00',
}

export const MOCK_ASSETS: MixedAudioAssetDTO[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    title: '自我进化论｜No.78 - Focus Mix',
    duration: 3180,
    status: 'completed',
    play_url: '/api/mixed-audios/550e8400-e29b-41d4-a716-446655440010/stream',
    download_enabled: false,
    created_at: '2026-06-23T16:20:00+08:00',
    updated_at: '2026-06-23T16:20:00+08:00',
    podcast: {
      id: MOCK_PODCAST.id,
      title: MOCK_PODCAST.title,
      podcast_name: MOCK_PODCAST.podcast_name,
      cover_url: MOCK_PODCAST.cover_url,
      source_url: MOCK_PODCAST.source_url,
    },
    bgm: {
      id: MOCK_BGM.id,
      title: MOCK_BGM.title,
      source_type: MOCK_BGM.source_type,
      duration: MOCK_BGM.duration,
    },
    mix_config: {
      podcast_volume: 1.0,
      podcast_playback_rate: 1.0,
      bgm_volume: 0.15,
      bgm_playback_rate: 1.0,
      bgm_loop: true,
    },
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    title: '文化有限｜Vol.312 - Night Mix',
    duration: 2538,
    status: 'completed',
    play_url: '/api/mixed-audios/550e8400-e29b-41d4-a716-446655440011/stream',
    download_enabled: false,
    created_at: '2026-06-22T21:05:00+08:00',
    updated_at: '2026-06-22T21:05:00+08:00',
    podcast: {
      id: '550e8400-e29b-41d4-a716-446655440012',
      title: '文化有限｜Vol.312：夜晚的城市',
      podcast_name: '文化有限',
      cover_url: 'https://example.com/cover2.jpg',
      source_url: 'https://www.xiaoyuzhoufm.com/episode/example312',
    },
    bgm: {
      id: '550e8400-e29b-41d4-a716-446655440013',
      title: 'Night Ambient',
      source_type: 'upload',
      duration: 240,
    },
    mix_config: { podcast_volume: 1.0, podcast_playback_rate: 1.0, bgm_volume: 0.12, bgm_playback_rate: 1.0, bgm_loop: true },
  },
]

export const MOCK_COVER_COLORS: Record<string, string> = {
  '550e8400-e29b-41d4-a716-446655440010': '#2D6A4F',
  '550e8400-e29b-41d4-a716-446655440011': '#4A5568',
}

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
    },
    bgm: {
      id: bgm.id,
      title: bgm.title,
      source_type: bgm.source_type,
      duration: bgm.duration,
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
