import { useEffect, useRef } from 'react'

export interface MediaSessionMeta {
  title: string
  artist: string
  album?: string
  artworkUrl?: string
}

export interface MediaSessionControl {
  playing: boolean
  duration: number
  position: number
  onPlay: () => void
  onPause: () => void
  onSeek: (seconds: number) => void
}

function resolveArtworkUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
}

function clearActionHandlers() {
  if (!('mediaSession' in navigator)) return
  for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as const) {
    try {
      navigator.mediaSession.setActionHandler(action, null)
    } catch {
      /* action unsupported */
    }
  }
}

/** 绑定 Media Session，支持锁屏/后台播放控制（移动端 PWA 关键能力）。 */
export function useMediaSession(active: boolean, meta: MediaSessionMeta | null, control: MediaSessionControl) {
  const controlRef = useRef(control)

  useEffect(() => {
    controlRef.current = control
  })

  useEffect(() => {
    if (!active || !meta || !('mediaSession' in navigator)) return

    const artwork = resolveArtworkUrl(meta.artworkUrl)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album ?? 'Podcast Flow',
      artwork: artwork
        ? [
            { src: artwork, sizes: '96x96', type: 'image/png' },
            { src: artwork, sizes: '192x192', type: 'image/png' },
            { src: artwork, sizes: '512x512', type: 'image/png' },
          ]
        : [],
    })

    const bind = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        /* unsupported on this platform */
      }
    }

    bind('play', () => controlRef.current.onPlay())
    bind('pause', () => controlRef.current.onPause())
    bind('seekto', (details) => {
      if (details.seekTime == null || Number.isNaN(details.seekTime)) return
      controlRef.current.onSeek(details.seekTime)
    })
    bind('seekbackward', (details) => {
      const skip = details.seekOffset ?? 10
      controlRef.current.onSeek(Math.max(0, controlRef.current.position - skip))
    })
    bind('seekforward', (details) => {
      const skip = details.seekOffset ?? 10
      const max = controlRef.current.duration || Number.MAX_SAFE_INTEGER
      controlRef.current.onSeek(Math.min(max, controlRef.current.position + skip))
    })

    return () => {
      clearActionHandlers()
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.metadata = null
    }
  }, [active, meta?.title, meta?.artist, meta?.album, meta?.artworkUrl])

  useEffect(() => {
    if (!active || !('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = control.playing ? 'playing' : 'paused'
  }, [active, control.playing])

  useEffect(() => {
    if (!active || !('mediaSession' in navigator)) return
    if (!Number.isFinite(control.duration) || control.duration <= 0) return
    try {
      navigator.mediaSession.setPositionState({
        duration: control.duration,
        playbackRate: 1,
        position: Math.min(Math.max(control.position, 0), control.duration),
      })
    } catch {
      /* setPositionState unsupported */
    }
  }, [active, control.duration, control.position, control.playing])
}

export const MOBILE_AUDIO_ATTRS = {
  playsInline: true,
  preload: 'auto' as const,
  'webkit-playsinline': 'true',
  'x-webkit-airplay': 'allow',
}
