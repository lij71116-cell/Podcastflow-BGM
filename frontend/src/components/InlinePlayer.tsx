import { Button, Slider } from 'antd'
import { CaretRightOutlined, PauseOutlined } from '@ant-design/icons'
import { usePlayerStore } from '@/stores/playerStore'
import { playMixedAsset } from '@/utils/player'
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
  const { current, playing, progress, duration, volume, toggle, setProgress, setVolume } =
    usePlayerStore()

  const isActive = current?.id === asset.id
  const isPlaying = isActive && playing
  const currentProgress = isActive ? progress : 0
  const totalDuration = isActive && duration > 0 ? duration : asset.duration

  const handleToggle = () => {
    if (isActive) {
      toggle()
    } else {
      playMixedAsset(asset)
    }
  }

  return (
    <section className="inline-player-card">
      <div className="inline-player-controls">
        <Button
          type="primary"
          shape="circle"
          icon={isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={handleToggle}
          disabled={asset.status !== 'completed'}
        />
        <Slider
          className="inline-player-progress"
          min={0}
          max={totalDuration}
          value={currentProgress}
          onChange={(v) => {
            if (asset.status !== 'completed') return
            if (isActive) setProgress(v)
            else playMixedAsset(asset)
          }}
          disabled={asset.status !== 'completed'}
          tooltip={{ formatter: (v) => formatTime(v ?? 0) }}
        />
        <span className="inline-player-time">
          {formatTime(currentProgress)} / {formatTime(totalDuration)}
        </span>
      </div>
      <div className="inline-player-volume">
        <span>音量</span>
        <Slider min={0} max={100} value={volume} onChange={setVolume} />
        <span className="inline-player-volume-val">{volume}%</span>
      </div>
    </section>
  )
}
