import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Slider } from 'antd'
import { CaretRightOutlined, LoadingOutlined, PauseOutlined, SoundOutlined } from '@ant-design/icons'
import { MOBILE_AUDIO_ATTRS } from '@/hooks/useMediaSession'
import { isTouchPreviewDevice } from '@/utils/previewDevice'
import './MixPreviewPlayer.css'

export interface ServerPreviewSource {
  playUrl: string
  duration: number
}

interface MixPreviewPlayerProps {
  podcastId: string
  bgmId: string
  podcastDurationSec: number
  podcastVolume: number
  podcastPlaybackRate: number
  bgmVolume: number
  bgmPlaybackRate: number
  bgmLoop: boolean
  masterVolume: number
  onMasterVolumeChange: (value: number) => void
  playToken: number
  serverPreview?: ServerPreviewSource | null
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

function waitForStreamReady(
  audio: HTMLAudioElement,
  label: string,
  timeoutMs = 90000,
): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error(`${label} load timeout`))
    }, timeoutMs)
    const onReady = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(`${label} load error`))
    }
    const cleanup = () => {
      window.clearTimeout(timeout)
      audio.removeEventListener('canplay', onReady)
      audio.removeEventListener('loadeddata', onReady)
      audio.removeEventListener('error', onError)
    }
    audio.addEventListener('canplay', onReady, { once: true })
    audio.addEventListener('loadeddata', onReady, { once: true })
    audio.addEventListener('error', onError, { once: true })
  })
}

interface PreviewShellProps {
  playing: boolean
  preparing: boolean
  streamsReady: boolean
  progress: number
  sliderMax: number
  masterVolume: number
  title: string
  subtitle: string
  onToggle: () => void
  onSeek: (value: number) => void
  onMasterVolumeChange: (value: number) => void
  audio: React.ReactNode
}

function PreviewShell({
  playing,
  preparing,
  streamsReady,
  progress,
  sliderMax,
  masterVolume,
  title,
  subtitle,
  onToggle,
  onSeek,
  onMasterVolumeChange,
  audio,
}: PreviewShellProps) {
  const playDisabled = preparing || !streamsReady

  return (
    <div className="mix-preview-player">
      {audio}
      <div className="mix-preview-player-head">
        <div className="mix-preview-player-head-left">
          <Button
            type="primary"
            shape="circle"
            className="mix-preview-player-play-btn"
            icon={
              preparing ? (
                <LoadingOutlined spin />
              ) : playing ? (
                <PauseOutlined />
              ) : (
                <CaretRightOutlined />
              )
            }
            onClick={onToggle}
            disabled={playDisabled}
            aria-label={preparing ? '试听加载中' : playing ? '暂停试听' : '播放试听'}
          />
          <div className="mix-preview-player-meta">
            <p className="mix-preview-player-title">{title}</p>
            <p className="mix-preview-player-subtitle">{subtitle}</p>
          </div>
        </div>
        <span className="mix-preview-player-time">
          {formatTime(progress)} / {formatTime(sliderMax)}
        </span>
      </div>
      <div className={`preview-wave-bars${playing ? '' : ' paused'}`} aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="preview-controls-row">
        <span className="mix-preview-control-label">进度</span>
        <Slider
          className="mix-preview-player-progress"
          min={0}
          max={sliderMax}
          value={Math.min(progress, sliderMax)}
          onChange={onSeek}
          disabled={playDisabled}
          tooltip={{ formatter: (v) => formatTime(v ?? 0) }}
        />
      </div>
      <div className="preview-controls-row">
        <SoundOutlined className="mix-preview-volume-icon" aria-hidden />
        <Slider
          className="mix-preview-player-volume"
          min={0}
          max={100}
          value={masterVolume}
          onChange={onMasterVolumeChange}
          disabled={playDisabled}
          tooltip={{ formatter: (v) => `${v ?? 0}%` }}
        />
        <span className="mix-preview-control-value">{masterVolume}%</span>
      </div>
    </div>
  )
}

