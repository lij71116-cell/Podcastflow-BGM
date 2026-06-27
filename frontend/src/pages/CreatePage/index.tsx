import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Input,
  Progress,
  Radio,
  Slider,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import { UploadOutlined, SoundOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { StepCard } from '@/components/StepCard'
import { uploadBgm, validateBgmUrl, validateQishuiShare } from '@/services/bgmService'
import { createMixedAudio, getMixTask } from '@/services/mixedAudioService'
import { parsePodcast } from '@/services/podcastService'
import { isXiaoyuzhouUrl } from '@/utils/format'
import { MOCK_COVER_COLOR } from '@/mocks/data'
import type { BgmSourceDTO, MixedAudioAssetDTO, PodcastSourceDTO } from '@/types/api'
import '@/components/StepCard.css'
import { MixPreviewPlayer } from '@/components/MixPreviewPlayer'
import { playMixedAsset } from '@/utils/player'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function CreatePage() {
  const navigate = useNavigate()
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

  const [previewPlayToken, setPreviewPlayToken] = useState(0)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [taskProgress, setTaskProgress] = useState(0)
  const [taskStatus, setTaskStatus] = useState<string | null>(null)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [mixedAudioId, setMixedAudioId] = useState<string | null>(null)
  const [completedAsset, setCompletedAsset] = useState<MixedAudioAssetDTO | null>(null)
  const [success, setSuccess] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const canGenerate = Boolean(podcast && bgm?.status === 'available') && !generating && !success
  const canPreview = Boolean(podcast && bgm?.status === 'available')

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
      setAccentColor(MOCK_COVER_COLOR)
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

  const handlePreview = () => {
    if (!podcast || !bgm) return
    setPreviewError(null)
    setPreviewPlayToken((token) => token + 1)
  }

  const handleGenerate = async () => {
    if (!podcast || !bgm) return
    setGenerating(true)
    setTaskError(null)
    setSuccess(false)
    setTaskProgress(0)
    setTaskStatus('pending')
    try {
      const result = await createMixedAudio({
        podcast_source_id: podcast.id,
        bgm_source_id: bgm.id,
        mix_config: {
          podcast_volume: podcastVolume / 100,
          podcast_playback_rate: podcastPlaybackRate,
          bgm_volume: bgmVolume / 100,
          bgm_playback_rate: bgmPlaybackRate,
          bgm_loop: bgmLoop,
        },
      })
      setMixedAudioId(result.mixed_audio.id)
      setTaskStatus(result.task.status)

      const assetOnComplete = (): MixedAudioAssetDTO => ({
        ...result.mixed_audio,
        status: 'completed',
        mix_config: {
          podcast_volume: podcastVolume / 100,
          podcast_playback_rate: podcastPlaybackRate,
          bgm_volume: bgmVolume / 100,
          bgm_playback_rate: bgmPlaybackRate,
          bgm_loop: bgmLoop,
        },
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
      }, 3000)
    } catch (e) {
      setGenerating(false)
      const msg = e instanceof Error ? e.message : '创建合成任务失败'
      setTaskError(msg)
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-content">
        <section className="hero-section">
          <h1>为小宇宙播客添加专注 BGM</h1>
          <p>输入小宇宙链接，添加 BGM，生成可保存、可复听的组合播客</p>
          <span className="scope-tag">当前仅支持小宇宙公开单集链接</span>
        </section>

        <StepCard step={1} title="输入小宇宙播客链接" done={Boolean(podcast)}>
          <Input.Group compact style={{ display: 'flex' }}>
            <Input
              style={{ flex: 1 }}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.xiaoyuzhoufm.com/episode/..."
            />
            <Button type="primary" loading={parsing} onClick={handleParse}>
              解析播客
            </Button>
          </Input.Group>
          <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
            支持格式：xiaoyuzhoufm.com/episode/&#123;单集ID&#125;
          </Typography.Text>
          {parseError && (
            <Alert type="error" message={parseError} showIcon style={{ marginTop: 12 }} />
          )}
        </StepCard>

        {podcast && (
          <StepCard
            step={2}
            title="播客信息"
            done
            accent
            accentColor={accentColor}
            extra={<Tag color="success">解析成功</Tag>}
          >
            <div className="podcast-info-row">
              <div className="cover-placeholder" style={{ background: accentColor }}>
                {podcast.cover_url ? (
                  <img src={podcast.cover_url} alt="" className="cover-img" />
                ) : (
                  podcast.podcast_name.slice(0, 1)
                )}
              </div>
              <div>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  {podcast.title}
                </Typography.Title>
                <Typography.Text type="secondary">播客：{podcast.podcast_name}</Typography.Text>
                <br />
                <Typography.Text type="secondary">
                  时长：{formatDuration(podcast.duration)}
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {podcast.description}
                </Typography.Text>
              </div>
            </div>
          </StepCard>
        )}

        <StepCard step={3} title="添加 BGM" done={bgm?.status === 'available'}>
          <Radio.Group
            value={bgmMode}
            onChange={(e) => setBgmMode(e.target.value as 'upload' | 'url' | 'qishui')}
            style={{ marginBottom: 12 }}
          >
            <Radio value="upload">上传本地 BGM</Radio>
            <Radio value="url">输入 BGM 音频链接</Radio>
            <Radio value="qishui">汽水音乐分享链接</Radio>
          </Radio.Group>
          {bgmMode === 'upload' ? (
            <Upload beforeUpload={handleBgmUpload} showUploadList={false} accept=".mp3,.m4a,.wav">
              <Button icon={<UploadOutlined />} loading={bgmLoading}>
                选择文件
              </Button>
              <Typography.Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                支持 mp3 / m4a / wav，最大 50MB
              </Typography.Text>
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
            <Typography.Text type="danger" style={{ display: 'block', marginTop: 8 }}>
              {bgmError}
            </Typography.Text>
          )}
          {bgm && (
            <div style={{ marginTop: 12 }}>
              <Tag color={bgm.status === 'available' ? 'success' : 'error'}>
                BGM {bgm.status === 'available' ? '可用' : '不可用'} · {bgm.title} ·{' '}
                {formatDuration(bgm.duration)}
              </Tag>
            </div>
          )}
        </StepCard>

        <StepCard step={4} title="混音配置">
          <section className="mix-config-subsection">
            <Typography.Text strong className="mix-config-subsection-title">
              播客
            </Typography.Text>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>音量</Typography.Text>
              <Slider
                min={0}
                max={100}
                value={podcastVolume}
                onChange={setPodcastVolume}
                tooltip={{ formatter: (v) => `${v}%` }}
              />
              <Typography.Text type="secondary">{podcastVolume}%</Typography.Text>
            </div>
            <div>
              <Typography.Text>播放倍速</Typography.Text>
              <Slider
                min={0.6}
                max={2}
                step={0.1}
                value={podcastPlaybackRate}
                onChange={setPodcastPlaybackRate}
                tooltip={{ formatter: (v) => `${(v ?? 1).toFixed(1)}x` }}
              />
              <Typography.Text type="secondary">{podcastPlaybackRate.toFixed(1)}x</Typography.Text>
            </div>
          </section>

          <section className="mix-config-subsection">
            <Typography.Text strong className="mix-config-subsection-title">
              BGM
            </Typography.Text>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>音量</Typography.Text>
              <Slider
                min={0}
                max={100}
                value={bgmVolume}
                onChange={setBgmVolume}
                tooltip={{ formatter: (v) => `${v}%` }}
              />
              <Typography.Text type="secondary">{bgmVolume}%</Typography.Text>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Typography.Text>播放倍速</Typography.Text>
              <Slider
                min={0.6}
                max={2}
                step={0.1}
                value={bgmPlaybackRate}
                onChange={setBgmPlaybackRate}
                tooltip={{ formatter: (v) => `${(v ?? 1).toFixed(1)}x` }}
              />
              <Typography.Text type="secondary">{bgmPlaybackRate.toFixed(1)}x</Typography.Text>
            </div>
            <Switch checked={bgmLoop} onChange={setBgmLoop} />{' '}
            <Typography.Text>BGM 自动循环铺满播客</Typography.Text>
          </section>

          <section className="mix-config-subsection">
            <Typography.Text strong className="mix-config-subsection-title">
              试听效果
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              按播客与 BGM 各自的音量、倍速叠加试听；播放中可随时调整，不会中断
            </Typography.Text>
            <Button icon={<SoundOutlined />} disabled={!canPreview} onClick={handlePreview}>
              试听
            </Button>
            {!podcast || bgm?.status !== 'available' ? (
              <Typography.Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                请先完成播客解析与 BGM 校验
              </Typography.Text>
            ) : null}
            {previewError && (
              <Alert type="error" message={previewError} showIcon style={{ marginTop: 12 }} />
            )}
            {podcast && bgm && (
              <MixPreviewPlayer
                key={`${podcast.id}-${bgm.id}`}
                podcastId={podcast.id}
                bgmId={bgm.id}
                podcastDurationSec={podcast.duration}
                podcastVolume={podcastVolume}
                podcastPlaybackRate={podcastPlaybackRate}
                bgmVolume={bgmVolume}
                bgmPlaybackRate={bgmPlaybackRate}
                bgmLoop={bgmLoop}
                playToken={previewPlayToken}
                onError={setPreviewError}
              />
            )}
          </section>
        </StepCard>

        <StepCard step={5} title="生成组合音频" done={success}>
          <Button type="primary" disabled={!canGenerate} loading={generating} onClick={handleGenerate}>
            生成组合音频
          </Button>
          {(generating || taskStatus) && !success && (
            <div style={{ marginTop: 16 }}>
              <Tag color="warning">{taskStatus === 'mixing' ? '合成中' : '等待中'}</Tag>
              <Progress percent={taskProgress} status="active" />
              <Typography.Text type="secondary">正在使用 FFmpeg 合成完整组合音频…</Typography.Text>
            </div>
          )}
          {taskError && (
            <Alert
              type="error"
              message={taskError}
              style={{ marginTop: 12 }}
              action={
                <Button
                  size="small"
                  onClick={() => {
                    setTaskError(null)
                    handleGenerate()
                  }}
                >
                  重新生成
                </Button>
              }
            />
          )}
        </StepCard>

        {success && (
          <StepCard step={6} title="生成成功" done extra={<Tag color="success">已完成</Tag>}>
            <Typography.Paragraph>已保存到「我的组合音频库」</Typography.Paragraph>
            <Button
              type="primary"
              style={{ marginRight: 8 }}
              onClick={() => completedAsset && playMixedAsset(completedAsset)}
            >
              播放
            </Button>
            <Button
              style={{ marginRight: 8 }}
              onClick={() => mixedAudioId && navigate(`/detail/${mixedAudioId}`)}
            >
              查看详情
            </Button>
            <Button onClick={() => navigate('/library')}>进入音频库</Button>
          </StepCard>
        )}
      </main>
    </>
  )
}
