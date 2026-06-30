import { Button, Slider } from 'antd'
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons'
import { message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { usePlaybackProgress } from '@/hooks/usePlaybackProgress'
import { MOBILE_AUDIO_ATTRS, useMediaSession } from '@/hooks/useMediaSession'
import type { MixedAudioAssetDTO } from '@/types/api'
import './InlinePlayer.css'

interface InlinePlayerProps {
  asset: MixedAudioAssetDTO
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function InlinePlayer({ asset }: InlinePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const resumeAppliedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(asset.duration)
  const [resumeHint, setResumeHint] = useState(false)
  const [volume, setVolume] = useState(80)

  const totalDuration = duration || asset.duration
  const { loadProgress, scheduleSave, flushSave } = usePlaybackProgress(
    asset.id,
    'inline',
    totalDuration,
  )

  useEffect(() => {
    let cancelled = false
    void loadProgress().then((resumeAt) => {
      if (cancelled) return
      if (resumeAt > 0) {
        setProgress(resumeAt)
        setResumeHint(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [asset.id, loadProgress])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      const next = Math.floor(audio.currentTime)
      setProgress(next)
      scheduleSave(next, totalDuration || undefined)
    }
    const onLoadedMetadata = () => {
      const metaDuration = Math.floor(audio.duration)
      if (metaDuration > 0) setDuration(metaDuration)
      if (!resumeAppliedRef.current && progress > 0) {
        audio.currentTime = progress
        resumeAppliedRef.current = true
      }
    }
    const onEnded = () => {
      setPlaying(false)
      void flushSave(0, totalDuration || undefined)
    }
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
      if (audio.currentTime > 0) {
        void flushSave(Math.floor(audio.currentTime), totalDuration || undefined)
      }
    }
  }, [asset.id, flushSave, progress, scheduleSave, totalDuration])

  useEffect(() => {
    resumeAppliedRef.current = false
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = asset.play_url
      audio.volume = volume / 100
      audio.load()
    }
  }, [asset.id, asset.play_url, volume])

  useEffect(() => {
    if (!resumeHint) return
    const timer = window.setTimeout(() => setResumeHint(false), 5000)
    return () => window.clearTimeout(timer)
  }, [resumeHint])

  const handleToggle = () => {
    if (asset.status !== 'completed') {
      message.warning('组合音频尚未合成完成，暂不可播放')
      return
    }
    const audio = audioRef.current
    if (!audio) return
    const next = !playing
    setPlaying(next)
    if (next) {
      void audio.play().catch(() => {
        setPlaying(false)
        message.error('播放失败，请稍后重试')
      })
    } else {
      audio.pause()
      void flushSave(Math.floor(audio.currentTime), totalDuration || undefined)
    }
  }

  const handleProgressChange = (value: number) => {
    if (asset.status !== 'completed') return
    setProgress(value)
    setResumeHint(false)
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = value
      if (!playing) {
        void audio.play().then(() => setPlaying(true)).catch(() => {
          message.error('播放失败，请稍后重试')
        })
      }
    }
    void flushSave(value, totalDuration || undefined)
  }

  useMediaSession(
    playing,
    {
      title: asset.title,
      artist: asset.podcast.podcast_name,
      album: 'Podcast Flow · 详情页',
      artworkUrl: asset.bgm.cover_url || asset.podcast.cover_url || undefined,
    },
    {
      playing,
      duration: totalDuration,
      position: progress,
      onPlay: () => {
        if (!playing) handleToggle()
      },
      onPause: () => {
        if (playing) handleToggle()
      },
      onSeek: handleProgressChange,
    },
  )

  return (
    <section className="inline-player-card">
      <audio ref={audioRef} {...MOBILE_AUDIO_ATTRS} style={{ display: 'none' }} />
      {resumeHint && <span className="inline-player-resume-tag">续播进度</span>}
      <div className="inline-player-controls">
        <Button
          type="primary"
          shape="circle"
          icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={handleToggle}
          disabled={asset.status !== 'completed'}
        />
        <Slider
          className="inline-player-progress"
          min={0}
          max={totalDuration || 1}
          value={progress}
          onChange={handleProgressChange}
          disabled={asset.status !== 'completed'}
          tooltip={{ formatter: (v) => formatTime(v ?? 0) }}
        />
        <span className="inline-player-time">
          {formatTime(progress)} / {formatTime(totalDuration)}
        </span>
      </div>
      <div className="inline-player-volume">
        <span>音量</span>
        <Slider
          min={0}
          max={100}
          value={volume}
          onChange={(value) => {
            setVolume(value)
            if (audioRef.current) {
              audioRef.current.volume = value / 100
            }
          }}
        />
        <span className="inline-player-volume-val">{volume}%</span>
      </div>
    </section>
  )
}
