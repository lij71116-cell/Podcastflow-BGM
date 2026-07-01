import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Input,
  Progress,
  Slider,
  Switch,
  Typography,
  Upload,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CustomerServiceOutlined,
  SoundOutlined,
  SyncOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { uploadBgm, validateBgmUrl, validateQishuiShare } from '@/services/bgmService'
import { createMixPreview, createMixedAudio, getMixTask } from '@/services/mixedAudioService'
import { parsePodcast } from '@/services/podcastService'
import { isXiaoyuzhouUrl } from '@/utils/format'
import { extractAccentColorFromImage } from '@/utils/coverColor'
import { MOCK_COVER_COLOR } from '@/mocks/data'
import type { BgmSourceDTO, MixedAudioAssetDTO, PodcastSourceDTO } from '@/types/api'
import '@/components/StepCard.css'
import { MixPreviewPlayer } from '@/components/MixPreviewPlayer'
import { playMixedAsset } from '@/utils/player'
import { isTouchPreviewDevice } from '@/utils/previewDevice'
import { CreateEventAxis } from './CreateEventAxis'
import type { CreateFlowStep } from './createFlowSteps'
import './CreatePage.css'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CreatePage() {
  const navigate = useNavigate()
  const [activeStep, setActiveStep] = useState<CreateFlowStep>(1)
  const [maxReachedStep, setMaxReachedStep] = useState<CreateFlowStep>(1)

  const [sourceUrl, setSourceUrl] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [podcast, setPodcast] = useState<PodcastSourceDTO | null>(null)
  const [accentColor, setAccentColor] = useState(MOCK_COVER_COLOR)

  const [bgmMode, setBgmMode] = useState<'upload' | 'url' | 'qishui'>('upload')
  const [bgmUrl, setBgmUrl] = useState('')
  const [qishuiUrl, setQishuiUrl] = useState('')
  const [bgm, setBgm] = useState<BgmSourceDTO | null>(null)
  const [bgmLoading, setBgmLoading] = useState(false)
  const [bgmError, setBgmError] = useState<string | null>(null)

  const [podcastVolume, setPodcastVolume] = useState(100)
  const [podcastPlaybackRate, setPodcastPlaybackRate] = useState(1.0)
  const [bgmVolume, setBgmVolume] = useState(15)
  const [bgmPlaybackRate, setBgmPlaybackRate] = useState(1.0)
  const [bgmLoop, setBgmLoop] = useState(true)
  const [fadeInEnabled, setFadeInEnabled] = useState(true)
  const [fadeOutEnabled, setFadeOutEnabled] = useState(true)
  const [fadeInSec, setFadeInSec] = useState(3)
  const [fadeOutSec, setFadeOutSec] = useState(5)

  const [previewPlayToken, setPreviewPlayToken] = useState(0)
  const [previewMasterVolume, setPreviewMasterVolume] = useState(80)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewGenerating, setPreviewGenerating] = useState(false)
  const [serverPreview, setServerPreview] = useState<{ playUrl: string; duration: number } | null>(
    null,
  )

  const [generating, setGenerating] = useState(false)
  const [taskProgress, setTaskProgress] = useState(0)
  const [taskStatus, setTaskStatus] = useState<string | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [mixedAudioId, setMixedAudioId] = useState<string | null>(null)
  const [completedAsset, setCompletedAsset] = useState<MixedAudioAssetDTO | null>(null)
  const [success, setSuccess] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const step1Complete = Boolean(podcast && bgm?.status === 'available')
  const canGenerate = step1Complete && !generating && !success
  const canPreview = step1Complete

  const buildMixConfig = useCallback(
    () => ({
      podcast_volume: podcastVolume / 100,
      podcast_playback_rate: podcastPlaybackRate,
      bgm_volume: bgmVolume / 100,
      bgm_playback_rate: bgmPlaybackRate,
      bgm_loop: bgmLoop,
      fade_in: fadeInEnabled ? fadeInSec : 0,
      fade_out: fadeOutEnabled ? fadeOutSec : 0,
    }),
    [
      podcastVolume,
      podcastPlaybackRate,
      bgmVolume,
      bgmPlaybackRate,
      bgmLoop,
      fadeInEnabled,
      fadeInSec,
      fadeOutEnabled,
      fadeOutSec,
    ],
  )

  const goToStep = (step: CreateFlowStep) => {
    if (step <= maxReachedStep) setActiveStep(step)
  }

  const goNext = () => {
    if (activeStep === 1) {
      if (!step1Complete) {
        message.warning('请先完成播客解析与 BGM 添加')
        return
      }
      setActiveStep(2)
      setMaxReachedStep((prev) => (prev < 2 ? 2 : prev))
      return
    }
    if (activeStep === 2) {
      setActiveStep(3)
      setMaxReachedStep(3)
    }
  }

  const goPrev = () => {
    if (activeStep > 1) setActiveStep((s) => (s - 1) as CreateFlowStep)
  }

  const handleParse = async () => {
    const url = sourceUrl.trim()
    setParseError(null)
    if (!isXiaoyuzhouUrl(url)) {
      setParseError('链接格式无效，请输入小宇宙公开单集链接（xiaoyuzhoufm.com/episode/{id}）')
      return
    }
    setParsing(true)
    setPodcast(null)
    setPreviewError(null)
    setSuccess(false)
    try {
      const data = await parsePodcast(url)
      setPodcast(data)
      if (data.cover_url) {
        const accent = await extractAccentColorFromImage(data.cover_url)
        setAccentColor(accent)
      } else {
        setAccentColor(MOCK_COVER_COLOR)
      }
      message.success('播客解析成功')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '播客解析失败'
      setParseError(msg)
    } finally {
      setParsing(false)
    }
  }

  const handleBgmUpload = async (file: File) => {
    setBgmError(null)
    setBgmLoading(true)
    try {
      const data = await uploadBgm(file)
      setBgm(data)
      setPreviewError(null)
      message.success('BGM 校验通过')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'BGM 不可用'
      setBgmError(msg)
      message.error(msg)
    } finally {
      setBgmLoading(false)
    }
    return false
  }

  const handleValidateBgmUrl = async () => {
    if (!bgmUrl.trim()) return
    setBgmError(null)
    setBgmLoading(true)
    try {
      const data = await validateBgmUrl(bgmUrl.trim())
      setBgm(data)
      setPreviewError(null)
      message.success('BGM 校验通过')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'BGM 链接不可用，请重新上传或更换链接'
      setBgmError(msg)
      message.error(msg)
    } finally {
      setBgmLoading(false)
    }
  }

  const handleValidateQishuiShare = async () => {
    if (!qishuiUrl.trim()) return
    setBgmError(null)
    setBgmLoading(true)
    try {
      const data = await validateQishuiShare(qishuiUrl.trim())
      setBgm(data)
      setPreviewError(null)
      message.success('BGM 校验通过')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '汽水音乐链接不可用'
      setBgmError(msg)
      message.error(msg)
    } finally {
      setBgmLoading(false)
    }
  }

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const handlePreview = async () => {
    if (!podcast || !bgm || previewGenerating) return
    setPreviewError(null)

    if (isTouchPreviewDevice()) {
      setPreviewGenerating(true)
      try {
        const result = await createMixPreview({
          podcast_source_id: podcast.id,
          bgm_source_id: bgm.id,
          mix_config: buildMixConfig(),
          start_sec: 0,
          duration_sec: 60,
        })
        setServerPreview({ playUrl: result.play_url, duration: result.duration })
        setPreviewPlayToken((token) => token + 1)
      } catch (error) {
        setPreviewError(error instanceof Error ? error.message : '试听生成失败')
      } finally {
        setPreviewGenerating(false)
      }
      return
    }

    setServerPreview(null)
    setPreviewPlayToken((token) => token + 1)
  }

  const handleGenerate = async () => {
    if (!podcast || !bgm) return
    setActiveStep(3)
    setMaxReachedStep(3)
    setGenerating(true)
    setTaskError(null)
    setSuccess(false)
    setTaskProgress(0)
    setTaskStatus('pending')
    try {
      const mixConfig = buildMixConfig()
      const result = await createMixedAudio({
        podcast_source_id: podcast.id,
        bgm_source_id: bgm.id,
        mix_config: mixConfig,
      })
      setMixedAudioId(result.mixed_audio.id)
      setTaskStatus(result.task.status)

      const assetOnComplete = (): MixedAudioAssetDTO => ({
        ...result.mixed_audio,
        status: 'completed',
        mix_config: mixConfig,
      })

      let pollErrors = 0
      pollRef.current = setInterval(async () => {
        try {
          const task = await getMixTask(result.mixed_audio.id)
          pollErrors = 0
          setTaskProgress(task.progress)
          setTaskStatus(task.status)
          if (task.status === 'completed') {
            stopPolling()
            setGenerating(false)
            setSuccess(true)
            setCompletedAsset(assetOnComplete())
            message.success('组合音频生成成功')
          }
          if (task.status === 'failed') {
            stopPolling()
            setGenerating(false)
            setTaskError(task.error_message ?? '合成失败')
          }
        } catch (e) {
          pollErrors += 1
          if (pollErrors >= 5) {
            stopPolling()
            setGenerating(false)
            const msg = e instanceof Error ? e.message : '合成状态查询失败'
            setTaskError(msg)
          }
        }
      }, 2000)
    } catch (e) {
      setGenerating(false)
      const msg = e instanceof Error ? e.message : '创建合成任务失败'
      setTaskError(msg)
    }
  }

  const renderUploadStep = () => (
    <div className="create-step1-wrap">
      <div className="create-panel">
        <section className="create-panel-section">
          <div className="create-panel-section-title">
            <span className="create-panel-icon create-panel-icon--podcast">
              <CustomerServiceOutlined />
            </span>
            小宇宙播客
          </div>
          <div className="create-parse-row">
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="粘贴小宇宙单集链接，例如 https://www.xiaoyuzhoufm.com/episode/..."
            />
            <Button type="primary" loading={parsing} onClick={handleParse}>
              解析播客
            </Button>
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
            支持直接从 App 复制单集分享链接
          </Typography.Text>
          {parseError && <Alert type="error" message={parseError} showIcon />}
          {podcast && (
            <div className="create-parsed-card">
              <div className="cover-placeholder" style={{ background: accentColor }}>
                {podcast.cover_url ? (
                  <img src={podcast.cover_url} alt="" className="cover-img" />
                ) : (
                  podcast.podcast_name.slice(0, 1)
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Title level={5} style={{ marginTop: 0 }} ellipsis>
                  {podcast.title}
                </Typography.Title>
                <Typography.Text type="secondary">
                  播客：{podcast.podcast_name} · {formatDuration(podcast.duration)}
                </Typography.Text>
              </div>
              <span className="create-parsed-badge">
                <CheckCircleOutlined /> 解析成功
              </span>
            </div>
          )}
        </section>

        <hr className="create-panel-divider" />

        <section className="create-panel-section">
          <div className="create-panel-section-title">
            <span className="create-panel-icon create-panel-icon--bgm">
              <SoundOutlined />
            </span>
            添加 BGM
          </div>
          <div className="create-bgm-tabs">
            {(
              [
                ['upload', '本地上传'],
                ['url', '音频链接'],
                ['qishui', '汽水音乐链接'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={bgmMode === mode ? 'active' : ''}
                onClick={() => setBgmMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
          {bgmMode === 'upload' ? (
            <Upload beforeUpload={handleBgmUpload} showUploadList={false} accept=".mp3,.m4a,.wav">
              <div className="create-bgm-dropzone">
                <div className="create-bgm-dropzone-icon">
                  <CloudUploadOutlined />
                </div>
                <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                  点击或拖拽上传 BGM
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  支持 MP3, WAV 格式，最大 100MB
                </Typography.Text>
              </div>
            </Upload>
          ) : bgmMode === 'url' ? (
            <Input.Group compact style={{ display: 'flex' }}>
              <Input
                style={{ flex: 1 }}
                value={bgmUrl}
                onChange={(e) => setBgmUrl(e.target.value)}
                placeholder="https://example.com/focus-bgm.mp3"
              />
              <Button loading={bgmLoading} onClick={handleValidateBgmUrl}>
                校验链接
              </Button>
            </Input.Group>
          ) : (
            <Input.Group compact style={{ display: 'flex' }}>
              <Input
                style={{ flex: 1 }}
                value={qishuiUrl}
                onChange={(e) => setQishuiUrl(e.target.value)}
                placeholder="https://qishui.douyin.com/s/xxxxxx/"
              />
              <Button loading={bgmLoading} onClick={handleValidateQishuiShare}>
                校验链接
              </Button>
            </Input.Group>
          )}
          {bgmError && (
            <Typography.Text type="danger" style={{ display: 'block' }}>
              {bgmError}
            </Typography.Text>
          )}
          {bgm?.status === 'available' && (
            <span className="create-bgm-success-tag">
              <CheckCircleOutlined /> BGM 可用 · {bgm.title} · {formatDuration(bgm.duration)}
            </span>
          )}
        </section>
      </div>

      <div className="create-step1-footer">
        <Button
          type="primary"
          size="large"
          className="create-next-btn"
          disabled={!step1Complete}
          onClick={goNext}
        >
          下一步：混音配置 <ArrowRightOutlined />
        </Button>
      </div>
    </div>
  )

  const renderMixStep = () => (
    <>
      <div className="create-mix-layout">
        <div className="create-mix-main">
          <section className="create-mix-card">
            <div className="create-mix-card-header">
              <h3>
                <CustomerServiceOutlined /> 播客
              </h3>
            </div>
            <div className="create-slider-row">
              <div className="create-slider-label">
                <span>音量</span>
                <span className="create-slider-value">{podcastVolume}%</span>
              </div>
              <Slider min={0} max={100} value={podcastVolume} onChange={setPodcastVolume} />
            </div>
            <div className="create-slider-row">
              <div className="create-slider-label">
                <span>倍速</span>
                <span className="create-slider-value">{podcastPlaybackRate.toFixed(1)}x</span>
              </div>
                <Slider min={0.5} max={2} step={0.1} value={podcastPlaybackRate} onChange={setPodcastPlaybackRate} />
            </div>
          </section>

          <section className="create-mix-card">
            <div className="create-mix-card-header">
              <h3>
                <SoundOutlined /> 背景音乐 (BGM)
              </h3>
              {bgm?.status === 'available' && <span className="create-mix-badge">已选择 1 首</span>}
            </div>
            <div className="create-slider-row">
              <div className="create-slider-label">
                <span>音量</span>
                <span className="create-slider-value">{bgmVolume}%</span>
              </div>
              <Slider min={0} max={100} value={bgmVolume} onChange={setBgmVolume} />
            </div>
            <div className="create-slider-row">
              <div className="create-slider-label">
                <span>倍速</span>
                <span className="create-slider-value">{bgmPlaybackRate.toFixed(1)}x</span>
              </div>
              <Slider min={0.5} max={2} step={0.1} value={bgmPlaybackRate} onChange={setBgmPlaybackRate} />
            </div>
            <hr className="create-mix-divider" />
            <div className="create-fade-row">
              <div className="fade-label">
                <Switch checked={fadeInEnabled} onChange={setFadeInEnabled} />
                <span>淡入 (Fade In)</span>
              </div>
              <div className="fade-slider-wrap">
                <Slider min={1} max={10} disabled={!fadeInEnabled} value={fadeInSec} onChange={setFadeInSec} />
                <span className="create-slider-value">{fadeInSec}s</span>
              </div>
            </div>
            <div className="create-fade-row">
              <div className="fade-label">
                <Switch checked={fadeOutEnabled} onChange={setFadeOutEnabled} />
                <span>淡出 (Fade Out)</span>
              </div>
              <div className="fade-slider-wrap">
                <Slider min={1} max={10} disabled={!fadeOutEnabled} value={fadeOutSec} onChange={setFadeOutSec} />
                <span className="create-slider-value">{fadeOutSec}s</span>
              </div>
            </div>
            <div className="create-fade-row">
              <div className="fade-label">
                <Switch checked={bgmLoop} onChange={setBgmLoop} />
                <span>BGM 自动循环铺满播客</span>
              </div>
            </div>
          </section>
        </div>

        <div className="create-mix-preview">
          <section className="create-preview-card">
            <div className="create-preview-idle">
              <div className="create-preview-play-circle">
                <SoundOutlined />
              </div>
              <h3>生成试听片段</h3>
              <Button
                type="primary"
                disabled={!canPreview || previewPlayToken > 0 || previewGenerating}
                loading={previewGenerating}
                onClick={() => void handlePreview()}
                block
                className={previewPlayToken > 0 ? 'create-preview-start-btn is-active' : 'create-preview-start-btn'}
              >
                {previewGenerating
                  ? '正在生成试听…'
                  : previewPlayToken > 0
                    ? '试听中…'
                    : '开始试听'}
              </Button>
            </div>
            {previewError && (
              <Alert type="error" message={previewError} showIcon style={{ marginTop: 12 }} />
            )}
            {previewPlayToken > 0 && podcast && bgm && (
              <MixPreviewPlayer
                key={`${podcast.id}-${bgm.id}-${previewPlayToken}-${serverPreview?.playUrl ?? 'dual'}`}
                podcastId={podcast.id}
                bgmId={bgm.id}
                podcastDurationSec={podcast.duration}
                podcastVolume={podcastVolume}
                podcastPlaybackRate={podcastPlaybackRate}
                bgmVolume={bgmVolume}
                bgmPlaybackRate={bgmPlaybackRate}
                bgmLoop={bgmLoop}
                masterVolume={previewMasterVolume}
                onMasterVolumeChange={setPreviewMasterVolume}
                playToken={previewPlayToken}
                serverPreview={serverPreview}
                onError={setPreviewError}
              />
            )}
          </section>
        </div>
      </div>

      <div className="create-mix-footer">
        <Button className="create-mix-nav-btn create-prev-btn" icon={<ArrowLeftOutlined />} onClick={goPrev}>
          上一步
        </Button>
        <Button type="primary" className="create-mix-nav-btn create-next-btn" onClick={goNext}>
          下一步：确认与生成 <ArrowRightOutlined />
        </Button>
      </div>
    </>
  )

  const renderConfirmStep = () => (
    <div className="create-confirm-wrap">
      {!generating && !success && (
        <div className="create-confirm-state">
          <div className="create-confirm-orbit">
            <div className="create-confirm-cover" style={{ background: accentColor }}>
              {podcast?.cover_url ? (
                <img src={podcast.cover_url} alt="" />
              ) : (
                podcast?.podcast_name.slice(0, 1) ?? '专'
              )}
            </div>
          </div>
          <h1 className="create-confirm-title">准备生成组合音频</h1>
          <p className="create-confirm-subtitle">将使用 FFmpeg 合成完整 MP3，并保存到你的个人音频库</p>

          <div className="create-glass-card">
            <h2>
              <UnorderedListOutlined /> 请进行任务内容确认
            </h2>
            <div className="create-glass-meta">
              <p>
                <strong>播客:</strong> {podcast?.title ?? '—'}
              </p>
              <p>
                <strong>BGM:</strong> {bgm?.title ?? '—'}
              </p>
            </div>
            <div className="create-config-grid">
              <div>
                <label>播客参数</label>
                <span>
                  音量 {podcastVolume}% / 倍速 {podcastPlaybackRate.toFixed(1)}x
                </span>
              </div>
              <div>
                <label>BGM参数</label>
                <span>
                  音量 {bgmVolume}% / 倍速 {bgmPlaybackRate.toFixed(1)}x / 自动循环{' '}
                  {bgmLoop ? '开启' : '关闭'}
                </span>
                <span style={{ display: 'block', marginTop: 4 }}>
                  淡入 {fadeInEnabled ? `${fadeInSec}秒` : '关'} / 淡出{' '}
                  {fadeOutEnabled ? `${fadeOutSec}秒` : '关'}
                </span>
              </div>
            </div>
          </div>

          <div className="create-confirm-actions">
            <Button className="create-confirm-prev-btn" icon={<ArrowLeftOutlined />} onClick={goPrev}>
              上一步
            </Button>
            <Button
              type="primary"
              className="create-confirm-generate-btn"
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              生成组合音频
            </Button>
          </div>
          {taskError && !generating && (
            <Alert
              type="error"
              message={taskError}
              style={{ marginTop: 16, width: '100%' }}
              action={
                <Button size="small" onClick={() => { setTaskError(null); void handleGenerate() }}>
                  重试
                </Button>
              }
            />
          )}
        </div>
      )}

      {generating && !success && (
        <div className="create-progress-overlay">
          <div className="create-progress-icon">
            <SyncOutlined spin />
          </div>
          <h2 className="create-confirm-title">正在合成…</h2>
          <Progress
            percent={taskProgress}
            status="active"
            style={{ width: '100%', maxWidth: 400, margin: '16px 0' }}
          />
          <Typography.Text type="secondary">
            {taskStatus === 'mixing' ? '合成中' : '等待中'} · 预计还需 1–3 分钟，请勿关闭页面
          </Typography.Text>
          {taskError && (
            <Alert
              type="error"
              message={taskError}
              style={{ marginTop: 16, width: '100%' }}
              action={
                <Button size="small" onClick={() => { setTaskError(null); void handleGenerate() }}>
                  重试
                </Button>
              }
            />
          )}
        </div>
      )}

      {success && (
        <div className="create-confirm-state">
          <div className="create-success-icon">
            <CheckCircleOutlined />
          </div>
          <h2 className="create-confirm-title">生成成功</h2>
          <p className="create-confirm-subtitle">组合音频已保存，可在任意设备登录后播放</p>
          <div className="create-success-actions">
            <Button
              type="primary"
              className="create-success-btn"
              icon={<SoundOutlined />}
              onClick={() => completedAsset && playMixedAsset(completedAsset)}
            >
              播放
            </Button>
            <Button
              className="create-success-btn create-success-btn--secondary"
              onClick={() => mixedAudioId && navigate(`/detail/${mixedAudioId}`)}
            >
              查看详情
            </Button>
            <Button
              className="create-success-btn create-success-btn--outline"
              onClick={() => navigate('/library')}
            >
              我的音频库
            </Button>
          </div>
          <button
            type="button"
            className="create-restart-link"
            onClick={() => {
              setSuccess(false)
              setActiveStep(1)
              setMaxReachedStep(1)
              setPodcast(null)
              setBgm(null)
              setSourceUrl('')
              setMixedAudioId(null)
              setCompletedAsset(null)
            }}
          >
            再创建一个
          </button>
        </div>
      )}
    </div>
  )

  return (
    <main className="create-page">
      <section className="create-hero">
        <span className="scope-tag">当前仅支持小宇宙公开单集链接</span>
        <h1>为小宇宙播客添加专注 BGM</h1>
        <p>按步骤完成内容上传、混音配置与生成</p>
      </section>

      <CreateEventAxis
        activeStep={activeStep}
        maxReachedStep={maxReachedStep}
        onStepClick={goToStep}
      />

      {activeStep === 1 && renderUploadStep()}
      {activeStep === 2 && renderMixStep()}
      {activeStep === 3 && renderConfirmStep()}
    </main>
  )
}
