import {
  CustomerServiceOutlined,
  PlayCircleFilled,
} from '@ant-design/icons'
import { Button } from 'antd'
import { Link } from 'react-router-dom'
import { MOCK_BGM_BADGE_COLORS, MOCK_COVER_COLORS } from '@/mocks/data'
import type { MixedAudioAssetDTO } from '@/types/api'
import { formatDateBadge, formatDuration } from '@/utils/format'

interface LibraryAssetCardProps {
  asset: MixedAudioAssetDTO
  featured?: boolean
  batchMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onPlay: (asset: MixedAudioAssetDTO) => void
}

export function LibraryAssetCard({
  asset,
  featured = false,
  batchMode = false,
  selected = false,
  onToggleSelect,
  onPlay,
}: LibraryAssetCardProps) {
  const coverColor = MOCK_COVER_COLORS[asset.id] ?? '#2D6A4F'
  const bgmColor = MOCK_BGM_BADGE_COLORS[asset.id] ?? '#163D35'
  const initial = asset.podcast.podcast_name.slice(0, 1)

  return (
    <article
      className={[
        'lib-card',
        featured ? 'lib-card--featured' : '',
        batchMode ? 'lib-card--batch' : '',
        selected ? 'lib-card--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {batchMode && (
        <input
          type="checkbox"
          className="lib-card-checkbox"
          checked={selected}
          aria-label={`选择 ${asset.title}`}
          onChange={() => onToggleSelect?.(asset.id)}
        />
      )}

      <div className="lib-card-cover">
        {asset.podcast.cover_url ? (
          <img src={asset.podcast.cover_url} alt="" className="lib-card-cover-img" />
        ) : (
          <div className="lib-card-cover-fallback" style={{ background: coverColor }}>
            {initial}
          </div>
        )}
        <div className="lib-card-cover-gradient" />
        <div className="lib-card-cover-meta">
          <span className="lib-card-duration">{formatDuration(asset.duration)}</span>
          {!batchMode && (
            <button
              type="button"
              className="lib-card-play-hover"
              aria-label={`播放 ${asset.title}`}
              onClick={() => onPlay(asset)}
            >
              <PlayCircleFilled />
            </button>
          )}
        </div>
      </div>

      <div className="lib-card-body">
        <div className="lib-card-tags">
          <span className="lib-card-bgm-tag" style={{ background: bgmColor }}>
            {asset.bgm.title}
          </span>
          <span className="lib-card-date-tag">{formatDateBadge(asset.created_at)}</span>
        </div>
        <h3 className="lib-card-title">{asset.title}</h3>
        <p className="lib-card-podcast">
          <CustomerServiceOutlined /> {asset.podcast.podcast_name}
        </p>

        {featured && <div className="lib-card-wave" aria-hidden />}

        <div className="lib-card-footer">
          {featured && !batchMode && (
            <button
              type="button"
              className="lib-card-play-round"
              aria-label={`播放 ${asset.title}`}
              onClick={() => onPlay(asset)}
            >
              <PlayCircleFilled />
            </button>
          )}
          {!batchMode && (
            <>
              <Link to={`/detail/${asset.id}`} className="lib-card-btn lib-card-btn--ghost">
                详情
              </Link>
              <Button type="primary" className="lib-card-btn lib-card-btn--primary" onClick={() => onPlay(asset)}>
                <PlayCircleFilled /> 播放
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
