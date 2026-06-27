export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface MixConfigDTO {
  podcast_volume: number
  podcast_playback_rate: number
  bgm_volume: number
  bgm_playback_rate: number
  bgm_loop: boolean
}

export interface PodcastSourceDTO {
  id: string
  source_type: 'xiaoyuzhou_episode'
  source_url: string
  episode_id: string
  title: string
  podcast_name: string
  cover_url: string
  duration: number
  description: string
  created_at: string
}

export interface BgmSourceDTO {
  id: string
  source_type: 'upload' | 'url' | 'qishui_share'
  source_url: string | null
  title: string
  duration: number
  format: string
  status: 'available' | 'unavailable'
  created_at: string
}

export interface PodcastBriefDTO {
  id: string
  title: string
  podcast_name: string
  cover_url: string
  source_url: string
}

export interface BgmBriefDTO {
  id: string
  title: string
  source_type: 'upload' | 'url' | 'qishui_share'
  duration: number
}

export interface MixedAudioAssetDTO {
  id: string
  title: string
  duration: number
  status: 'pending' | 'mixing' | 'completed' | 'failed'
  play_url: string
  download_enabled: false
  created_at: string
  updated_at: string
  podcast: PodcastBriefDTO
  bgm: BgmBriefDTO
  mix_config: MixConfigDTO
  error_message?: string | null
}

export interface MixTaskDTO {
  id: string
  mixed_audio_id: string
  status: 'pending' | 'mixing' | 'completed' | 'failed'
  progress: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

export interface CreateMixedAudioResponse {
  mixed_audio: MixedAudioAssetDTO
  task: MixTaskDTO
}

export interface MixedAudioListResponse {
  items: MixedAudioAssetDTO[]
  total: number
}
