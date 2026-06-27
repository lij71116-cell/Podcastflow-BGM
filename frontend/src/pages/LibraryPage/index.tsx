import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Modal,
  Pagination,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { MOCK_COVER_COLORS } from '@/mocks/data'
import { deleteMixedAudio, listMixedAudios } from '@/services/mixedAudioService'
import { playMixedAsset } from '@/utils/player'
import { usePlayerStore } from '@/stores/playerStore'
import type { MixedAudioAssetDTO } from '@/types/api'
import { formatCreatedAt, formatDuration } from '@/utils/format'
import {
  LIBRARY_PAGE_SIZE,
  filterLibraryAssets,
  paginateAssets,
} from './libraryFilters'
import '@/components/GlobalPlayerBar.css'
import '@/components/StepCard.css'
import './LibraryPage.css'

const { RangePicker } = DatePicker

function statusLabel(status: MixedAudioAssetDTO['status']): string {
  const map = {
    pending: '等待中',
    mixing: '合成中',
    completed: '已完成',
    failed: '失败',
  }
  return map[status]
}

export default function LibraryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<MixedAudioAssetDTO[]>([])
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await listMixedAudios()
        if (!cancelled) setAssets(data.items)
      } catch {
        if (!cancelled) message.error('加载音频库失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredAssets = useMemo(
    () => filterLibraryAssets(assets, keyword, dateRange),
    [assets, keyword, dateRange],
  )

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / LIBRARY_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const pageAssets = useMemo(
    () => paginateAssets(filteredAssets, currentPage, LIBRARY_PAGE_SIZE),
    [filteredAssets, currentPage],
  )

  const reloadAssets = async () => {
    setLoading(true)
    try {
      const data = await listMixedAudios()
      setAssets(data.items)
    } catch {
      message.error('加载音频库失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (asset: MixedAudioAssetDTO) => {
    playMixedAsset(asset)
  }

  const handleDelete = (asset: MixedAudioAssetDTO) => {
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
          await reloadAssets()
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败')
        }
      },
    })
  }

  const resetFilters = () => {
    setKeyword('')
    setDateRange(null)
    setPage(1)
  }

  const hasActiveFilters = keyword.trim().length > 0 || dateRange !== null
  const showToolbar = !loading && assets.length > 0
  const showFooter = !loading && filteredAssets.length > 0

  return (
    <>
      <AppHeader />
      <main className="page-content">
        <div className="page-header-row">
          <Typography.Title level={3} style={{ margin: 0 }}>
            我的组合音频
          </Typography.Title>
          <Link to="/">
            <Button type="primary">创建新组合音频</Button>
          </Link>
        </div>

        {showToolbar && (
          <div className="library-toolbar">
            <Input
              className="library-search"
              allowClear
              placeholder="搜索播客标题或节目名"
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                setPage(1)
              }}
            />
            <RangePicker
              className="library-date-range"
              value={dateRange}
              onChange={(values) => {
                setPage(1)
                if (values?.[0] && values[1]) {
                  setDateRange([values[0], values[1]])
                } else {
                  setDateRange(null)
                }
              }}
              placeholder={['创建起始日期', '创建结束日期']}
            />
            {hasActiveFilters && (
              <Button onClick={resetFilters}>重置筛选</Button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : assets.length === 0 ? (
          <Empty
            description="还没有组合音频"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 48 }}
          >
            <Link to="/">
              <Button type="primary">创建第一个组合音频</Button>
            </Link>
          </Empty>
        ) : filteredAssets.length === 0 ? (
          <Empty description="没有符合条件的组合音频" style={{ marginTop: 48 }}>
            <Button onClick={resetFilters}>清除筛选条件</Button>
          </Empty>
        ) : (
          <>
            <div className="asset-grid">
              {pageAssets.map((asset) => {
                const coverColor = MOCK_COVER_COLORS[asset.id] ?? '#2D6A4F'
                const initial = asset.podcast.podcast_name.slice(0, 1)
                return (
                  <Card key={asset.id} className="asset-card">
                    <div className="asset-card-top">
                      <div className="cover-sm" style={{ background: coverColor }}>
                        {asset.podcast.cover_url ? (
                          <img src={asset.podcast.cover_url} alt="" className="cover-img" />
                        ) : (
                          initial
                        )}
                      </div>
                      <div>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
                          {asset.title}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          播客：{asset.podcast.podcast_name}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          BGM：{asset.bgm.title}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          时长：{formatDuration(asset.duration)} · 创建：
                          {formatCreatedAt(asset.created_at)}
                        </Typography.Text>
                        <Tag
                          color={asset.status === 'completed' ? 'success' : 'default'}
                          style={{ marginTop: 4 }}
                        >
                          {statusLabel(asset.status)}
                        </Tag>
                      </div>
                    </div>
                    <div className="asset-card-actions">
                      <Button type="primary" size="small" onClick={() => handlePlay(asset)}>
                        播放
                      </Button>
                      <Button size="small" onClick={() => navigate(`/detail/${asset.id}`)}>
                        详情
                      </Button>
                      <Button size="small" danger onClick={() => handleDelete(asset)}>
                        删除
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>

            {showFooter && (
              <div className="library-footer">
                <Typography.Text type="secondary" className="library-stats">
                  共 {filteredAssets.length} 条
                  {hasActiveFilters ? '（已筛选）' : ''}
                  · 本页 {pageAssets.length} 条
                </Typography.Text>
                {filteredAssets.length > LIBRARY_PAGE_SIZE && (
                  <Pagination
                    current={currentPage}
                    pageSize={LIBRARY_PAGE_SIZE}
                    total={filteredAssets.length}
                    onChange={setPage}
                    showSizeChanger={false}
                    showQuickJumper={filteredAssets.length > LIBRARY_PAGE_SIZE * 3}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
