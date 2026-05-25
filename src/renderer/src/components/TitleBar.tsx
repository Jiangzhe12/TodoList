import { useState, useEffect } from 'react'
import { useTodoStore } from '../store'

interface TitleBarProps {
  showFilter: boolean
  onToggleFilter: () => void
  onShowArchive: () => void
  showCalendar: boolean
  onToggleCalendar: () => void
  onGenerateReport: () => void
  showMemo: boolean
  onToggleMemo: () => void
}

export default function TitleBar({
  showFilter,
  onToggleFilter,
  onShowArchive,
  showCalendar,
  onToggleCalendar,
  onGenerateReport,
  showMemo,
  onToggleMemo
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

  const themeLabel = theme === 'dark' ? '暗色' : theme === 'light' ? '亮色' : '跟随系统'

  return (
    <div
      className="flex items-center justify-between h-10 px-3 surface-glass select-none draggable"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="w-[5px] h-[5px] rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Todo
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 no-drag">
        {/* Filter */}
        <button onClick={onToggleFilter} className={`btn-icon ${showFilter ? 'active' : ''}`} title="筛选/搜索 (⌘F)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
          </svg>
        </button>

        {/* Calendar */}
        <button onClick={onToggleCalendar} className={`btn-icon ${showCalendar ? 'active' : ''}`} title="日历视图">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>

        {/* Weekly report */}
        <button onClick={onGenerateReport} className="btn-icon" title="生成周报">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>

        {/* Archive view */}
        <button onClick={onShowArchive} className="btn-icon" title="查看归档">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="5" rx="1" />
            <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
          </svg>
        </button>

        {/* Memo */}
        <button onClick={onToggleMemo} className={`btn-icon ${showMemo ? 'active' : ''}`} title="便签">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="13" y2="17" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-3.5 mx-0.5" style={{ background: 'var(--border-default)' }} />

        {/* Theme toggle */}
        <button onClick={cycleTheme} className="btn-icon" title={`主题: ${themeLabel}`}>
          {theme === 'dark' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : theme === 'light' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          )}
        </button>

        {/* Pin */}
        <button onClick={togglePin} className={`btn-icon ${pinned ? 'active' : ''}`} title={pinned ? '取消置顶' : '置顶'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4v6l-2 4v2h14v-2l-2-4V4" />
            <path d="M12 16v5" />
            <path d="M8 4h8" />
          </svg>
        </button>

        {/* Minimize */}
        <button onClick={() => window.api.minimizeWindow()} className="btn-icon" title="最小化">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
          </svg>
        </button>

        {/* Close */}
        <button onClick={() => window.api.closeWindow()} className="btn-icon danger" title="隐藏到托盘">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
