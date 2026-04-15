import { useState, useEffect } from 'react'
import { useTodoStore } from '../store'

interface TitleBarProps {
  showStats: boolean
  onToggleStats: () => void
  showFilter: boolean
  onToggleFilter: () => void
  onShowArchive: () => void
  onArchiveDone: () => void
  onShowTemplates: () => void
  showCalendar: boolean
  onToggleCalendar: () => void
  onGenerateReport: () => void
}

export default function TitleBar({
  showStats,
  onToggleStats,
  showFilter,
  onToggleFilter,
  onShowArchive,
  onArchiveDone,
  onShowTemplates,
  showCalendar,
  onToggleCalendar,
  onGenerateReport
}: TitleBarProps): JSX.Element {
  const [pinned, setPinned] = useState(true)
  const { theme, setTheme } = useTodoStore()

  useEffect(() => {
    window.api.isAlwaysOnTop().then(setPinned)
  }, [])

  const togglePin = (): void => {
    window.api.toggleAlwaysOnTop()
    setPinned((p) => !p)
  }

  const cycleTheme = (): void => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
    setTheme(next)
  }

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'
  const themeLabel = theme === 'dark' ? '暗色' : theme === 'light' ? '亮色' : '跟随系统'

  return (
    <div className="flex items-center justify-between h-10 px-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 select-none draggable">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Todo Desktop</span>
      </div>
      <div className="flex items-center gap-1 no-drag">
        {/* Stats toggle */}
        <button
          onClick={onToggleStats}
          className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${showStats ? 'text-green-500 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}`}
          title="数据统计"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        </button>

        {/* Filter toggle */}
        <button
          onClick={onToggleFilter}
          className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${showFilter ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`}
          title="筛选/搜索 (⌘F)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
          </svg>
        </button>

        {/* Calendar view */}
        <button
          onClick={onToggleCalendar}
          className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${showCalendar ? 'text-purple-500 dark:text-purple-400' : 'text-zinc-400 dark:text-zinc-500'}`}
          title="日历视图"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>

        {/* Weekly report */}
        <button
          onClick={onGenerateReport}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
          title="生成周报"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>

        {/* Archive view */}
        <button
          onClick={onShowArchive}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors"
          title="查看归档"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="5" rx="1" />
            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
          </svg>
        </button>

        {/* Templates */}
        <button
          onClick={onShowTemplates}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors"
          title="任务模板"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 7h10M7 12h10M7 17h6" />
          </svg>
        </button>

        {/* Archive all done */}
        <button
          onClick={onArchiveDone}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-green-500 dark:hover:text-green-400 transition-colors"
          title="归档所有已完成任务"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </button>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 transition-colors text-xs"
          title={`主题: ${themeLabel}`}
        >
          {themeIcon}
        </button>

        {/* Pin toggle */}
        <button
          onClick={togglePin}
          className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${pinned ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-400 dark:text-zinc-500'}`}
          title={pinned ? '取消置顶' : '置顶'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4v6l-2 4v2h14v-2l-2-4V4" />
            <path d="M12 16v5" />
            <path d="M8 4h8" />
          </svg>
        </button>

        {/* Minimize */}
        <button
          onClick={() => window.api.minimizeWindow()}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 transition-colors"
          title="最小化"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
          </svg>
        </button>

        {/* Close/hide */}
        <button
          onClick={() => window.api.closeWindow()}
          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          title="隐藏到托盘"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
