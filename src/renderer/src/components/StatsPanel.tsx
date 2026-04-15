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

    // Average completion time
    const completedWithTime = todos.filter((t) => t.completedAt && t.createdAt)
    let avgHours = 0
    if (completedWithTime.length > 0) {
      const totalMs = completedWithTime.reduce((sum, t) => {
        return sum + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime())
      }, 0)
      avgHours = Math.round(totalMs / completedWithTime.length / 3600000 * 10) / 10
    }

    // Overdue count
    const overdue = activeTodos.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done').length

    // 7-day completion data
    const weekData: { label: string; count: number }[] = []
    const todayDate = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = subDays(todayDate, i)
      const dateStr = format(d, 'yyyy-MM-dd')
      const dayLabel = format(d, 'MM/dd')
      const count = todos.filter((t) => t.completedAt && t.completedAt.startsWith(dateStr)).length
      weekData.push({ label: dayLabel, count })
    }
    const weekMax = Math.max(...weekData.map((d) => d.count), 1)

    return { total, done, pending, inProgress, archived, todayDone, todayTotal, features, bugs, optimizations, rate, avgHours, overdue, weekData, weekMax }
  }, [todos, today])

  return (
    <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 space-y-3">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">数据统计</div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">
          <span>总完成率</span>
          <span>{stats.rate}%</span>
        </div>
        <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${stats.rate}%` }}
          />
        </div>
      </div>

      {/* Today stats */}
      <div className="flex gap-2">
        <div className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded text-center">
          <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{stats.todayDone}/{stats.todayTotal}</div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">今日完成</div>
        </div>
        <div className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded text-center">
          <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{stats.pending}</div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">待办</div>
        </div>
        <div className="flex-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded text-center">
          <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{stats.inProgress}</div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">进行中</div>
        </div>
      </div>

      {/* 7-day chart */}
      <div>
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1.5">近 7 天完成</div>
        <div className="flex items-end gap-1 h-10">
          {stats.weekData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full bg-green-500/60 rounded-sm transition-all duration-300 min-h-[2px]"
                style={{ height: `${(d.count / stats.weekMax) * 100}%` }}
              />
              <span className="text-[8px] text-zinc-400 dark:text-zinc-600">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown + extra stats */}
      <div className="flex gap-2 text-[10px] flex-wrap">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-zinc-500 dark:text-zinc-400">Feature {stats.features}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-zinc-500 dark:text-zinc-400">Bug {stats.bugs}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-zinc-500 dark:text-zinc-400">优化 {stats.optimizations}</span>
        </div>
        {stats.archived > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-zinc-400 dark:text-zinc-500">归档 {stats.archived}</span>
          </div>
        )}
      </div>

      {/* Extra stats row */}
      <div className="flex gap-3 text-[10px] text-zinc-400 dark:text-zinc-500">
        {stats.avgHours > 0 && (
          <span>平均耗时: {stats.avgHours < 24 ? `${stats.avgHours}h` : `${Math.round(stats.avgHours / 24 * 10) / 10}d`}</span>
        )}
        {stats.overdue > 0 && (
          <span className="text-red-400">逾期: {stats.overdue}</span>
        )}
      </div>
    </div>
  )
}
