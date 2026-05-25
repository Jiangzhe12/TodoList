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

  const todosByDate = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    for (const todo of todos) {
      if (!map[todo.date]) map[todo.date] = []
      map[todo.date].push(todo)
    }
    return map
  }, [todos])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startPad = getDay(monthStart)
    const grid: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) grid.push(null)
    grid.push(...days)
    while (grid.length % 7 !== 0) grid.push(null)
    return grid
  }, [currentMonth])

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
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="btn-icon"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="btn-icon"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 px-2 pt-2">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[10px] py-1 font-medium" style={{ color: 'var(--text-muted)' }}>
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
              className="h-10 rounded-lg flex flex-col items-center justify-center relative transition-all"
              style={{
                opacity: !isCurrentMonth ? 0.3 : 1,
                background: isSelected
                  ? 'var(--accent-soft)'
                  : today
                    ? 'var(--accent-softer)'
                    : 'transparent',
                boxShadow: isSelected ? `inset 0 0 0 1px var(--accent)` : 'none',
                fontWeight: today ? 700 : 400
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !today) e.currentTarget.style.background = 'var(--accent-softer)'
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !today) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                className="text-xs"
                style={{ color: today || isSelected ? 'var(--accent)' : 'var(--text-secondary)' }}
              >
                {format(day, 'd')}
              </span>
              {dayTodos.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {featureCount > 0 && <span className="w-1 h-1 rounded-full" style={{ background: '#3b82f6' }} />}
                  {bugCount > 0 && <span className="w-1 h-1 rounded-full" style={{ background: '#ef4444' }} />}
                  {optCount > 0 && <span className="w-1 h-1 rounded-full" style={{ background: '#0d9488' }} />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date tasks */}
      {selectedDate && (
        <div
          className="px-3 py-2 animate-fade-in-up"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(selectedDate + 'T00:00:00'), 'M月d日 EEEE', { locale: zhCN })}
            <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>({selectedTodos.length} 项)</span>
          </div>
          {selectedTodos.length === 0 ? (
            <div className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>当日无任务</div>
          ) : (
            <div className="space-y-1">
              {selectedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors"
                  onClick={() => onEdit(todo)}
                  style={{ background: 'transparent', opacity: todo.archived ? 0.5 : 1 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-softer)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="text-xs" style={{
                    color: todo.status === 'done' ? '#22c55e' : todo.status === 'in_progress' ? '#3b82f6' : 'var(--text-muted)'
                  }}>
                    {statusIcons[todo.status]}
                  </span>
                  <span
                    className={`text-xs flex-1 truncate ${todo.status === 'done' ? 'line-through' : ''}`}
                    style={{ color: todo.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)' }}
                  >
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
