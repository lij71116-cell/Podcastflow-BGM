import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
  FileTextOutlined,
  LinkOutlined,
  ReloadOutlined,
  SoundOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { Button, Modal, Progress, Slider, Spin, Switch, message } from 'antd'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { InlinePlayer } from '@/components/InlinePlayer'
import { MOCK_COVER_COLORS } from '@/mocks/data'
import {
  deleteMixedAudio,
  getMixedAudioDetail,
  getMixTask,
  regenerateMixedAudio,
} from '@/services/mixedAudioService'
import { usePlayerStore } from '@/stores/playerStore'
import type { MixConfigDTO, MixedAudioAssetDTO } from '@/types/api'
import { formatDateBadge, formatDuration } from '@/utils/format'
import './DetailPage.css'

const DESC_COLLAPSE_LINES = 3

function bgmSourceLabel(type: MixedAudioAssetDTO['bgm']['source_type']): string {
  if (type === 'upload') return '本地上传'
  if (type === 'qishui_share') return '汽水音乐'
  return '音频链接'
}

function mixConfigFromAsset(asset: MixedAudioAssetDTO) {
  const config = asset.mix_config
  return {
    podcastVolume: Math.round(config.podcast_volume * 100),
    podcastPlaybackRate: config.podcast_playback_rate ?? 1,
    bgmVolume: Math.round(config.bgm_volume * 100),
    bgmPlaybackRate: config.bgm_playback_rate ?? 1,
    bgmLoop: config.bgm_loop,
    fadeInEnabled: (config.fade_in ?? 0) > 0,
    fadeOutEnabled: (config.fade_out ?? 0) > 0,
    fadeInSec: config.fade_in ?? 3,
    fadeOutSec: config.fade_out ?? 5,
  }
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [asset, setAsset] = useState<MixedAudioAssetDTO | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [descNeedsCollapse, setDescNeedsCollapse] = useState(false)
  const [descCollapsed, setDescCollapsed] = useState(false)
  const descRef = useRef<HTMLParagraphElement>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerateProgress, setRegenerateProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [podcastVolume, setPodcastVolume] = useState(100)
  const [podcastPlaybackRate, setPodcastPlaybackRate] = useState(1)
  const [bgmVolume, setBgmVolume] = useState(15)
  const [bgmPlaybackRate, setBgmPlaybackRate] = useState(1)
  const [bgmLoop, setBgmLoop] = useState(true)
  const [fadeInEnabled, setFadeInEnabled] = useState(true)
  const [fadeOutEnabled, setFadeOutEnabled] = useState(true)
  const [fadeInSec, setFadeInSec] = useState(3)
  const [fadeOutSec, setFadeOutSec] = useState(5)

  const applyMixForm = useCallback((next: MixedAudioAssetDTO) => {
    const form = mixConfigFromAsset(next)
    setPodcastVolume(form.podcastVolume)
    setPodcastPlaybackRate(form.podcastPlaybackRate)
    setBgmVolume(form.bgmVolume)
    setBgmPlaybackRate(form.bgmPlaybackRate)
    setBgmLoop(form.bgmLoop)
    setFadeInEnabled(form.fadeInEnabled)
    setFadeOutEnabled(form.fadeOutEnabled)
    setFadeInSec(form.fadeInSec)
    setFadeOutSec(form.fadeOutSec)
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await getMixedAudioDetail(id!)
        if (cancelled) return
        setAsset(data)
        applyMixForm(data)
      } catch (e) {
        if (cancelled) return
        setAsset(null)
        setLoadError(e instanceof Error ? e.message : '组合音频不存在')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [applyMixForm, id])

  const reloadAsset = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    try {
      const data = await getMixedAudioDetail(id)
      setAsset(data)
      applyMixForm(data)
    } catch (e) {
      setAsset(null)
      setLoadError(e instanceof Error ? e.message : '组合音频不存在')
    } finally {
      setLoading(false)
    }
  }, [applyMixForm, id])

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current)
    },
    [],
  )

  const buildMixConfig = (): MixConfigDTO => ({
    podcast_volume: podcastVolume / 100,
    podcast_playback_rate: podcastPlaybackRate,
    bgm_volume: bgmVolume / 100,
    bgm_playback_rate: bgmPlaybackRate,
    bgm_loop: bgmLoop,
    fade_in: fadeInEnabled ? fadeInSec : 0,
    fade_out: fadeOutEnabled ? fadeOutSec : 0,
  })

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const handleRegenerate = async () => {
    if (!asset || regenerating) return
    if (asset.status === 'pending' || asset.status === 'mixing') {
      message.warning('合成进行中，请稍后再试')
      return
    }
    setRegenerating(true)
    setRegenerateProgress(0)
    try {
      const mixConfig = buildMixConfig()
      const result = await regenerateMixedAudio(asset.id, mixConfig)
      setAsset(result.mixed_audio)
      setRegenerateProgress(result.task.progress)
      let pollErrors = 0
      pollRef.current = setInterval(async () => {
        try {
          const task = await getMixTask(asset.id)
          pollErrors = 0
          setRegenerateProgress(task.progress)
          if (task.status === 'completed') {
            stopPolling()
            setRegenerating(false)
            message.success('重新合成成功，已覆盖当前音频')
            usePlayerStore.getState().closeIfCurrent(asset.id)
            await reloadAsset()
          }
          if (task.status === 'failed') {
            stopPolling()
            setRegenerating(false)
            message.error(task.error_message ?? '重新合成失败')
            await reloadAsset()
          }
        } catch {
          pollErrors += 1
          if (pollErrors >= 5) {
            stopPolling()
            setRegenerating(false)
            message.error('合成状态查询失败')
          }
        }
      }, 2000)
    } catch (e) {
      setRegenerating(false)
      message.error(e instanceof Error ? e.message : '重新合成失败')
    }
  }

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

  const episodeDescription = asset?.podcast.description?.trim() ?? ''

  useLayoutEffect(() => {
    const el = descRef.current
    if (!el || !episodeDescription) {
      setDescNeedsCollapse(false)
      setDescCollapsed(false)
      return
    }

    el.classList.remove('is-collapsed')
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 24
    const needsCollapse = el.scrollHeight > lineHeight * DESC_COLLAPSE_LINES + 2
    setDescNeedsCollapse(needsCollapse)
    setDescCollapsed(needsCollapse)
  }, [episodeDescription, asset?.id])

  if (loading) {
    return (
      <div className="detail-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (!asset) {
    return (
      <main className="detail-main">
        <p>{loadError ?? '组合音频不存在'}</p>
        <Link to="/library" className="detail-back-link">
          <ArrowLeftOutlined /> 返回我的组合音频库
        </Link>
      </main>
    )
  }

  const coverColor = MOCK_COVER_COLORS[asset.id] ?? '#2D6A4F'
  const coverInitial = asset.podcast.podcast_name.slice(0, 1)
  const mix = asset.mix_config
  const mixBusy = regenerating || asset.status === 'pending' || asset.status === 'mixing'

  return (
    <div className="detail-page">
      <header className="detail-hero">
        <div className="detail-hero-bg" aria-hidden />
        <div className="detail-hero-inner">
          <div className="detail-hero-cover">
            {asset.podcast.cover_url ? (
              <img src={asset.podcast.cover_url} alt="" />
            ) : (
              coverInitial
            )}
          </div>
          <div className="detail-hero-meta">
            <h1 className="detail-hero-title">{asset.title}</h1>
            <div className="detail-hero-chips">
              <span className="detail-hero-chip">
                <CustomerServiceOutlined /> {asset.podcast.podcast_name}
              </span>
              <span>•</span>
              <span className="detail-hero-chip">
                <ClockCircleOutlined /> {formatDuration(asset.duration)}
              </span>
              <span>•</span>
              <span className="detail-hero-chip">
                <CalendarOutlined /> {formatDateBadge(asset.created_at)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="detail-main">
        <Link to="/library" className="detail-back-link">
          <ArrowLeftOutlined /> 返回我的组合音频库
        </Link>

        <InlinePlayer key={asset.id} asset={asset} />

        <section className="detail-card detail-podcast-intro">
          <div className="detail-podcast-intro-head">
            <div className="detail-card-head">
              <FileTextOutlined />
              <h2>单集介绍</h2>
            </div>
            <div className="detail-podcast-intro-meta">
              <span className="detail-podcast-meta-chip">
                <CustomerServiceOutlined /> {asset.podcast.podcast_name}
              </span>
              <span className="detail-podcast-meta-chip">
                <ClockCircleOutlined />
                {formatDuration(asset.duration)}
              </span>
              <a
                className="detail-podcast-meta-chip detail-podcast-meta-link"
                href={asset.podcast.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkOutlined /> 小宇宙原链接
              </a>
            </div>
          </div>
          <div className="detail-podcast-desc-wrap">
            <p
              ref={descRef}
              className={`detail-podcast-desc${descNeedsCollapse && descCollapsed ? ' is-collapsed' : ''}`}
            >
              {episodeDescription || '暂无单集介绍'}
            </p>
          </div>
          {descNeedsCollapse && (
            <button
              type="button"
              className="detail-podcast-desc-toggle"
              onClick={() => setDescCollapsed((prev) => !prev)}
            >
              {descCollapsed ? (
                <>
                  展开全文
                  <DownOutlined aria-hidden />
                </>
              ) : (
                <>
                  收起
                  <UpOutlined aria-hidden />
                </>
              )}
            </button>
          )}
        </section>

        <div className="detail-stack">
          <section className="detail-bento-card detail-card">
            <div className="detail-card-head">
              <SoundOutlined />
              <h3>背景音轨</h3>
            </div>
            <div className="detail-bgm-body detail-bgm-body--wide">
              <div className="detail-bgm-hero">
                <div className="detail-bgm-cover">
                  {asset.bgm.cover_url ? (
                    <img src={asset.bgm.cover_url} alt="" />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: coverColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {asset.bgm.title.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="detail-bgm-hero-info">
                  <span className="detail-bgm-badge">BGM</span>
                  <h4>{asset.bgm.title}</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>
                    自然白噪音 · 专注氛围
                  </p>
                </div>
              </div>
              <div className="mix-readonly-group detail-bgm-attrs">
                <div className="mix-readonly-group-title">音轨属性</div>
                <div className="mix-readonly-rows detail-bgm-attrs-grid">
                  <div className="mix-readonly-row">
                    <dt>来源</dt>
                    <dd>{bgmSourceLabel(asset.bgm.source_type)}</dd>
                  </div>
                  <div className="mix-readonly-row">
                    <dt>原始时长</dt>
                    <dd>{formatDuration(asset.bgm.duration)}</dd>
                  </div>
                  <div className="mix-readonly-row">
                    <dt>风格</dt>
                    <dd>自然白噪音</dd>
                  </div>
                  <div className="mix-readonly-row">
                    <dt>循环方式</dt>
                    <dd>{mix.bgm_loop ? '自动循环铺满' : '不循环'}</dd>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="detail-bento-card detail-card">
            <div className="detail-card-head">
              <ReloadOutlined />
              <h3>混音配置</h3>
            </div>
            <div className="mix-readonly mix-readonly--wide">
              <div className="mix-readonly-group">
                <div className="mix-readonly-group-title">播客</div>
                <div className="mix-readonly-bar-row">
                  <div className="mix-readonly-bar-head">
                    <span>音量</span>
                    <span>{Math.round(mix.podcast_volume * 100)}%</span>
                  </div>
                  <div className="mix-readonly-bar-track">
                    <div
                      className="mix-readonly-bar-fill"
                      style={{ width: `${Math.round(mix.podcast_volume * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mix-readonly-rows">
                  <div className="mix-readonly-row">
                    <dt>倍速</dt>
                    <dd>{(mix.podcast_playback_rate ?? 1).toFixed(1)}x</dd>
                  </div>
                </div>
              </div>
              <div className="mix-readonly-group">
                <div className="mix-readonly-group-title">BGM</div>
                <div className="mix-readonly-bar-row">
                  <div className="mix-readonly-bar-head">
                    <span>音量</span>
                    <span>{Math.round(mix.bgm_volume * 100)}%</span>
                  </div>
                  <div className="mix-readonly-bar-track">
                    <div
                      className="mix-readonly-bar-fill bgm"
                      style={{ width: `${Math.round(mix.bgm_volume * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mix-readonly-rows">
                  <div className="mix-readonly-row">
                    <dt>倍速</dt>
                    <dd>{(mix.bgm_playback_rate ?? 1).toFixed(1)}x</dd>
                  </div>
                  <div className="mix-readonly-row">
                    <dt>淡入</dt>
                    <dd>{mix.fade_in ? `${mix.fade_in} 秒` : '关'}</dd>
                  </div>
                  <div className="mix-readonly-row">
                    <dt>淡出</dt>
                    <dd>{mix.fade_out ? `${mix.fade_out} 秒` : '关'}</dd>
                  </div>
                  <div className="mix-readonly-row">
                    <dt>自动循环</dt>
                    <dd>{mix.bgm_loop ? '开启' : '关闭'}</dd>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <details className="detail-regenerate-panel">
            <summary>
              <div className="detail-card-head" style={{ marginBottom: 0 }}>
                <ReloadOutlined style={{ color: 'var(--text-secondary)' }} />
                <h3>重新生成</h3>
              </div>
              <DownOutlined className="detail-regenerate-chevron" />
            </summary>
            <div className="detail-regenerate-body">
              <p className="detail-regenerate-intro">
                修改下方混音配置后，可直接在此重新合成并覆盖当前组合音频。参数默认与创建时的混音配置一致。
              </p>
              <div className="detail-regenerate-form">
                <section className="detail-regenerate-card">
                  <h4>
                    <CustomerServiceOutlined /> 播客
                  </h4>
                  <div className="detail-slider-block">
                    <div className="detail-slider-head">
                      <span>音量</span>
                      <span>{podcastVolume}%</span>
                    </div>
                    <Slider
                      min={0}
                      max={200}
                      value={podcastVolume}
                      onChange={setPodcastVolume}
                      disabled={mixBusy}
                    />
                  </div>
                  <div className="detail-slider-block">
                    <div className="detail-slider-head">
                      <span>倍速</span>
                      <span>{podcastPlaybackRate.toFixed(1)}x</span>
                    </div>
                    <Slider
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={podcastPlaybackRate}
                      onChange={setPodcastPlaybackRate}
                      disabled={mixBusy}
                    />
                  </div>
                </section>

                <section className="detail-regenerate-card">
                  <div className="detail-regenerate-card-head">
                    <h4>
                      <SoundOutlined /> 背景音乐 (BGM)
                    </h4>
                    <span className="detail-regenerate-badge">已选择 1 首</span>
                  </div>
                  <div className="detail-slider-block">
                    <div className="detail-slider-head">
                      <span>音量</span>
                      <span>{bgmVolume}%</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      value={bgmVolume}
                      onChange={setBgmVolume}
                      disabled={mixBusy}
                    />
                  </div>
                  <div className="detail-slider-block">
                    <div className="detail-slider-head">
                      <span>倍速</span>
                      <span>{bgmPlaybackRate.toFixed(1)}x</span>
                    </div>
                    <Slider
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={bgmPlaybackRate}
                      onChange={setBgmPlaybackRate}
                      disabled={mixBusy}
                    />
                  </div>
                  <hr className="detail-regenerate-divider" />
                  <div className="detail-fade-row">
                    <div className="detail-fade-label">
                      <Switch checked={fadeInEnabled} onChange={setFadeInEnabled} disabled={mixBusy} />
                      <span>淡入 (Fade In)</span>
                    </div>
                    <div className="detail-fade-slider">
                      <Slider
                        min={1}
                        max={10}
                        disabled={mixBusy || !fadeInEnabled}
                        value={fadeInSec}
                        onChange={setFadeInSec}
                      />
                      <span>{fadeInSec}s</span>
                    </div>
                  </div>
                  <div className="detail-fade-row">
                    <div className="detail-fade-label">
                      <Switch checked={fadeOutEnabled} onChange={setFadeOutEnabled} disabled={mixBusy} />
                      <span>淡出 (Fade Out)</span>
                    </div>
                    <div className="detail-fade-slider">
                      <Slider
                        min={1}
                        max={10}
                        disabled={mixBusy || !fadeOutEnabled}
                        value={fadeOutSec}
                        onChange={setFadeOutSec}
                      />
                      <span>{fadeOutSec}s</span>
                    </div>
                  </div>
                  <div className="detail-fade-row">
                    <div className="detail-fade-label">
                      <Switch checked={bgmLoop} onChange={setBgmLoop} disabled={mixBusy} />
                      <span>BGM 自动循环铺满播客</span>
                    </div>
                  </div>
                </section>
              </div>
              <div className="detail-regenerate-submit">
                <Button
                  type="primary"
                  loading={regenerating}
                  disabled={mixBusy && !regenerating}
                  onClick={() => void handleRegenerate()}
                >
                  重新合成（覆盖当前音频）
                </Button>
              </div>
            </div>
          </details>
        </div>

        <div className="detail-delete-wrap">
          <button type="button" className="detail-delete-btn" onClick={handleDelete}>
            <DeleteOutlined /> 删除此组合音频
          </button>
        </div>
      </main>

      {regenerating && (
        <div className="detail-progress-overlay" role="dialog" aria-label="重新合成进度">
          <div className="detail-progress-card">
            <div className="detail-progress-icon">
              <SyncOutlined spin />
            </div>
            <h2 className="detail-hero-title" style={{ fontSize: 28, marginBottom: 16 }}>
              正在重新合成…
            </h2>
            <Progress percent={regenerateProgress} status="active" />
            <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
              预计还需 1–3 分钟，请勿关闭页面
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