function ServerMixPreviewPlayer({
  serverPreview,
  masterVolume,
  onMasterVolumeChange,
  playToken,
  onError,
}: Pick<
  MixPreviewPlayerProps,
  'serverPreview' | 'masterVolume' | 'onMasterVolumeChange' | 'playToken' | 'onError'
> & { serverPreview: ServerPreviewSource }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [streamsReady, setStreamsReady] = useState(false)
  const [preparing, setPreparing] = useState(true)

  const totalDuration = serverPreview.duration

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = Math.min(1, Math.max(0, masterVolume / 100))
    }
  }, [masterVolume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setProgress(Math.floor(audio.currentTime))
    const onEnded = () => setPlaying(false)
    const handleAudioError = () => {
      onError?.('试听音频加载失败，请重新生成')
      setPlaying(false)
      setStreamsReady(false)
      setPreparing(false)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', handleAudioError)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', handleAudioError)
    }
  }, [onError])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let cancelled = false
    setPreparing(true)
    setStreamsReady(false)
    setPlaying(false)
    setProgress(0)

    void (async () => {
      try {
        await waitForStreamReady(audio, '试听', 60000)
        if (cancelled) return
        setStreamsReady(true)
        setPreparing(false)
      } catch {
        if (cancelled) return
        setPreparing(false)
        onError?.('试听音频加载失败，请稍后重试')
      }
    })()

    return () => {
      cancelled = true
      audio.pause()
    }
  }, [playToken, serverPreview.playUrl, onError])

  const handleToggle = () => {
    const audio = audioRef.current
    if (!audio || preparing || !streamsReady) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    void audio.play().then(() => setPlaying(true)).catch(() => {
      onError?.('无法播放试听，请点击播放按钮重试')
      setPlaying(false)
    })
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setProgress(value)
  }

  const sliderMax = totalDuration > 0 ? totalDuration : Math.max(progress, 1)

  return (
    <PreviewShell
      playing={playing}
      preparing={preparing}
      streamsReady={streamsReady}
      progress={progress}
      sliderMax={sliderMax}
      masterVolume={masterVolume}
      title={preparing ? '正在加载试听…' : playing ? '试听播放中' : '试听已就绪'}
      subtitle={
        preparing
          ? '服务端混音文件缓冲中'
          : streamsReady && !playing
            ? '请点击播放按钮开始试听'
            : '已混音试听片段（约 60 秒）· 音量可在下方调整'
      }
      onToggle={handleToggle}
      onSeek={handleSeek}
      onMasterVolumeChange={onMasterVolumeChange}
      audio={
        <audio
          key={`preview-${playToken}-${serverPreview.playUrl}`}
          ref={audioRef}
          {...MOBILE_AUDIO_ATTRS}
          src={serverPreview.playUrl}
          style={{ display: 'none' }}
          aria-hidden
        />
      }
    />
  )
}

