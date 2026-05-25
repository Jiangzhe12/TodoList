import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Todo, TodoPriority } from './types'
import { useTodoStore } from './store'
import { getToday } from './utils/dates'
import { useImagePaste } from './utils/useImagePaste'
import TitleBar from './components/TitleBar'
import FilterBar from './components/FilterBar'
import TodoList from './components/TodoList'
import TodoForm from './components/TodoForm'
import UndoToast from './components/UndoToast'
import ArchiveView from './components/ArchiveView'
import CalendarView from './components/CalendarView'
import WeeklyReport from './components/WeeklyReport'
import MemoView from './components/MemoView'

export default function App(): JSX.Element {
  const { loadFromDisk, runCarryOver, undoDelete, theme, addTodo, toggleStatus, deleteTodo, setFocusedTodo } = useTodoStore()
  const todos = useTodoStore((s) => s.todos)
  const filterCategory = useTodoStore((s) => s.filterCategory)
  const filterStatus = useTodoStore((s) => s.filterStatus)
  const searchQuery = useTodoStore((s) => s.searchQuery)
  const sortByPriority = useTodoStore((s) => s.sortByPriority)
  const filterTag = useTodoStore((s) => s.filterTag)
  const focusedTodoId = useTodoStore((s) => s.focusedTodoId)

  const [showForm, setShowForm] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [initialTitle, setInitialTitle] = useState('')
  const [initialAttachments, setInitialAttachments] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showMemo, setShowMemo] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState<import('./types').WeeklyReportData | null>(null)
  const [reportWeekOffset, setReportWeekOffset] = useState(0)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickAttachments, setQuickAttachments] = useState<string[]>([])

  const { onPaste: onQuickPaste, error: quickPasteError } = useImagePaste({
    onImage: ({ filename }) => {
      setQuickAttachments((prev) => [...prev, filename])
    }
  })

  const removeQuickAttachment = (f: string): void => {
    setQuickAttachments((prev) => prev.filter((x) => x !== f))
    void window.api.deleteImage(f)
  }
  const lastDateRef = useRef(getToday())
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const quickInputRef = useRef<HTMLInputElement | null>(null)

  // Compute flattened visible todo IDs for keyboard navigation
  const priorityWeight: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 }
  const flattenedIds = useMemo(() => {
    let result = todos.filter((t) => !t.archived)
    if (filterCategory !== 'all') result = result.filter((t) => t.category === filterCategory)
    if (filterStatus !== 'all') result = result.filter((t) => t.status === filterStatus)
    if (filterTag) result = result.filter((t) => t.tags?.includes(filterTag))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q))
    }
    const groups: Record<string, Todo[]> = {}
    for (const todo of result) {
      if (!groups[todo.date]) groups[todo.date] = []
      groups[todo.date].push(todo)
    }
    for (const date in groups) {
      if (sortByPriority) {
        groups[date].sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || a.order - b.order)
      } else {
        groups[date].sort((a, b) => a.order - b.order)
      }
    }
    const sorted = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
    return sorted.flatMap(([, dateTodos]) => dateTodos.map((t) => t.id))
  }, [todos, filterCategory, filterStatus, searchQuery, sortByPriority, filterTag])

  // Load data on mount
  useEffect(() => {
    loadFromDisk()
  }, [loadFromDisk])

  // Listen for global shortcut quick-add
  useEffect(() => {
    const cleanup = window.api.onQuickAdd(() => {
      setEditingTodo(null)
      setShowForm(true)
    })
    return cleanup
  }, [])

  // Listen for weekly report from main process
  useEffect(() => {
    const cleanup = window.api.onWeeklyReport((_event, report) => {
      setWeeklyReport(report)
    })
    return cleanup
  }, [])

  // Apply theme on mount and changes
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  // Midnight carry-over check
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getToday()
      if (today !== lastDateRef.current) {
        lastDateRef.current = today
        runCarryOver()
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [runCarryOver])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+N: Focus quick input
      if (meta && e.key === 'n') {
        e.preventDefault()
        quickInputRef.current?.focus()
      }

      // Cmd+F: Toggle filter/search
      if (meta && e.key === 'f') {
        e.preventDefault()
        setShowFilter((prev) => {
          const next = !prev
          if (next) {
            setTimeout(() => searchInputRef.current?.focus(), 50)
          }
          return next
        })
      }

      // Cmd+Z: Undo delete
      if (meta && e.key === 'z') {
        e.preventDefault()
        undoDelete()
      }

      // Escape: Close form / close archive / leave memo / clear focus
      if (e.key === 'Escape') {
        if (showForm) {
          setShowForm(false)
          setEditingTodo(null)
        } else if (showArchive) {
          setShowArchive(false)
        } else if (showMemo) {
          setShowMemo(false)
        } else if (focusedTodoId) {
          setFocusedTodo(null)
        }
      }

      // Keyboard list navigation (only when no modal open and no input focused)
      const isInputFocused = document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      const noModal = !showForm && !showArchive && !showMemo
      if (noModal && !isInputFocused && !meta) {
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          if (flattenedIds.length === 0) return
          if (!focusedTodoId) {
            setFocusedTodo(flattenedIds[0])
          } else {
            const idx = flattenedIds.indexOf(focusedTodoId)
            if (idx < flattenedIds.length - 1) setFocusedTodo(flattenedIds[idx + 1])
          }
        }
        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          if (flattenedIds.length === 0) return
          if (!focusedTodoId) {
            setFocusedTodo(flattenedIds[flattenedIds.length - 1])
          } else {
            const idx = flattenedIds.indexOf(focusedTodoId)
            if (idx > 0) setFocusedTodo(flattenedIds[idx - 1])
          }
        }
        if (e.key === 'Enter' && focusedTodoId) {
          e.preventDefault()
          const el = document.querySelector(`[data-todo-id="${focusedTodoId}"]`) as HTMLElement & { __toggleExpanded?: () => void } | null
          el?.__toggleExpanded?.()
        }
        if (e.key === 'e' && focusedTodoId) {
          e.preventDefault()
          const todo = todos.find((t) => t.id === focusedTodoId)
          if (todo) handleEdit(todo)
        }
        if (e.key === 'd' && focusedTodoId) {
          e.preventDefault()
          toggleStatus(focusedTodoId)
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && focusedTodoId) {
          e.preventDefault()
          const idx = flattenedIds.indexOf(focusedTodoId)
          deleteTodo(focusedTodoId)
          const nextId = flattenedIds[idx + 1] || flattenedIds[idx - 1] || null
          setFocusedTodo(nextId)
        }
      }
    },
    [showForm, showArchive, showMemo, undoDelete, focusedTodoId, flattenedIds, todos, toggleStatus, deleteTodo, setFocusedTodo]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleEdit = (todo: Todo): void => {
    setEditingTodo(todo)
    setShowForm(true)
  }

  const handleCloseForm = (): void => {
    setShowForm(false)
    setEditingTodo(null)
    setInitialTitle('')
    setInitialAttachments([])
  }

  return (
    <div className="flex flex-col h-full">
      <TitleBar
        showFilter={showFilter}
        onToggleFilter={() => {
          setShowFilter((p) => {
            const next = !p
            if (next) setTimeout(() => searchInputRef.current?.focus(), 50)
            return next
          })
        }}
        onShowArchive={() => setShowArchive(true)}
        showCalendar={showCalendar}
        onToggleCalendar={() => setShowCalendar((p) => !p)}
        onGenerateReport={() => window.api.requestWeeklyReport()}
        showMemo={showMemo}
        onToggleMemo={() => setShowMemo((p) => !p)}
      />

      {showFilter && !showCalendar && !showMemo && <FilterBar searchFocusRef={searchInputRef} />}

      {showMemo ? (
        <MemoView />
      ) : showCalendar ? (
        <CalendarView onEdit={handleEdit} />
      ) : (
        <TodoList onEdit={handleEdit} />
      )}

      {/* Quick capture */}
      <div
        className="px-3 py-2 flex flex-col gap-1.5"
        style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        {/* Staged attachments + paste-error row */}
        {(quickAttachments.length > 0 || quickPasteError) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {quickAttachments.map((f) => (
              <div
                key={f}
                className="relative group/qa rounded overflow-hidden"
                style={{ width: '28px', height: '28px', border: '1px solid var(--border-default)' }}
              >
                <img src={`app-image://${f}`} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeQuickAttachment(f)}
                  className="absolute inset-0 flex items-center justify-center text-[10px] opacity-0 group-hover/qa:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                  title="移除"
                >
                  ✕
                </button>
              </div>
            ))}
            {quickPasteError && (
              <span className="text-[11px]" style={{ color: '#ef4444' }}>
                {quickPasteError}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 items-center">
        <input
          ref={quickInputRef}
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onPaste={onQuickPaste}
          onKeyDown={(e) => {
            const hasContent = quickTitle.trim() || quickAttachments.length > 0
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && hasContent) {
              if (e.shiftKey) {
                // Shift+Enter: open full form with title/attachments pre-filled
                e.preventDefault()
                setEditingTodo(null)
                setInitialTitle(quickTitle.trim())
                setInitialAttachments(quickAttachments)
                setShowForm(true)
                setQuickTitle('')
                setQuickAttachments([])
              } else {
                // Enter: quick add. If no title but has images, use a default.
                e.preventDefault()
                const title = quickTitle.trim() || '截图'
                addTodo({
                  title,
                  category: 'feature',
                  priority: 'medium',
                  attachments: quickAttachments.length ? quickAttachments : undefined
                })
                setQuickTitle('')
                setQuickAttachments([])
              }
            }
          }}
          className="input-field flex-1"
          style={{ margin: 0, fontSize: '13px' }}
          placeholder={
            quickAttachments.length > 0
              ? `${quickAttachments.length} 张图待发 · Enter 直接创建`
              : '快速添加任务… Enter 创建 / Shift+Enter 详细 / 粘贴图片附加'
          }
        />
        <button
          onClick={() => {
            setEditingTodo(null)
            setInitialTitle('')
            setShowForm(true)
          }}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-95"
          style={{
            background: 'var(--accent-softer)',
            color: 'var(--accent)',
            border: '1px solid var(--accent-soft)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-soft)'
            e.currentTarget.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-softer)'
            e.currentTarget.style.borderColor = 'var(--accent-soft)'
          }}
          title="新建任务 (⌘N)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        </div>
      </div>

      {showForm && (
        <TodoForm
          editingTodo={editingTodo}
          initialTitle={initialTitle}
          initialAttachments={initialAttachments}
          onClose={handleCloseForm}
        />
      )}
      {showArchive && <ArchiveView onClose={() => setShowArchive(false)} />}
      {weeklyReport && (
        <WeeklyReport
          report={weeklyReport}
          weekOffset={reportWeekOffset}
          onClose={() => { setWeeklyReport(null); setReportWeekOffset(0) }}
          onRegenerate={() => window.api.requestWeeklyReport(reportWeekOffset)}
          onChangeWeek={(offset) => {
            setReportWeekOffset(offset)
            window.api.requestWeeklyReport(offset)
          }}
        />
      )}
      <UndoToast />
    </div>
  )
}
