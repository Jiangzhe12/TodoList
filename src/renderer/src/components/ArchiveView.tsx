import { useMemo, useState } from 'react'
import { useTodoStore } from '../store'
import { formatDate } from '../utils/dates'
import CategoryBadge from './CategoryBadge'

interface ArchiveViewProps {
  onClose: () => void
}

function DateGroup({ date, label, todos, defaultExpanded = false }: {
  date: string
  label: string
  todos: ReturnType<typeof useTodoStore.getState>['todos']
  defaultExpanded?: boolean
}): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const unarchiveTodo = useTodoStore((s) => s.unarchiveTodo)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 sticky top-0 z-10 transition-colors"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-softer)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
      >
        <div className="flex items-center gap-2">
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{todos.length} 项</span>
      </button>

      {expanded && (
        <div className="animate-fade-in">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-2 px-3 py-2 transition-colors"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-softer)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{todo.title}</span>
                  <CategoryBadge category={todo.category} />
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => unarchiveTodo(todo.id)}
                  className="pill"
                  style={{ cursor: 'pointer' }}
                >
                  恢复
                </button>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="pill"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444'
                    e.currentTarget.style.color = '#ef4444'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ArchiveView({ onClose }: ArchiveViewProps): JSX.Element {
  const todos = useTodoStore((s) => s.todos)

  // Group archived tasks by date, sorted newest first
  const groupedByDate = useMemo(() => {
    const archived = todos.filter((t) => t.archived)
    const groups: Record<string, typeof archived> = {}
    for (const todo of archived) {
      if (!groups[todo.date]) groups[todo.date] = []
      groups[todo.date].push(todo)
    }
    // Sort within each group by updatedAt desc
    for (const date in groups) {
      groups[date].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
    // Return as sorted entries (newest date first)
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [todos])

  const totalCount = groupedByDate.reduce((sum, [, items]) => sum + items.length, 0)

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-sheet animate-slide-in-bottom">
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            归档列表
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              ({totalCount})
            </span>
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ padding: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Date-grouped list */}
        <div className="overflow-y-auto flex-1">
          {groupedByDate.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'var(--accent-softer)' }}
              >
                <span className="text-lg">📦</span>
              </div>
              <span className="text-sm">暂无归档任务</span>
            </div>
          ) : (
            groupedByDate.map(([date, dateTodos]) => (
              <DateGroup
                key={date}
                date={date}
                label={formatDate(date)}
                todos={dateTodos}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
