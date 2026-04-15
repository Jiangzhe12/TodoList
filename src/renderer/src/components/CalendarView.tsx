import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isToday,
  isSameMonth
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Todo } from '../types'
import { useTodoStore } from '../store'
import CategoryBadge from './CategoryBadge'

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

export default function CalendarView({ onEdit }: { onEdit: (todo: Todo) => void }): JSX.Element {
  const todos = useTodoStore((s) => s.todos)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Build a map: dateStr → todos
  const todosByDate = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    for (const todo of todos) {
      if (todo.archived) continue
      if (!map[todo.date]) map[todo.date] = []
      map[todo.date].push(todo)
    }
    return map
  }, [todos])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Pad start with empty cells
    const startPad = getDay(monthStart) // 0=Sun
    const grid: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) grid.push(null)
    grid.push(...days)

    // Pad end to fill last row
    while (grid.length % 7 !== 0) grid.push(null)
    return grid
  }, [currentMonth])

  // Selected date todos
  const selectedTodos = useMemo(() => {
    if (!selectedDate) return []
    return (todosByDate[selectedDate] || []).sort((a, b) => a.order - b.order)
  }, [selectedDate, todosByDate])

  const statusIcons: Record<string, string> = {
    pending: '○',
    in_progress: '◐',
    done: '●'
  }

  return (
    <div className="overflow-y-auto flex-1">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
        >
          ←
        </button>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 px-2 pt-2">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0 px-2 pb-2">
        {calendarDays.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="h-10" />
          }
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayTodos = todosByDate[dateStr] || []
          const isSelected = selectedDate === dateStr
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)

          const featureCount = dayTodos.filter((t) => t.category === 'feature').length
          const bugCount = dayTodos.filter((t) => t.category === 'bug').length
          const optCount = dayTodos.filter((t) => t.category === 'optimization').length

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`h-10 rounded-lg flex flex-col items-center justify-center relative transition-colors
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${today ? 'bg-blue-500/10 font-bold' : ''}
                ${isSelected ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}
              `}
            >
              <span className={`text-xs ${today ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                {format(day, 'd')}
              </span>
              {dayTodos.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {featureCount > 0 && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                  {bugCount > 0 && <span className="w-1 h-1 rounded-full bg-red-500" />}
                  {optCount > 0 && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date tasks */}
      {selectedDate && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-3 py-2 animate-fade-in-up">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            {format(new Date(selectedDate + 'T00:00:00'), 'M月d日 EEEE', { locale: zhCN })}
            <span className="ml-1 text-zinc-400 dark:text-zinc-500 font-normal">({selectedTodos.length} 项)</span>
          </div>
          {selectedTodos.length === 0 ? (
            <div className="text-xs text-zinc-400 dark:text-zinc-500 py-2 text-center">当日无任务</div>
          ) : (
            <div className="space-y-1">
              {selectedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer group"
                  onClick={() => onEdit(todo)}
                >
                  <span className={`text-xs ${
                    todo.status === 'done'
                      ? 'text-green-400'
                      : todo.status === 'in_progress'
                        ? 'text-blue-400'
                        : 'text-zinc-400 dark:text-zinc-500'
                  }`}>
                    {statusIcons[todo.status]}
                  </span>
                  <span className={`text-xs flex-1 truncate ${
                    todo.status === 'done'
                      ? 'line-through text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {todo.title}
                  </span>
                  <CategoryBadge category={todo.category} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
