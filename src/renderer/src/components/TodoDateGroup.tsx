import { useState } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Todo } from '../types'
import { formatDateHeader } from '../utils/dates'
import TodoItem from './TodoItem'

interface TodoDateGroupProps {
  date: string
  todos: Todo[]
  onEdit: (todo: Todo) => void
  focusedTodoId?: string | null
}

export default function TodoDateGroup({ date, todos, onEdit, focusedTodoId }: TodoDateGroupProps): JSX.Element {
  const [hideCompleted, setHideCompleted] = useState(false)

  const pendingTodos = todos.filter((t) => t.status !== 'done')
  const completedTodos = todos.filter((t) => t.status === 'done')
  const visibleTodos = hideCompleted ? pendingTodos : todos
  const pendingCount = pendingTodos.length

  return (
    <div className="mb-0.5">
      <div
        className="flex items-center justify-between px-3 py-1.5 sticky top-0 z-10"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)', opacity: 0.6 }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {formatDateHeader(date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pendingCount} 项待办</span>
          )}
          {completedTodos.length > 0 && (
            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className="text-[10px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {hideCompleted ? `显示已完成 (${completedTodos.length})` : '隐藏已完成'}
            </button>
          )}
        </div>
      </div>
      <SortableContext items={visibleTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div>
          {visibleTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onEdit={onEdit} isFocused={focusedTodoId === todo.id} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
