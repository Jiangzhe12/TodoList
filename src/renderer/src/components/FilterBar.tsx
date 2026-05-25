import { useRef, useEffect } from 'react'
import { useTodoStore } from '../store'
import { FilterCategory, FilterStatus } from '../types'

const categories: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'optimization', label: '优化' }
]

const statuses: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待办' },
  { value: 'in_progress', label: '进行中' },
  { value: 'done', label: '已完成' }
]

interface FilterBarProps {
  searchFocusRef: React.RefObject<HTMLInputElement | null>
}

export default function FilterBar({ searchFocusRef }: FilterBarProps): JSX.Element {
  const { filterCategory, filterStatus, searchQuery, sortByPriority, filterTag, customTags, setFilterCategory, setFilterStatus, setSearchQuery, toggleSortByPriority, setFilterTag } =
    useTodoStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchFocusRef && 'current' in searchFocusRef) {
      ;(searchFocusRef as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current
    }
  }, [searchFocusRef])

  return (
    <div className="px-3 py-2 space-y-2 surface-glass" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索任务..."
          className="input-field sm"
          style={{ paddingLeft: '28px', paddingRight: '24px', fontSize: '12px' }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon"
            style={{ padding: '2px' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-1">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCategory(c.value)}
            className={`pill ${filterCategory === c.value ? 'active' : ''}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Status filter + sort */}
      <div className="flex gap-1 items-center">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`pill ${filterStatus === s.value ? 'active' : ''}`}
          >
            {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleSortByPriority}
          className={`pill ${sortByPriority ? 'active' : ''}`}
          title="按优先级排序"
        >
          ↕ 优先级
        </button>
      </div>

      {/* Tag filter */}
      {customTags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterTag('')}
            className={`pill ${!filterTag ? 'active' : ''}`}
          >
            全部标签
          </button>
          {customTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={`pill ${filterTag === tag ? 'active' : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
