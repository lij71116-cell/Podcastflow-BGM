import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Slider, Typography } from 'antd'
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons'
import './MixPreviewPlayer.css'

interface MixPreviewPlayerProps {
  podcastId: string
  bgmId: string
  podcastVolume: number
  podcastPlaybackRate: number
  bgmVolume: number
  bgmPlaybackRate: number
  bgmLoop: boolean
  playToken: number
  onError?: (message: string) => void
}

const podcastStreamUrl = (id: string) => `/api/podcasts/${id}/stream`
const bgmStreamUrl = (id: string) => `/api/bgm/${id}/stream`

function clampRate(rate: number): number {
  return Math.min(2, Math.max(0.6, rate))
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function syncBgmTime(bgm: HTMLAudioElement, podcastTime: number) {
  if (!Number.isFinite(bgm.duration) || bgm.duration <= 0) {
    bgm.currentTime = podcastTime
    return
  }
  bgm.currentTime = podcastTime % bgm.duration
}

export function MixPreviewPlayer({
  podcastId,
  bgmId,
  podcastVolume,
  podcastPlaybackRate,
  bgmVolume,
  bgmPlaybackRate,
  bgmLoop,
  playToken,
  onError,
}: MixPreviewPlayerProps) {
  const podcastRef = useRef<HTMLAudioElement>(null)
  const bgmRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const startBoth = useCallback(async () => {
    const podcast = podcastRef.current
    const bgm = bgmRef.current
    if (!podcast || !bgm) return

    syncBgmTime(bgm, podcast.currentTime)
    try {
      await podcast.play()
      await bgm.play()
      setPlaying(true)
    } catch {
      onError?.('无法自动播放，请点击播放按钮')
      setPlaying(false)
    }
  }, [onError])

  const pauseAudioElements = useCallback(() => {
    podcastRef.current?.pause()
    bgmRef.current?.pause()
  }, [])

  useEffect(() => {
    const podcast = podcastRef.current
    if (podcast) {
      podcast.volume = Math.min(1, Math.max(0, podcastVolume / 100))
    }
  }, [podcastVolume])

  useEffect(() => {
    const bgm = bgmRef.current
    if (bgm) {
      bgm.volume = Math.min(1, Math.max(0, bgmVolume / 100))
    }
  }, [bgmVolume])

  useEffect(() => {
    const podcast = podcastRef.current
    if (podcast) {
      podcast.playbackRate = clampRate(podcastPlaybackRate)
    }
  }, [podcastPlaybackRate])

  useEffect(() => {
    const bgm = bgmRef.current
    if (bgm) {
      bgm.playbackRate = clampRate(bgmPlaybackRate)
    }
  }, [bgmPlaybackRate])

  useEffect(() => {
    const bgm = bgmRef.current
    if (bgm) {
      bgm.loop = bgmLoop
    }
  }, [bgmLoop])

  useEffect(() => {
    const podcast = podcastRef.current
    const bgm = bgmRef.current
    if (!podcast || !bgm) return

    const onTimeUpdate = () => {
      setProgress(Math.floor(podcast.currentTime))
      if (playing && !bgm.paused) {
        syncBgmTime(bgm, podcast.currentTime)
      }
    }
    const onLoadedMetadata = () => {
      if (Number.isFinite(podcast.duration) && podcast.duration > 0) {
        setDuration(Math.floor(podcast.duration))
      }
    }
    const onEnded = () => {
      bgm.pause()
      setPlaying(false)
    }
    const onPodcastError = () => {
      onError?.('播客音频加载失败，请重新解析播客后再试')
      bgm.pause()
      setPlaying(false)
    }

    podcast.addEventListener('timeupdate', onTimeUpdate)
    podcast.addEventListener('loadedmetadata', onLoadedMetadata)
    podcast.addEventListener('ended', onEnded)
    podcast.addEventListener('error', onPodcastError)

    return () => {
      podcast.removeEventListener('timeupdate', onTimeUpdate)
      podcast.removeEventListener('loadedmetadata', onLoadedMetadata)
      podcast.removeEventListener('ended', onEnded)
      podcast.removeEventListener('error', onPodcastError)
    }
  }, [playing, onError])

  useEffect(() => {
    if (playToken <= 0) {
      pauseAudioElements()
      return
    }

    const podcast = podcastRef.current
    if (!podcast) return

    let cancelled = false

    const tryAutoPlay = () => {
      if (cancelled) return
      podcast.currentTime = 0
      const bgm = bgmRef.current
      if (bgm) bgm.currentTime = 0
      setProgress(0)
      void startBoth()
    }

    const onCanPlay = () => tryAutoPlay()

    if (podcast.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      tryAutoPlay()
    } else {
      podcast.addEventListener('canplay', onCanPlay, { once: true })
      podcast.load()
    }

    return () => {
      cancelled = true
      podcast.removeEventListener('canplay', onCanPlay)
    }
  }, [playToken, pauseAudioElements, startBoth])

  const handleToggle = () => {
    if (playing) {
      pauseAudioElements()
      setPlaying(false)
    } else {
      void startBoth()
    }
  }

  const handleSeek = (value: number) => {
    const podcast = podcastRef.current
    const bgm = bgmRef.current
    if (!podcast) return
    podcast.currentTime = value
    if (bgm) syncBgmTime(bgm, value)
    setProgress(value)
  }

  if (playToken <= 0) {
    return null
  }

  const totalDuration = duration > 0 ? duration : 100

  return (
    <div className="mix-preview-player">
      <Typography.Text type="secondary" className="mix-preview-player-hint">
        播客与 BGM 双轨试听；音量与倍速请在上方混音配置中调整
      </Typography.Text>
      <audio
        key={`podcast-${podcastId}-${playToken}`}
        ref={podcastRef}
        preload="auto"
        src={podcastStreamUrl(podcastId)}
        style={{ display: 'none' }}
        aria-hidden
      />
      <audio
        key={`bgm-${bgmId}-${playToken}`}
        ref={bgmRef}
        preload="auto"
        src={bgmStreamUrl(bgmId)}
        style={{ display: 'none' }}
        aria-hidden
      />
      <div className="mix-preview-player-controls">
        <Button
          type="primary"
          shape="circle"
          icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={handleToggle}
          aria-label={playing ? '暂停试听' : '播放试听'}
        />
        <Slider
          className="mix-preview-player-progress"
          min={0}
          max={totalDuration}
          value={Math.min(progress, totalDuration)}
          onChange={handleSeek}
          tooltip={{ formatter: (v) => formatTime(v ?? 0) }}
        />
        <span className="mix-preview-player-time">
          {formatTime(progress)} / {formatTime(totalDuration)}
        </span>
      </div>
    </div>
  )
}
