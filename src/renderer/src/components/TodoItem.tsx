import { useState, useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { differenceInDays, parseISO, formatDistanceStrict, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Todo, TodoPriority, isBugTodo } from '../types'
import { useTodoStore } from '../store'
import { getToday } from '../utils/dates'
import { highlightText } from '../utils/highlight'
import CategoryBadge from './CategoryBadge'

const statusIcons: Record<string, { icon: string; className: string }> = {
  pending: { icon: '○', className: 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300' },
  in_progress: { icon: '◐', className: 'text-blue-400 hover:text-blue-300' },
  done: { icon: '●', className: 'text-green-400 hover:text-green-300' }
}

const priorityIndicators: Record<TodoPriority, { dot: string; className: string }> = {
  high: { dot: '●', className: 'text-red-400' },
  medium: { dot: '●', className: 'text-yellow-400' },
  low: { dot: '●', className: 'text-zinc-500' }
}

function getDueDateLabel(dueDate: string): { text: string; className: string } | null {
  const today = getToday()
  const diff = differenceInDays(parseISO(dueDate), parseISO(today))
  if (diff < 0) return { text: `逾期 ${-diff} 天`, className: 'text-red-400 bg-red-400/10' }
  if (diff === 0) return { text: '今天到期', className: 'text-orange-400 bg-orange-400/10' }
  if (diff <= 3) return { text: `${diff} 天后到期`, className: 'text-yellow-400 bg-yellow-400/10' }
  return { text: `${dueDate.slice(5)}`, className: 'text-zinc-500 bg-zinc-700/50' }
}

export default function TodoItem({
  todo,
  onEdit,
  isFocused = false
}: {
  todo: Todo
  onEdit: (todo: Todo) => void
  isFocused?: boolean
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [showChangelog, setShowChangelog] = useState(false)
  const { toggleStatus, deleteTodo, convertBugToOptimization, addSubtask, toggleSubtask, removeSubtask, archiveTodo } = useTodoStore()
  const searchQuery = useTodoStore((s) => s.searchQuery)
  const statusInfo = statusIcons[todo.status]
  const subtasks = todo.subtasks || []
  const subtaskDone = subtasks.filter((s) => s.done).length
  const itemRef = useRef<HTMLDivElement>(null)

  // Check if newly created (within 2 seconds)
  const isNew = Date.now() - new Date(todo.createdAt).getTime() < 2000

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isFocused])

  // Expose expanded toggle for keyboard nav
  const toggleExpanded = (): void => setExpanded((p) => !p)
  // Store toggle function on the DOM for parent access
  useEffect(() => {
    if (itemRef.current) {
      (itemRef.current as HTMLElement & { __toggleExpanded?: () => void }).__toggleExpanded = toggleExpanded
    }
  })

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined
  }

  const hasExpandContent = isBugTodo(todo) || todo.note || subtasks.length > 0

  return (
    <div
      ref={(node) => {
        setNodeRef(node)
        ;(itemRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }}
      data-todo-id={todo.id}
      style={style}
      className={`group px-3 py-2 border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 transition-colors ${
        todo.status === 'done' ? 'opacity-50' : ''
      } ${isFocused ? 'ring-2 ring-blue-500/50 bg-zinc-100 dark:bg-zinc-800/40' : ''} ${isNew ? 'animate-fade-in-up' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="拖拽排序"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="4" r="2" />
            <circle cx="16" cy="4" r="2" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="16" cy="12" r="2" />
            <circle cx="8" cy="20" r="2" />
            <circle cx="16" cy="20" r="2" />
          </svg>
        </button>

        <button
          onClick={() => toggleStatus(todo.id)}
          className={`mt-0.5 text-lg leading-none transition-colors ${statusInfo.className} ${todo.status === 'done' ? 'animate-check-pop' : ''}`}
          title={
            todo.status === 'pending'
              ? '标记为进行中'
              : todo.status === 'in_progress'
                ? '标记为完成'
                : '重置为待办'
          }
        >
          {statusInfo.icon}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {todo.priority !== 'medium' && (
              <span
                className={`text-[8px] leading-none ${priorityIndicators[todo.priority].className}`}
                title={`优先级: ${todo.priority === 'high' ? '高' : '低'}`}
              >
                {priorityIndicators[todo.priority].dot}
              </span>
            )}
            <span
              className={`text-sm text-zinc-800 dark:text-zinc-200 truncate ${
                todo.status === 'done' ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
              }`}
            >
              {highlightText(todo.title, searchQuery)}
            </span>
            <CategoryBadge category={todo.category} />
            {subtasks.length > 0 && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                ({subtaskDone}/{subtasks.length})
              </span>
            )}
            {todo.dueDate && todo.status !== 'done' && (() => {
              const label = getDueDateLabel(todo.dueDate)
              return label ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${label.className}`}>
                  {label.text}
                </span>
              ) : null
            })()}
          </div>

          {/* Tags */}
          {todo.tags && todo.tags.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {todo.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] px-1 py-0 bg-purple-900/20 text-purple-400/70 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {todo.note && !expanded && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{highlightText(todo.note, searchQuery)}</p>
          )}
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasExpandContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs"
              title="展开详情"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
          <button
            onClick={() => onEdit(todo)}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs"
            title="编辑"
          >
            ✎
          </button>
          {todo.status === 'done' && !todo.archived && (
            <button
              onClick={() => archiveTodo(todo.id)}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs"
              title="归档"
            >
              ⊡
            </button>
          )}
          <button
            onClick={() => deleteTodo(todo.id)}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 text-xs"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 ml-8 space-y-1.5">
          {todo.note && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">备注:</span>
              <div className="prose-mini">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{todo.note}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Completion time */}
          {todo.status === 'done' && todo.completedAt && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              耗时: {formatDistanceStrict(parseISO(todo.completedAt), parseISO(todo.createdAt), { locale: zhCN })}
            </p>
          )}

          {/* Subtasks */}
          {(subtasks.length > 0 || todo.status !== 'done') && (
            <div className="space-y-1">
              {subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 group/sub">
                  <button
                    onClick={() => toggleSubtask(todo.id, s.id)}
                    className={`text-xs ${s.done ? 'text-green-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                  >
                    {s.done ? '☑' : '☐'}
                  </button>
                  <span className={`text-xs flex-1 ${s.done ? 'line-through text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {s.title}
                  </span>
                  <button
                    onClick={() => removeSubtask(todo.id, s.id)}
                    className="text-[10px] text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover/sub:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {todo.status !== 'done' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newSubtask.trim()) {
                      addSubtask(todo.id, newSubtask.trim())
                      setNewSubtask('')
                    }
                  }}
                  className="flex gap-1"
                >
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="添加子任务..."
                    className="flex-1 text-xs px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                  />
                </form>
              )}
            </div>
          )}

          {isBugTodo(todo) && (
            <>
              {todo.bugCause && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="text-red-400/70">原因:</span> {todo.bugCause}
                </p>
              )}
              {todo.fixPlan && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="text-blue-400/70">方案:</span> {todo.fixPlan}
                </p>
              )}
              {todo.status !== 'done' && !todo.convertedToOptimizationId && (
                <button
                  onClick={() => convertBugToOptimization(todo.id)}
                  className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors"
                >
                  → 转为优化项
                </button>
              )}
              {todo.convertedToOptimizationId && (
                <p className="text-xs text-amber-400/50">已转为优化项</p>
              )}
            </>
          )}

          {/* Changelog */}
          {todo.changelog && todo.changelog.length > 0 && (
            <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800/50">
              <button
                onClick={() => setShowChangelog(!showChangelog)}
                className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                📋 变更记录 ({todo.changelog.length}) {showChangelog ? '▲' : '▼'}
              </button>
              {showChangelog && (
                <div className="mt-1 space-y-0.5">
                  {[...todo.changelog].reverse().slice(0, 20).map((entry, i) => (
                    <div key={i} className="text-[10px] text-zinc-400 dark:text-zinc-600 flex gap-1.5">
                      <span className="text-zinc-400 dark:text-zinc-500 shrink-0">
                        {formatDistanceToNow(parseISO(entry.timestamp), { locale: zhCN, addSuffix: true })}
                      </span>
                      <span>
                        <span className="text-zinc-500 dark:text-zinc-400">{entry.field}:</span>{' '}
                        {entry.oldValue && <span className="line-through">{entry.oldValue}</span>}
                        {entry.oldValue && entry.newValue && ' → '}
                        {entry.newValue && <span className="text-zinc-600 dark:text-zinc-300">{entry.newValue}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
