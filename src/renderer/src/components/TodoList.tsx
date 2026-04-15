import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { Todo, TodoPriority } from '../types'
import { useTodoStore } from '../store'
import TodoDateGroup from './TodoDateGroup'

interface TodoListProps {
  onEdit: (todo: Todo) => void
}

export default function TodoList({ onEdit }: TodoListProps): JSX.Element {
  const todos = useTodoStore((s) => s.todos)
  const loaded = useTodoStore((s) => s.loaded)
  const filterCategory = useTodoStore((s) => s.filterCategory)
  const filterStatus = useTodoStore((s) => s.filterStatus)
  const searchQuery = useTodoStore((s) => s.searchQuery)
  const sortByPriority = useTodoStore((s) => s.sortByPriority)
  const filterTag = useTodoStore((s) => s.filterTag)
  const reorderTodos = useTodoStore((s) => s.reorderTodos)
  const focusedTodoId = useTodoStore((s) => s.focusedTodoId)

  const priorityWeight: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Apply filters and search (exclude archived by default)
  const filteredTodos = useMemo(() => {
    let result = todos.filter((t) => !t.archived)

    if (filterCategory !== 'all') {
      result = result.filter((t) => t.category === filterCategory)
    }
    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus)
    }
    if (filterTag) {
      result = result.filter((t) => t.tags?.includes(filterTag))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.note?.toLowerCase().includes(q)
      )
    }

    return result
  }, [todos, filterCategory, filterStatus, filterTag, searchQuery])

  // Group by date, sort within group by order (or priority)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Todo[]> = {}
    for (const todo of filteredTodos) {
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
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredTodos, sortByPriority])

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Find which date group the dragged item belongs to
    for (const [date, dateTodos] of groupedByDate) {
      const ids = dateTodos.map((t) => t.id)
      const oldIndex = ids.indexOf(active.id as string)
      const newIndex = ids.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newIds = [...ids]
        newIds.splice(oldIndex, 1)
        newIds.splice(newIndex, 0, active.id as string)
        reorderTodos(date, newIds)
        break
      }
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        加载中...
      </div>
    )
  }

  if (filteredTodos.length === 0) {
    const hasFilter = filterCategory !== 'all' || filterStatus !== 'all' || searchQuery.trim()
    return (
      <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
        <span className="text-3xl mb-2">{hasFilter ? '🔍' : '✓'}</span>
        <span className="text-sm">{hasFilter ? '没有匹配的任务' : '暂无任务'}</span>
        <span className="text-xs mt-1">
          {hasFilter ? '尝试调整筛选条件' : '点击下方按钮添加新任务'}
        </span>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-y-auto flex-1">
        {groupedByDate.map(([date, dateTodos]) => (
          <TodoDateGroup key={date} date={date} todos={dateTodos} onEdit={onEdit} focusedTodoId={focusedTodoId} />
        ))}
      </div>
    </DndContext>
  )
}
