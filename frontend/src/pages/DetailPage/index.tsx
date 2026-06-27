import { useEffect, useState } from 'react'
import { Button, Modal, Spin, Tag, Typography, message } from 'antd'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { InlinePlayer } from '@/components/InlinePlayer'
import { MOCK_COVER_COLORS } from '@/mocks/data'
import { deleteMixedAudio, getMixedAudioDetail } from '@/services/mixedAudioService'
import { usePlayerStore } from '@/stores/playerStore'
import type { MixedAudioAssetDTO } from '@/types/api'
import '@/components/InlinePlayer.css'
import '@/components/StepCard.css'

import { formatCreatedAt, formatDuration } from '@/utils/format'

function bgmSourceLabel(type: 'upload' | 'url' | 'qishui_share'): string {
  if (type === 'upload') return '本地上传'
  if (type === 'qishui_share') return '汽水音乐'
  return '音频链接'
}

function statusLabel(status: MixedAudioAssetDTO['status']): string {
  const map = {
    pending: '等待中',
    mixing: '合成中',
    completed: '已完成',
    failed: '失败',
  }
  return map[status]
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [asset, setAsset] = useState<MixedAudioAssetDTO | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await getMixedAudioDetail(id!)
        if (!cancelled) setAsset(data)
      } catch (e) {
        if (!cancelled) {
          setAsset(null)
          setLoadError(e instanceof Error ? e.message : '组合音频不存在')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleDelete = () => {
    if (!asset) return
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条组合音频吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteMixedAudio(asset.id)
          usePlayerStore.getState().closeIfCurrent(asset.id)
          message.success('已删除')
          navigate('/library')
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败')
        }
      },
    })
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      </>
    )
  }

  if (!asset) {
    return (
      <>
        <AppHeader />
        <main className="page-content">
          <Typography.Text type="secondary">{loadError ?? '组合音频不存在'}</Typography.Text>
          <br />
          <Link to="/library">返回我的组合音频库</Link>
        </main>
      </>
    )
  }

  const coverColor = MOCK_COVER_COLORS[asset.id] ?? '#2D6A4F'
  const coverInitial = asset.podcast.podcast_name.slice(0, 1)

  return (
    <>
      <AppHeader />
      <main className="page-content">
        <Link to="/library" className="back-link">
          ← 返回我的组合音频库
        </Link>

        <div className="detail-header">
          <div className="cover-lg" style={{ background: coverColor }}>
            {asset.podcast.cover_url ? (
              <img src={asset.podcast.cover_url} alt="" className="cover-img" />
            ) : (
              coverInitial
            )}
          </div>
          <div className="detail-header-info">
            <Typography.Title level={3} style={{ marginTop: 0 }}>
              {asset.title}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              播客：{asset.podcast.podcast_name}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              原链接：{asset.podcast.source_url}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              时长：{formatDuration(asset.duration)}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
              创建时间：{formatCreatedAt(asset.created_at)}
            </Typography.Text>
            <Tag
              color={asset.status === 'completed' ? 'success' : asset.status === 'failed' ? 'error' : 'default'}
              style={{ marginTop: 8 }}
            >
              {statusLabel(asset.status)}
            </Tag>
            {asset.error_message && (
              <Typography.Text type="danger" style={{ display: 'block', fontSize: 13, marginTop: 8 }}>
                {asset.error_message}
              </Typography.Text>
            )}
          </div>
        </div>

        <InlinePlayer asset={asset} />

        <section className="info-section-card">
          <h3>BGM 信息</h3>
          <dl className="desc-list">
            <dt>名称</dt>
            <dd>{asset.bgm.title}</dd>
            <dt>来源</dt>
            <dd>{bgmSourceLabel(asset.bgm.source_type)}</dd>
            <dt>时长</dt>
            <dd>{formatDuration(asset.bgm.duration)}</dd>
          </dl>
        </section>

        <section className="info-section-card">
          <h3>混音配置</h3>
          <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14, color: '#1a3c34' }}>播客</h4>
          <dl className="desc-list">
            <dt>音量</dt>
            <dd>{Math.round(asset.mix_config.podcast_volume * 100)}%</dd>
            <dt>播放倍速</dt>
            <dd>{(asset.mix_config.podcast_playback_rate ?? 1).toFixed(1)}x</dd>
          </dl>
          <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 14, color: '#1a3c34' }}>BGM</h4>
          <dl className="desc-list">
            <dt>音量</dt>
            <dd>{Math.round(asset.mix_config.bgm_volume * 100)}%</dd>
            <dt>播放倍速</dt>
            <dd>{(asset.mix_config.bgm_playback_rate ?? 1).toFixed(1)}x</dd>
            <dt>BGM 循环</dt>
            <dd>{asset.mix_config.bgm_loop ? '开启' : '关闭'}</dd>
          </dl>
        </section>

        <Button danger onClick={handleDelete}>
          删除
        </Button>
      </main>
    </>
  )
}
