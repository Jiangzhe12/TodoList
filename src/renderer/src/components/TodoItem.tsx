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
import { markdownUrlTransform } from '../utils/markdownUrl'
import CategoryBadge from './CategoryBadge'
import ContextMenu from './ContextMenu'

const statusStyles: Record<string, { icon: string; color: string; activeColor: string }> = {
  pending: { icon: '○', color: 'var(--text-muted)', activeColor: 'var(--text-secondary)' },
  in_progress: { icon: '◐', color: '#3b82f6', activeColor: '#60a5fa' },
  done: { icon: '●', color: '#22c55e', activeColor: '#4ade80' }
}

const priorityDot: Record<TodoPriority, { color: string }> = {
  high: { color: '#ef4444' },
  medium: { color: '#eab308' },
  low: { color: 'var(--text-muted)' }
}

function getDueDateLabel(dueDate: string): { text: string; color: string; bg: string } | null {
  const today = getToday()
  const diff = differenceInDays(parseISO(dueDate), parseISO(today))
  if (diff < 0) return { text: `逾期 ${-diff} 天`, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' }
  if (diff === 0) return { text: '今天到期', color: '#f97316', bg: 'rgba(249,115,22,0.08)' }
  if (diff <= 3) return { text: `${diff} 天后到期`, color: '#eab308', bg: 'rgba(234,179,8,0.08)' }
  return { text: `${dueDate.slice(5)}`, color: 'var(--text-muted)', bg: 'var(--bg-elevated)' }
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const { toggleStatus, deleteTodo, convertBugToOptimization, addSubtask, toggleSubtask, removeSubtask, archiveTodo } = useTodoStore()
  const searchQuery = useTodoStore((s) => s.searchQuery)
  const status = statusStyles[todo.status]
  const subtasks = todo.subtasks || []
  const subtaskDone = subtasks.filter((s) => s.done).length
  const itemRef = useRef<HTMLDivElement>(null)

  const isNew = Date.now() - new Date(todo.createdAt).getTime() < 2000

  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isFocused])

  const toggleExpanded = (): void => setExpanded((p) => !p)
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
      style={{
        ...style,
        borderBottom: '1px solid var(--border-subtle)',
        ...(isFocused ? { background: 'var(--accent-softer)', boxShadow: `inset 2px 0 0 var(--accent)` } : {}),
        ...(todo.status === 'done' ? { opacity: isDragging ? 0.3 : 0.5 } : {})
      }}
      className={`group px-3 py-2 transition-colors ${isNew ? 'animate-fade-in-up' : ''}`}
      onMouseEnter={(e) => { if (!isFocused) e.currentTarget.style.background = 'var(--accent-softer)' }}
      onMouseLeave={(e) => { if (!isFocused) e.currentTarget.style.background = '' }}
      onContextMenu={(e) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
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

        {/* Status toggle */}
        <button
          onClick={() => toggleStatus(todo.id)}
          className={`mt-0.5 text-lg leading-none transition-all ${todo.status === 'done' ? 'animate-check-pop' : ''}`}
          style={{ color: status.color }}
          onMouseEnter={(e) => (e.currentTarget.style.color = status.activeColor)}
          onMouseLeave={(e) => (e.currentTarget.style.color = status.color)}
          title={
            todo.status === 'pending'
              ? '标记为进行中'
              : todo.status === 'in_progress'
                ? '标记为完成'
                : '重置为待办'
          }
        >
          {status.icon}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {todo.priority !== 'medium' && (
              <span
                className="text-[8px] leading-none"
                style={{ color: priorityDot[todo.priority].color }}
                title={`优先级: ${todo.priority === 'high' ? '高' : '低'}`}
              >
                ●
              </span>
            )}
            <span
              className={`text-sm truncate ${todo.status === 'done' ? 'line-through' : ''}`}
              style={{ color: todo.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}
            >
              {highlightText(todo.title, searchQuery)}
            </span>
            <CategoryBadge category={todo.category} />
            {subtasks.length > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                ({subtaskDone}/{subtasks.length})
              </span>
            )}
            {todo.dueDate && todo.status !== 'done' && (() => {
              const label = getDueDateLabel(todo.dueDate)
              return label ? (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ color: label.color, background: label.bg }}
                >
                  {label.text}
                </span>
              ) : null
            })()}
          </div>

          {/* Tags */}
          {todo.tags && todo.tags.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {todo.tags.map((tag) => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}

          {/* Attachment thumbnails (max 3, +N if more) */}
          {todo.attachments && todo.attachments.length > 0 && (
            <div className="flex gap-1 mt-1">
              {todo.attachments.slice(0, 3).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightbox(f)
                  }}
                  className="block rounded overflow-hidden cursor-zoom-in"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid var(--border-subtle)'
                  }}
                  title="点击放大"
                >
                  <img src={`app-image://${f}`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {todo.attachments.length > 3 && (
                <span
                  className="flex items-center justify-center text-[10px] rounded"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)'
                  }}
                >
                  +{todo.attachments.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Preview note */}
          {todo.note && !expanded && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {highlightText(todo.note, searchQuery)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasExpandContent && (
            <button onClick={() => setExpanded(!expanded)} className="btn-icon" style={{ padding: '4px' }} title="展开详情">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                {expanded ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
              </svg>
            </button>
          )}
          <button onClick={() => onEdit(todo)} className="btn-icon" style={{ padding: '4px' }} title="编辑">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {todo.status === 'done' && !todo.archived && (
            <button onClick={() => archiveTodo(todo.id)} className="btn-icon" style={{ padding: '4px' }} title="归档">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="3" width="20" height="5" rx="1" />
                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
              </svg>
            </button>
          )}
          <button onClick={() => deleteTodo(todo.id)} className="btn-icon danger" style={{ padding: '4px' }} title="删除">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 ml-8 space-y-1.5 animate-fade-in">
          {todo.note && (
            <div className="text-xs">
              <span className="text-[10px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>备注:</span>
              <div className="prose-mini">
                <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>
                  {todo.note}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Completion time */}
          {todo.status === 'done' && todo.completedAt && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
                    className="text-xs transition-colors"
                    style={{ color: s.done ? '#22c55e' : 'var(--text-muted)' }}
                  >
                    {s.done ? '☑' : '☐'}
                  </button>
                  <span
                    className={`text-xs flex-1 ${s.done ? 'line-through' : ''}`}
                    style={{ color: s.done ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                  >
                    {s.title}
                  </span>
                  <button
                    onClick={() => removeSubtask(todo.id, s.id)}
                    className="text-[10px] opacity-0 group-hover/sub:opacity-100 transition-opacity btn-icon danger"
                    style={{ padding: '1px' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
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
                    className="input-field sm"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                  />
                </form>
              )}
            </div>
          )}

          {/* Bug fields */}
          {isBugTodo(todo) && (
            <>
              {todo.bugCause && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#ef4444', opacity: 0.7 }}>原因:</span> {todo.bugCause}
                </p>
              )}
              {todo.fixPlan && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#3b82f6', opacity: 0.7 }}>方案:</span> {todo.fixPlan}
                </p>
              )}
              {todo.status !== 'done' && !todo.convertedToOptimizationId && (
                <button
                  onClick={() => convertBugToOptimization(todo.id)}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--accent)', opacity: 0.7 }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                >
                  → 转为优化项
                </button>
              )}
              {todo.convertedToOptimizationId && (
                <p className="text-xs" style={{ color: 'var(--accent)', opacity: 0.5 }}>已转为优化项</p>
              )}
            </>
          )}

          {/* Changelog */}
          {todo.changelog && todo.changelog.length > 0 && (
            <div className="pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setShowChangelog(!showChangelog)}
                className="text-[10px] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                📋 变更记录 ({todo.changelog.length}) {showChangelog ? '▲' : '▼'}
              </button>
              {showChangelog && (
                <div className="mt-1 space-y-0.5">
                  {[...todo.changelog].reverse().slice(0, 20).map((entry, i) => (
                    <div key={i} className="text-[10px] flex gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <span className="shrink-0">
                        {formatDistanceToNow(parseISO(entry.timestamp), { locale: zhCN, addSuffix: true })}
                      </span>
                      <span>
                        <span style={{ color: 'var(--text-secondary)' }}>{entry.field}:</span>{' '}
                        {entry.oldValue && <span className="line-through">{entry.oldValue}</span>}
                        {entry.oldValue && entry.newValue && ' → '}
                        {entry.newValue && <span style={{ color: 'var(--text-primary)' }}>{entry.newValue}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          todo={todo}
          onClose={() => setContextMenu(null)}
          onEdit={onEdit}
        />
      )}

      {lightbox && (
        <div
          className="modal-overlay animate-fade-in"
          style={{ zIndex: 60, cursor: 'zoom-out' }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={`app-image://${lightbox}`}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
