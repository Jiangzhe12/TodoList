import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useTodoStore } from '../store'
import { getToday } from '../utils/dates'

export default function StatsPanel(): JSX.Element {
  const todos = useTodoStore((s) => s.todos)
  const today = getToday()

  const stats = useMemo(() => {
    const activeTodos = todos.filter((t) => !t.archived)
    const total = activeTodos.length
    const done = activeTodos.filter((t) => t.status === 'done').length
    const pending = activeTodos.filter((t) => t.status === 'pending').length
    const inProgress = activeTodos.filter((t) => t.status === 'in_progress').length
    const archived = todos.filter((t) => t.archived).length

    const todayTodos = activeTodos.filter((t) => t.date === today)
    const todayDone = todayTodos.filter((t) => t.status === 'done').length
    const todayTotal = todayTodos.length

    const features = activeTodos.filter((t) => t.category === 'feature').length
    const bugs = activeTodos.filter((t) => t.category === 'bug').length
    const optimizations = activeTodos.filter((t) => t.category === 'optimization').length

    const rate = total > 0 ? Math.round((done / total) * 100) : 0

    const completedWithTime = todos.filter((t) => t.completedAt && t.createdAt)
    let avgHours = 0
    if (completedWithTime.length > 0) {
      const totalMs = completedWithTime.reduce((sum, t) => {
        return sum + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime())
      }, 0)
      avgHours = Math.round(totalMs / completedWithTime.length / 3600000 * 10) / 10
    }

    const overdue = activeTodos.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done').length

    const weekData: { label: string; count: number; isToday: boolean }[] = []
    const todayDate = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = subDays(todayDate, i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const dayLabel = format(d, 'MM/dd')
      const count = todos.filter((t) => t.completedAt && t.completedAt.startsWith(dateStr)).length
      weekData.push({ label: dayLabel, count, isToday: i === 0 })
    }
    const weekMax = Math.max(...weekData.map((d) => d.count), 1)

    return { total, done, pending, inProgress, archived, todayDone, todayTotal, features, bugs, optimizations, rate, avgHours, overdue, weekData, weekMax }
  }, [todos, today])

  return (
    <div className="px-3 py-3 space-y-3 surface-glass" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>数据统计</div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
          <span>总完成率</span>
          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{stats.rate}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.rate}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Today stats */}
      <div className="flex gap-2">
        {[
          { value: `${stats.todayDone}/${stats.todayTotal}`, label: '今日完成' },
          { value: stats.pending, label: '待办' },
          { value: stats.inProgress, label: '进行中' }
        ].map((item) => (
          <div
            key={item.label}
            className="flex-1 px-2 py-1.5 rounded-lg text-center"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 7-day chart */}
      <div>
        <div className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>近 7 天完成</div>
        <div className="flex items-end gap-1 h-10">
          {stats.weekData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-sm transition-all duration-300 min-h-[2px]"
                style={{
                  height: `${(d.count / stats.weekMax) * 100}%`,
                  background: d.isToday ? 'var(--accent)' : 'var(--accent)',
                  opacity: d.isToday ? 1 : 0.35
                }}
              />
              <span className="text-[8px]" style={{ color: d.isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex gap-3 text-[10px] flex-wrap">
        {[
          { color: '#3b82f6', label: 'Feature', count: stats.features },
          { color: '#ef4444', label: 'Bug', count: stats.bugs },
          { color: '#0d9488', label: '优化', count: stats.optimizations },
          ...(stats.archived > 0 ? [{ color: 'var(--text-muted)', label: '归档', count: stats.archived }] : [])
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{item.label} {item.count}</span>
          </div>
        ))}
      </div>

      {/* Extra stats */}
      <div className="flex gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {stats.avgHours > 0 && (
          <span>平均耗时: {stats.avgHours < 24 ? `${stats.avgHours}h` : `${Math.round(stats.avgHours / 24 * 10) / 10}d`}</span>
        )}
        {stats.overdue > 0 && (
          <span style={{ color: '#ef4444' }}>逾期: {stats.overdue}</span>
        )}
      </div>
    </div>
  )
}
