import { create } from 'zustand'
import { MOCK_COVER_COLORS } from '@/mocks/data'
import type { MixedAudioAssetDTO } from '@/types/api'

interface PlayerState {
  visible: boolean
  playing: boolean
  current: MixedAudioAssetDTO | null
  progress: number
  duration: number
  volume: number
  accentColor: string
  resumeHint: boolean
  registerAudio: (el: HTMLAudioElement | null) => void
  play: (asset: MixedAudioAssetDTO) => void
  toggle: () => void
  close: () => void
  setProgress: (progress: number) => void
  setVolume: (volume: number) => void
  syncProgress: (progress: number) => void
  syncDuration: (duration: number) => void
  setPlaying: (playing: boolean) => void
  setResumeHint: (resumeHint: boolean) => void
  clearResumeHint: () => void
  closeIfCurrent: (id: string) => void
}

let audioElement: HTMLAudioElement | null = null

function resolveAccentColor(asset: MixedAudioAssetDTO): string {
  return MOCK_COVER_COLORS[asset.id] ?? '#163d35'
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  visible: false,
  playing: false,
  current: null,
  progress: 0,
  duration: 0,
  volume: 80,
  accentColor: '#163d35',
  resumeHint: false,

  registerAudio: (el) => {
    audioElement = el
  },

  play: (asset) => {
    if (asset.status !== 'completed') {
      return
    }
    const state = get()
    const accentColor = resolveAccentColor(asset)
    if (state.current?.id === asset.id) {
      set({ visible: true, playing: true, accentColor })
      void audioElement?.play()
      return
    }
    set({
      visible: true,
      playing: true,
      current: asset,
      progress: 0,
      duration: asset.duration,
      accentColor,
      resumeHint: false,
    })
  },

  toggle: () => {
    const next = !get().playing
    set({ playing: next })
    if (next) {
      void audioElement?.play()
    } else {
      audioElement?.pause()
    }
  },

  close: () => {
    if (audioElement) {
      audioElement.pause()
      audioElement.removeAttribute('src')
      audioElement.load()
    }
    set({
      visible: false,
      playing: false,
      current: null,
      progress: 0,
      duration: 0,
      resumeHint: false,
      accentColor: '#163d35',
    })
  },

  setProgress: (progress) => {
    set({ progress, resumeHint: false })
    if (audioElement && Number.isFinite(progress)) {
      audioElement.currentTime = progress
    }
  },

  setVolume: (volume) => {
    set({ volume })
    if (audioElement) {
      audioElement.volume = volume / 100
    }
  },

  syncProgress: (progress) => {
    set({ progress })
  },

  syncDuration: (duration) => {
    if (duration > 0) set({ duration })
  },

  setPlaying: (playing) => set({ playing }),

  setResumeHint: (resumeHint) => set({ resumeHint }),

  clearResumeHint: () => set({ resumeHint: false }),

  closeIfCurrent: (id) => {
    if (get().current?.id === id) {
      get().close()
    }
  },
}))
