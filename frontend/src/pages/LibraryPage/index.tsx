import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  Modal,
  Spin,
  message,
} from 'antd'
import {
  CalendarOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import { Link } from 'react-router-dom'
import {
  deleteMixedAudiosBatch,
  listMixedAudios,
} from '@/services/mixedAudioService'
import { playMixedAsset } from '@/utils/player'
import { usePlayerStore } from '@/stores/playerStore'
import type { MixedAudioAssetDTO } from '@/types/api'
import { LibraryAssetCard } from './LibraryAssetCard'
import { LIBRARY_PAGE_SIZE } from '@/utils/libraryList'
import './LibraryPage.css'

const { RangePicker } = DatePicker

function buildPageNumbers(current: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages: Array<number | 'ellipsis'> = [1]
  if (current > 3) pages.push('ellipsis')

  const start = Math.max(2, current - 1)
  const end = Math.min(totalPages - 1, current + 1)
  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (current < totalPages - 2) pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

export default function LibraryPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MixedAudioAssetDTO[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(LIBRARY_PAGE_SIZE)
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const data = await listMixedAudios({
          page,
          page_size: LIBRARY_PAGE_SIZE,
          q: debouncedKeyword.trim() || undefined,
          created_from: dateRange?.[0]?.format('YYYY-MM-DD'),
          created_to: dateRange?.[1]?.format('YYYY-MM-DD'),
        })
        if (cancelled) return
        setItems(data.items)
        setTotal(data.total)
        setPageSize(data.page_size)
        setHasLoadedOnce(true)
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
  }, [page, debouncedKeyword, dateRange])

  const reloadLibrary = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listMixedAudios({
        page,
        page_size: LIBRARY_PAGE_SIZE,
        q: debouncedKeyword.trim() || undefined,
        created_from: dateRange?.[0]?.format('YYYY-MM-DD'),
        created_to: dateRange?.[1]?.format('YYYY-MM-DD'),
      })
      setItems(data.items)
      setTotal(data.total)
      setPageSize(data.page_size)
      setHasLoadedOnce(true)
    } catch {
      message.error('加载音频库失败')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedKeyword, dateRange])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageNumbers = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  )

  const hasActiveFilters = debouncedKeyword.trim().length > 0 || dateRange !== null
  const showToolbar = hasLoadedOnce && (total > 0 || hasActiveFilters)

  const toggleBatchMode = () => {
    setBatchMode((prev) => !prev)
    setSelectedIds([])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handlePlay = (asset: MixedAudioAssetDTO) => {
    if (batchMode) {
      toggleSelect(asset.id)
      return
    }
    playMixedAsset(asset)
  }

  const resetFilters = () => {
    setKeyword('')
    setDebouncedKeyword('')
    setDateRange(null)
    setPage(1)
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return

    Modal.confirm({
      title: '确认批量删除',
      content: `确定删除选中的 ${selectedIds.length} 条组合音频吗？删除后不可恢复。`,
      okText: `删除 ${selectedIds.length} 项`,
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteMixedAudiosBatch(selectedIds)
          selectedIds.forEach((id) => usePlayerStore.getState().closeIfCurrent(id))
          message.success(`已删除 ${selectedIds.length} 项`)
          setSelectedIds([])
          setBatchMode(false)
          await reloadLibrary()
        } catch (e) {
          message.error(e instanceof Error ? e.message : '批量删除失败')
        }
      },
    })
  }

  return (
    <main className="library-page page-content">
      <div className="library-header">
        <h1 className="library-title">我的组合音频</h1>
        <Link to="/" className="library-create-btn">
          <PlusOutlined />
          创建新组合
        </Link>
      </div>

      {showToolbar && (
        <div className="library-toolbar">
          <Input
            className="library-search"
            allowClear
            placeholder="搜索标题或播客名..."
            prefix={<SearchOutlined className="library-search-icon" />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className="library-toolbar-actions">
            <Dropdown
              trigger={['click']}
              dropdownRender={() => (
                <div className="library-date-dropdown">
                  <RangePicker
                    value={dateRange}
                    onChange={(values) => {
                      setPage(1)
                      if (values?.[0] && values[1]) {
                        setDateRange([values[0], values[1]])
                      } else {
                        setDateRange(null)
                      }
                    }}
                    placeholder={['起始日期', '结束日期']}
                  />
                </div>
              )}
            >
              <button type="button" className="library-date-btn">
                <CalendarOutlined />
                {dateRange
                  ? `${dateRange[0].format('YYYY-MM-DD')} ~ ${dateRange[1].format('YYYY-MM-DD')}`
                  : '全部日期'}
              </button>
            </Dropdown>
            {hasActiveFilters && (
              <Button className="library-reset-btn" onClick={resetFilters}>
                重置
              </Button>
            )}
            <Button
              type={batchMode ? 'primary' : 'default'}
              className="library-batch-btn"
              icon={<UnorderedListOutlined />}
              onClick={toggleBatchMode}
            >
              {batchMode ? '退出批量' : '批量管理'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="library-loading">
          <Spin size="large" />
        </div>
      ) : total === 0 && !hasActiveFilters ? (
        <Empty
          description="还没有组合音频"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="library-empty"
        >
          <Link to="/">
            <Button type="primary">创建第一个组合音频</Button>
          </Link>
        </Empty>
      ) : items.length === 0 ? (
        <Empty description="没有符合条件的组合音频" className="library-empty">
          <Button onClick={resetFilters}>清除筛选条件</Button>
        </Empty>
      ) : (
        <>
          <div className={`library-grid${batchMode ? ' library-grid--batch' : ''}`}>
            {items.map((asset, index) => (
              <LibraryAssetCard
                key={asset.id}
                asset={asset}
                featured={index === 2}
                batchMode={batchMode}
                selected={selectedIds.includes(asset.id)}
                onToggleSelect={toggleSelect}
                onPlay={handlePlay}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="library-pagination" aria-label="音频库分页">
              <button
                type="button"
                className="library-page-btn"
                disabled={currentPage <= 1}
                aria-label="上一页"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <LeftOutlined />
              </button>
              {pageNumbers.map((item, index) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="library-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`library-page-btn${item === currentPage ? ' library-page-btn--active' : ''}`}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                className="library-page-btn"
                disabled={currentPage >= totalPages}
                aria-label="下一页"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                <RightOutlined />
              </button>
            </nav>
          )}
        </>
      )}

      <div className={`library-batch-bar${batchMode && selectedIds.length > 0 ? ' library-batch-bar--visible' : ''}`}>
        <span>已选 {selectedIds.length} 项</span>
        <Button onClick={() => setSelectedIds([])}>取消选择</Button>
        <Button danger type="primary" onClick={handleBatchDelete}>
          删除 {selectedIds.length} 项
        </Button>
      </div>
    </main>
  )
}
