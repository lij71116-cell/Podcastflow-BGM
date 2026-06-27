import { create } from 'zustand'
import type { MixedAudioAssetDTO } from '@/types/api'

interface PlayerState {
  visible: boolean
  playing: boolean
  current: MixedAudioAssetDTO | null
  progress: number
  duration: number
  volume: number
  registerAudio: (el: HTMLAudioElement | null) => void
  play: (asset: MixedAudioAssetDTO) => void
  toggle: () => void
  close: () => void
  setProgress: (progress: number) => void
  setVolume: (volume: number) => void
  syncProgress: (progress: number) => void
  syncDuration: (duration: number) => void
  setPlaying: (playing: boolean) => void
  closeIfCurrent: (id: string) => void
}

let audioElement: HTMLAudioElement | null = null

export const usePlayerStore = create<PlayerState>((set, get) => ({
  visible: false,
  playing: false,
  current: null,
  progress: 0,
  duration: 0,
  volume: 80,

  registerAudio: (el) => {
    audioElement = el
  },

  play: (asset) => {
    if (asset.status !== 'completed') {
      return
    }
    const state = get()
    if (state.current?.id === asset.id) {
      set({ visible: true, playing: true })
      void audioElement?.play()
      return
    }
    set({
      visible: true,
      playing: true,
      current: asset,
      progress: 0,
      duration: asset.duration,
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
    set({ visible: false, playing: false, current: null, progress: 0, duration: 0 })
  },

  setProgress: (progress) => {
    set({ progress })
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

  syncProgress: (progress) => set({ progress }),

  syncDuration: (duration) => {
    if (duration > 0) set({ duration })
  },

  setPlaying: (playing) => set({ playing }),

  closeIfCurrent: (id) => {
    if (get().current?.id === id) {
      get().close()
    }
  },
}))
