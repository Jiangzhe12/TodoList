import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Todo, TodoPriority } from '../types'
import { useTodoStore } from '../store'

interface ContextMenuProps {
  position: { x: number; y: number }
  todo: Todo
  onClose: () => void
  onEdit: (todo: Todo) => void
}

const priorityOptions: { value: TodoPriority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#ef4444' },
  { value: 'medium', label: '中', color: '#eab308' },
  { value: 'low', label: '低', color: 'var(--text-muted)' }
]

export default function ContextMenu({ position, todo, onClose, onEdit }: ContextMenuProps): JSX.Element {
  const { toggleStatus, updateTodo, archiveTodo, deleteTodo } = useTodoStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showPrioritySub, setShowPrioritySub] = useState(false)
  const [adjustedPos, setAdjustedPos] = useState(position)

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let { x, y } = position
    if (x + rect.width > vw - 8) x = vw - rect.width - 8
    if (y + rect.height > vh - 8) y = vh - rect.height - 8
    if (x < 8) x = 8
    if (y < 8) y = 8
    setAdjustedPos({ x, y })
  }, [position])

  // Close on outside click / Escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const statusLabel =
    todo.status === 'pending'
      ? '标记为进行中'
      : todo.status === 'in_progress'
        ? '标记为完成'
        : '重置为待办'

  const statusIcon =
    todo.status === 'pending' ? '◐' : todo.status === 'in_progress' ? '●' : '○'

  const handleAction = (action: () => void): void => {
    action()
    onClose()
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] animate-fade-in"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
        minWidth: 160,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        padding: '4px 0',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Status */}
      <MenuItem
        icon={statusIcon}
        label={statusLabel}
        onClick={() => handleAction(() => toggleStatus(todo.id))}
      />

      {/* Edit */}
      <MenuItem
        icon={<EditIcon />}
        label="编辑"
        shortcut="E"
        onClick={() => handleAction(() => onEdit(todo))}
      />

      <Divider />

      {/* Priority submenu */}
      <div
        className="relative"
        onMouseEnter={() => setShowPrioritySub(true)}
        onMouseLeave={() => setShowPrioritySub(false)}
      >
        <MenuItem
          icon={<PriorityIcon />}
          label="优先级"
          hasSubmenu
          onClick={() => setShowPrioritySub((p) => !p)}
        />
        {showPrioritySub && (
          <div
            className="absolute z-[10000] animate-fade-in"
            style={{
              left: '100%',
              top: 0,
              marginLeft: 2,
              minWidth: 100,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              padding: '4px 0',
              backdropFilter: 'blur(12px)'
            }}
          >
            {priorityOptions.map((p) => (
              <MenuItem
                key={p.value}
                icon={<span style={{ color: p.color, fontSize: 8 }}>●</span>}
                label={p.label}
                active={todo.priority === p.value}
                onClick={() => handleAction(() => updateTodo(todo.id, { priority: p.value }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Archive (only for done tasks) */}
      {todo.status === 'done' && !todo.archived && (
        <MenuItem
          icon={<ArchiveIcon />}
          label="归档"
          onClick={() => handleAction(() => archiveTodo(todo.id))}
        />
      )}

      <Divider />

      {/* Delete */}
      <MenuItem
        icon={<DeleteIcon />}
        label="删除"
        danger
        shortcut="⌫"
        onClick={() => handleAction(() => deleteTodo(todo.id))}
      />
    </div>,
    document.body
  )
}

// --- Subcomponents ---

function MenuItem({
  icon,
  label,
  shortcut,
  danger,
  active,
  hasSubmenu,
  onClick
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  danger?: boolean
  active?: boolean
  hasSubmenu?: boolean
  onClick?: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors"
      style={{
        color: danger ? '#ef4444' : active ? 'var(--accent)' : 'var(--text-primary)',
        background: 'transparent'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.06)' : 'var(--accent-softer)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span className="w-4 text-center flex items-center justify-center" style={{ fontSize: 12 }}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {active && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✓</span>}
      {shortcut && (
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {shortcut}
        </span>
      )}
      {hasSubmenu && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </button>
  )
}

function Divider(): JSX.Element {
  return <div className="my-1 mx-2" style={{ height: 1, background: 'var(--border-subtle)' }} />
}

// --- Icons ---

function EditIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function PriorityIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function ArchiveIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  )
}

function DeleteIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
