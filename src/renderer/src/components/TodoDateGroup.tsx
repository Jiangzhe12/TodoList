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
    <div className="mb-1">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 sticky top-0 z-10">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{formatDateHeader(date)}</span>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{pendingCount} 项待办</span>
          )}
          {completedTodos.length > 0 && (
            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
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
