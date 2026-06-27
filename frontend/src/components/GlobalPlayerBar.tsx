import { Button, Slider, message } from 'antd'
import { CloseOutlined, PauseOutlined, CaretRightOutlined } from '@ant-design/icons'
import { useEffect, useRef } from 'react'
import { MOCK_COVER_COLORS } from '@/mocks/data'
import { usePlayerStore } from '@/stores/playerStore'
import './GlobalPlayerBar.css'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function GlobalPlayerBar() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const {
    visible,
    playing,
    current,
    progress,
    duration,
    volume,
    registerAudio,
    toggle,
    close,
    setProgress,
    setVolume,
    syncProgress,
    syncDuration,
    setPlaying,
  } = usePlayerStore()

  useEffect(() => {
    registerAudio(audioRef.current)
    return () => registerAudio(null)
  }, [registerAudio])

  useEffect(() => {
    document.body.classList.toggle('has-global-player', visible)
    return () => document.body.classList.remove('has-global-player')
  }, [visible])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => syncProgress(Math.floor(audio.currentTime))
    const onLoadedMetadata = () => {
      const metaDuration = Math.floor(audio.duration)
      if (metaDuration > 0) syncDuration(metaDuration)
    }
    const onEnded = () => setPlaying(false)
    const onError = () => {
      setPlaying(false)
      message.error('播放失败，组合音频可能尚未合成完成或文件不存在')
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [syncProgress, syncDuration, setPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return

    audio.src = current.play_url
    audio.volume = volume / 100
    audio.load()
    if (playing) {
      void audio.play().catch(() => {
        setPlaying(false)
        message.error('播放失败，请稍后重试')
      })
    }
  }, [current?.id, current?.play_url])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !current) return

    if (playing) {
      void audio.play().catch(() => {
        setPlaying(false)
        message.error('播放失败，请稍后重试')
      })
    } else {
      audio.pause()
    }
  }, [playing, current?.id, setPlaying])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  const coverColor = current ? MOCK_COVER_COLORS[current.id] ?? '#2D6A4F' : '#2D6A4F'
  const coverInitial = current?.podcast.podcast_name.slice(0, 1) ?? ''
  const totalDuration = duration || current?.duration || 0

  return (
    <>
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />
      {visible && current ? (
        <div className="global-player-bar" role="region" aria-label="全局播放器">
          <div className="global-player-left">
            <div className="cover-xs" style={{ background: coverColor }}>
              {current.podcast.cover_url ? (
                <img src={current.podcast.cover_url} alt="" className="cover-img" />
              ) : (
                coverInitial
              )}
            </div>
            <div className="global-player-meta">
              <div className="global-player-title">{current.title}</div>
              <div className="global-player-sub">{current.podcast.podcast_name}</div>
            </div>
          </div>
          <div className="global-player-center">
            <Button
              type="text"
              icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
              onClick={toggle}
              aria-label={playing ? '暂停' : '播放'}
            />
            <Slider
              className="global-player-progress"
              min={0}
              max={totalDuration}
              value={progress}
              onChange={setProgress}
              tooltip={{ formatter: (v) => formatTime(v ?? 0) }}
            />
            <span className="global-player-time">
              {formatTime(progress)} / {formatTime(totalDuration)}
            </span>
          </div>
          <div className="global-player-right">
            <Slider
              className="global-player-volume"
              min={0}
              max={100}
              value={volume}
              onChange={setVolume}
            />
            <span className="global-player-volume-val">{volume}%</span>
            <Button type="text" icon={<CloseOutlined />} onClick={close} aria-label="关闭播放器" />
          </div>
        </div>
      ) : null}
    </>
  )
}
