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

  // Expose input ref for keyboard shortcut focus
  useEffect(() => {
    if (searchFocusRef && 'current' in searchFocusRef) {
      ;(searchFocusRef as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current
    }
  }, [searchFocusRef])

  return (
    <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 space-y-2 bg-white/80 dark:bg-zinc-900/80">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
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
          className="w-full pl-7 pr-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-1">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilterCategory(c.value)}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
              filterCategory === c.value
                ? 'border-blue-500/50 bg-blue-900/30 text-blue-300'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
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
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
              filterStatus === s.value
                ? 'border-green-500/50 bg-green-900/30 text-green-300'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleSortByPriority}
          className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
            sortByPriority
              ? 'border-amber-500/50 bg-amber-900/30 text-amber-300'
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400'
          }`}
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
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
              !filterTag
                ? 'border-purple-500/50 bg-purple-900/30 text-purple-300'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            全部标签
          </button>
          {customTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                filterTag === tag
                  ? 'border-purple-500/50 bg-purple-900/30 text-purple-300'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
