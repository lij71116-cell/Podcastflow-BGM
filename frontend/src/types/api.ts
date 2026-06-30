export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface UserDTO {
  id: string
  username: string
  email: string
  display_name: string
  created_at: string
}

export interface AuthSessionDTO {
  user: UserDTO
  token: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  password_confirm: string
}

export interface LoginPayload {
  mode: 'username' | 'email'
  username?: string
  email?: string
  password: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  new_password_confirm: string
}

export interface ChangePasswordResultDTO {
  password_changed: boolean
  token: string
}

export interface MixConfigDTO {
  podcast_volume: number
  podcast_playback_rate: number
  bgm_volume: number
  bgm_playback_rate: number
  bgm_loop: boolean
  fade_in?: number
  fade_out?: number
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
  cover_url: string
  created_at: string
}

export interface PodcastBriefDTO {
  id: string
  title: string
  podcast_name: string
  cover_url: string
  source_url: string
  description: string
}

export interface BgmBriefDTO {
  id: string
  title: string
  source_type: 'upload' | 'url' | 'qishui_share'
  duration: number
  cover_url: string
}

export type PlayerContext = 'global' | 'inline'

export interface PlaybackProgressDTO {
  mixed_audio_id: string
  player_context: PlayerContext
  position_seconds: number
  duration_seconds?: number | null
  updated_at: string
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
  page: number
  page_size: number
}

export interface BatchDeleteMixedAudiosResponse {
  deleted_count: number
  deleted_ids: string[]
}
