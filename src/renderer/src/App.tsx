import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Todo, TodoPriority } from './types'
import { useTodoStore } from './store'
import { getToday } from './utils/dates'
import TitleBar from './components/TitleBar'
import FilterBar from './components/FilterBar'
import StatsPanel from './components/StatsPanel'
import TodoList from './components/TodoList'
import TodoForm from './components/TodoForm'
import UndoToast from './components/UndoToast'
import ArchiveView from './components/ArchiveView'
import TemplateManager from './components/TemplateManager'
import CalendarView from './components/CalendarView'
import WeeklyReport from './components/WeeklyReport'

export default function App(): JSX.Element {
  const { loadFromDisk, runCarryOver, archiveDone, undoDelete, theme, createFromTemplate, toggleStatus, deleteTodo, setFocusedTodo } = useTodoStore()
  const todos = useTodoStore((s) => s.todos)
  const filterCategory = useTodoStore((s) => s.filterCategory)
  const filterStatus = useTodoStore((s) => s.filterStatus)
  const searchQuery = useTodoStore((s) => s.searchQuery)
  const sortByPriority = useTodoStore((s) => s.sortByPriority)
  const filterTag = useTodoStore((s) => s.filterTag)
  const focusedTodoId = useTodoStore((s) => s.focusedTodoId)

  const [showForm, setShowForm] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState<import('./types').WeeklyReportData | null>(null)
  const lastDateRef = useRef(getToday())
  const searchInputRef = useRef<HTMLInputElement | null>(null)

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
    // Group by date, sort within group
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

  // Listen for global shortcut quick-add (Cmd+Shift+N from any app)
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

      // Cmd+N: New todo
      if (meta && e.key === 'n') {
        e.preventDefault()
        setEditingTodo(null)
        setShowForm(true)
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

      // Cmd+Shift+A: Archive all done
      if (meta && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        archiveDone()
      }

      // Escape: Close form / close archive / close templates / clear focus
      if (e.key === 'Escape') {
        if (showForm) {
          setShowForm(false)
          setEditingTodo(null)
        } else if (showArchive) {
          setShowArchive(false)
        } else if (showTemplates) {
          setShowTemplates(false)
        } else if (focusedTodoId) {
          setFocusedTodo(null)
        }
      }

      // Keyboard list navigation (only when no modal open and no input focused)
      const isInputFocused = document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      const noModal = !showForm && !showArchive && !showTemplates
      if (noModal && !isInputFocused && !meta) {
        // Arrow keys: move focus
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
        // Enter: toggle expand
        if (e.key === 'Enter' && focusedTodoId) {
          e.preventDefault()
          // Find the TodoItem DOM element and toggle its expanded state
          const el = document.querySelector(`[data-todo-id="${focusedTodoId}"]`) as HTMLElement & { __toggleExpanded?: () => void } | null
          el?.__toggleExpanded?.()
        }
        // E: edit focused todo
        if (e.key === 'e' && focusedTodoId) {
          e.preventDefault()
          const todo = todos.find((t) => t.id === focusedTodoId)
          if (todo) handleEdit(todo)
        }
        // D: toggle status
        if (e.key === 'd' && focusedTodoId) {
          e.preventDefault()
          toggleStatus(focusedTodoId)
        }
        // Delete/Backspace: delete
        if ((e.key === 'Delete' || e.key === 'Backspace') && focusedTodoId) {
          e.preventDefault()
          const idx = flattenedIds.indexOf(focusedTodoId)
          deleteTodo(focusedTodoId)
          // Move focus to next or previous
          const nextId = flattenedIds[idx + 1] || flattenedIds[idx - 1] || null
          setFocusedTodo(nextId)
        }
      }
    },
    [showForm, showArchive, showTemplates, undoDelete, archiveDone, focusedTodoId, flattenedIds, todos, toggleStatus, deleteTodo, setFocusedTodo]
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
  }

  return (
    <div className="flex flex-col h-full">
      <TitleBar
        showStats={showStats}
        onToggleStats={() => setShowStats((p) => !p)}
        showFilter={showFilter}
        onToggleFilter={() => {
          setShowFilter((p) => {
            const next = !p
            if (next) setTimeout(() => searchInputRef.current?.focus(), 50)
            return next
          })
        }}
        onShowArchive={() => setShowArchive(true)}
        onArchiveDone={archiveDone}
        onShowTemplates={() => setShowTemplates(true)}
        showCalendar={showCalendar}
        onToggleCalendar={() => setShowCalendar((p) => !p)}
        onGenerateReport={() => window.api.requestWeeklyReport()}
      />

      {showStats && <StatsPanel />}
      {showFilter && !showCalendar && <FilterBar searchFocusRef={searchInputRef} />}

      {showCalendar ? <CalendarView onEdit={handleEdit} /> : <TodoList onEdit={handleEdit} />}

      {/* Add button */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button
          onClick={() => {
            setEditingTodo(null)
            setShowForm(true)
          }}
          className="w-full py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          + 新建任务
          <span className="ml-2 text-[10px] text-zinc-400 dark:text-zinc-500">⌘N</span>
        </button>
      </div>

      {showForm && <TodoForm editingTodo={editingTodo} onClose={handleCloseForm} />}
      {showArchive && <ArchiveView onClose={() => setShowArchive(false)} />}
      {showTemplates && (
        <TemplateManager
          onClose={() => setShowTemplates(false)}
          onCreateFromTemplate={(id) => {
            createFromTemplate(id)
            setShowTemplates(false)
          }}
        />
      )}
      {weeklyReport && (
        <WeeklyReport report={weeklyReport} onClose={() => setWeeklyReport(null)} />
      )}
      <UndoToast />
    </div>
  )
}