function DualMixPreviewPlayer(props: MixPreviewPlayerProps) {
  const {
    podcastId,
    bgmId,
    podcastDurationSec,
    podcastVolume,
    podcastPlaybackRate,
    bgmVolume,
    bgmPlaybackRate,
    bgmLoop,
    masterVolume,
    onMasterVolumeChange,
    playToken,
    onError,
  } = props

  const podcastRef = useRef<HTMLAudioElement>(null)
  const bgmRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [streamDuration, setStreamDuration] = useState(0)
  const [streamsReady, setStreamsReady] = useState(false)
  const [preparing, setPreparing] = useState(false)

  const totalDuration = Math.max(
    podcastDurationSec,
    Number.isFinite(streamDuration) && streamDuration > 0 ? streamDuration : 0,
  )

  const pauseAudioElements = useCallback(() => {
    podcastRef.current?.pause()
    bgmRef.current?.pause()
  }, [])

  const startBoth = useCallback(async () => {
    const podcast = podcastRef.current
    const bgm = bgmRef.current
    if (!podcast || !bgm) return

    syncBgmTime(bgm, podcast.currentTime)
    const podcastPlay = podcast.play()
    const bgmPlay = bgm.play()
    const [podcastResult, bgmResult] = await Promise.allSettled([podcastPlay, bgmPlay])

    if (podcastResult.status === 'fulfilled' && bgmResult.status === 'fulfilled') {
      setPlaying(true)
      return
    }
    if (podcastResult.status === 'fulfilled' && bgmResult.status === 'rejected') {
      onError?.('BGM 未能同步播放，请再次点击播放按钮')
      setPlaying(true)
      return
    }
    if (podcastResult.status === 'rejected' && bgmResult.status === 'fulfilled') {
      bgm.pause()
    }
    onError?.('无法播放试听，请检查网络后点击播放按钮')
    setPlaying(false)
  }, [onError])

  useEffect(() => {
    const podcast = podcastRef.current
    const bgm = bgmRef.current
    const masterScale = Math.min(1, Math.max(0, masterVolume / 100))
    if (podcast) {
      podcast.volume = Math.min(1, Math.max(0, (podcastVolume / 100) * masterScale))
    }
    if (bgm) {
      bgm.volume = Math.min(1, Math.max(0, (bgmVolume / 100) * masterScale))
    }
  }, [podcastVolume, bgmVolume, masterVolume])

  useEffect(() => {
    if (podcastRef.current) {
      podcastRef.current.playbackRate = clampRate(podcastPlaybackRate)
    }
  }, [podcastPlaybackRate])

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.playbackRate = clampRate(bgmPlaybackRate)
    }
  }, [bgmPlaybackRate])

  useEffect(() => {
    if (bgmRef.current) {
      bgmRef.current.loop = bgmLoop
    }
  }, [bgmLoop])

  useEffect(() => {
    const podcast = podcastRef.current
    const bgm = bgmRef.current
    if (!podcast || !bgm) return

    const syncStreamDuration = () => {
      if (Number.isFinite(podcast.duration) && podcast.duration > 0) {
        setStreamDuration(Math.floor(podcast.duration))
      }
    }
    const onTimeUpdate = () => {
      setProgress(Math.floor(podcast.currentTime))
      if (playing) {
        syncBgmTime(bgm, podcast.currentTime)
      }
    }
    const onPodcastError = () => {
      onError?.('播客音频加载失败，请重新解析播客后再试')
      bgm.pause()
      setPlaying(false)
      setStreamsReady(false)
    }
    const onBgmError = () => {
      onError?.('BGM 加载失败，请重新上传或选择 BGM 后再试')
      podcast.pause()
      setPlaying(false)
    }

    podcast.addEventListener('timeupdate', onTimeUpdate)
    podcast.addEventListener('loadedmetadata', syncStreamDuration)
    podcast.addEventListener('durationchange', syncStreamDuration)
    podcast.addEventListener('ended', () => {
      bgm.pause()
      setPlaying(false)
    })
    podcast.addEventListener('error', onPodcastError)
    bgm.addEventListener('error', onBgmError)

    return () => {
      podcast.removeEventListener('timeupdate', onTimeUpdate)
      podcast.removeEventListener('loadedmetadata', syncStreamDuration)
      podcast.removeEventListener('durationchange', syncStreamDuration)
      podcast.removeEventListener('error', onPodcastError)
      bgm.removeEventListener('error', onBgmError)
    }
  }, [playing, onError])

  useEffect(() => {
    const podcast = podcastRef.current
    const bgm = bgmRef.current
    if (!podcast || !bgm) return

    let cancelled = false
    setPreparing(true)
    setStreamsReady(false)
    setPlaying(false)
    setProgress(0)

    void (async () => {
      try {
        await Promise.all([
          waitForStreamReady(bgm, 'BGM', 45000),
          waitForStreamReady(podcast, '播客', 90000),
        ])
        if (cancelled) return
        setStreamsReady(true)
        setPreparing(false)
        if (!isTouchPreviewDevice()) {
          await startBoth()
        }
      } catch (error) {
        if (cancelled) return
        setPreparing(false)
        const message = error instanceof Error ? error.message : ''
        if (message.includes('BGM')) {
          onError?.('BGM 加载失败，请重新上传或选择 BGM 后再试')
        } else if (message.includes('播客')) {
          onError?.('播客音频加载失败，请重新解析播客后再试')
        } else {
          onError?.('试听音频加载失败，请稍后重试')
        }
      }
    })()

    return () => {
      cancelled = true
      pauseAudioElements()
    }
  }, [playToken, pauseAudioElements, startBoth, onError])

  if (playToken <= 0) {
    return null
  }

  const sliderMax = totalDuration > 0 ? totalDuration : Math.max(progress, 1)

  return (
    <PreviewShell
      playing={playing}
      preparing={preparing}
      streamsReady={streamsReady}
      progress={progress}
      sliderMax={sliderMax}
      masterVolume={masterVolume}
      title={preparing ? '正在加载试听…' : playing ? '试听播放中' : '试听已就绪'}
      subtitle={
        preparing
          ? '正在缓冲播客与 BGM，请稍候'
          : streamsReady && !playing && isTouchPreviewDevice()
            ? '请点击播放按钮开始混音试听'
            : '完整混音试听 · 音量与倍速可在左侧调整'
      }
      onToggle={() => {
        if (preparing || !streamsReady) return
        if (playing) {
          pauseAudioElements()
          setPlaying(false)
        } else {
          void startBoth()
        }
      }}
      onSeek={(value) => {
        const podcast = podcastRef.current
        const bgm = bgmRef.current
        if (!podcast) return
        podcast.currentTime = value
        if (bgm) syncBgmTime(bgm, value)
        setProgress(value)
      }}
      onMasterVolumeChange={onMasterVolumeChange}
      audio={
        <>
          <audio
            key={`podcast-${podcastId}-${playToken}`}
            ref={podcastRef}
            {...MOBILE_AUDIO_ATTRS}
            src={podcastStreamUrl(podcastId)}
            style={{ display: 'none' }}
            aria-hidden
          />
          <audio
            key={`bgm-${bgmId}-${playToken}`}
            ref={bgmRef}
            {...MOBILE_AUDIO_ATTRS}
            src={bgmStreamUrl(bgmId)}
            style={{ display: 'none' }}
            aria-hidden
          />
        </>
      }
    />
  )
}

export function MixPreviewPlayer(props: MixPreviewPlayerProps) {
  if (props.playToken <= 0) {
    return null
  }
  if (props.serverPreview) {
    return <ServerMixPreviewPlayer {...props} serverPreview={props.serverPreview} />
  }
  return <DualMixPreviewPlayer {...props} />
}
