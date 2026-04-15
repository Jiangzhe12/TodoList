import { useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { WeeklyReportData } from '../types'

interface WeeklyReportProps {
  report: WeeklyReportData
  onClose: () => void
}

type Tab = 'overview' | 'details' | 'report' | 'markdown'

const CATEGORY_COLORS: Record<string, string> = {
  feature: '#3b82f6', // blue
  bug: '#ef4444', // red
  optimization: '#f97316' // orange
}

function CategoryBadge({ category, label }: { category: string; label: string }): JSX.Element {
  const color = CATEGORY_COLORS[category] || '#71717a'
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {label}
    </span>
  )
}

/** Stat card used in the overview grid. */
function StatCard({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: string | number
  tone?: 'default' | 'good' | 'warn'
}): JSX.Element {
  const toneColor =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-zinc-900 dark:text-zinc-100'
  return (
    <div className="bg-zinc-100 dark:bg-zinc-800/60 rounded-lg px-3 py-2.5">
      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</div>
      <div className={`text-xl font-semibold leading-none ${toneColor}`}>{value}</div>
    </div>
  )
}

/** Horizontal bar chart — one row per day of week. */
function DailyBarChart({
  data
}: {
  data: WeeklyReportData['dailyCompletion']
}): JSX.Element {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100
        const empty = d.count === 0
        return (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <div
              className={`w-7 flex-shrink-0 ${
                d.isToday
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              周{d.day}
            </div>
            <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-sm overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 ${
                  empty
                    ? ''
                    : d.isToday
                      ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className={`w-6 text-right tabular-nums ${
                empty
                  ? 'text-zinc-400 dark:text-zinc-600'
                  : 'text-zinc-700 dark:text-zinc-300 font-medium'
              }`}
            >
              {d.count}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** SVG donut chart — category breakdown for completed tasks. */
function CategoryDonut({
  data
}: {
  data: WeeklyReportData['byCategory']
}): JSX.Element {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">暂无完成任务</div>
    )
  }

  const size = 100
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const segments = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const pct = d.count / total
      const segLen = pct * circumference
      const seg = {
        ...d,
        pct,
        dashArray: `${segLen} ${circumference - segLen}`,
        dashOffset: -offset,
        color: CATEGORY_COLORS[d.key] || '#71717a'
      }
      offset += segLen
      return seg
    })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-zinc-100 dark:stroke-zinc-800"
        />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        ))}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.35em"
          className="fill-zinc-900 dark:fill-zinc-100 text-lg font-semibold"
        >
          {total}
        </text>
      </svg>
      <div className="flex-1 space-y-1.5 text-[11px]">
        {data.map((d) => {
          const color = CATEGORY_COLORS[d.key] || '#71717a'
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
          return (
            <div key={d.key} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="flex-1 text-zinc-700 dark:text-zinc-300">{d.label}</span>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                {d.count} ({pct}%)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Build a plain-text formal work report from the structured data.
 * Intended for copy-paste into Feishu / DingTalk / email when reporting
 * upward to a manager. Sections are numbered with Chinese ordinals so the
 * structure survives stripping markdown formatting.
 */
function buildReportText(report: WeeklyReportData): string {
  const { stats, completedList, inProgressList, overdueList, highlights } = report
  const lines: string[] = []

  lines.push('本周工作汇报')
  lines.push(`汇报周期：${report.weekStart} 至 ${report.weekEnd}`)
  lines.push(`生成时间：${report.generatedAt.replace('T', ' ').slice(0, 16)}`)
  lines.push('')

  // 一、本周工作概况
  lines.push('一、本周工作概况')
  const overview = `本周累计完成任务 ${stats.completed} 项，推进中 ${stats.inProgress} 项，新增 ${stats.created} 项，完成率 ${stats.completionRate}%。`
  lines.push('  ' + overview)
  if (stats.avgDurationText && stats.avgDurationText !== '暂无') {
    lines.push(`  任务平均耗时 ${stats.avgDurationText}。`)
  }
  if (stats.overdue > 0) {
    lines.push(`  目前尚有 ${stats.overdue} 项任务逾期，需要重点关注。`)
  }
  lines.push('')

  // 二、重点完成事项
  lines.push('二、重点完成事项')
  if (completedList.length === 0) {
    lines.push('  本周暂无完成事项。')
  } else {
    completedList.forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t.title}（${t.categoryLabel}）`)
      if (t.bugCause) lines.push(`     问题原因：${t.bugCause}`)
      if (t.subtasksText) lines.push(`     具体进展：${t.subtasksText}`)
    })
  }
  lines.push('')

  // 三、正在推进工作
  lines.push('三、正在推进工作')
  if (inProgressList.length === 0) {
    lines.push('  暂无进行中任务。')
  } else {
    inProgressList.forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t.title}（${t.categoryLabel}）`)
      if (t.subtasksText) lines.push(`     当前进度：${t.subtasksText}`)
    })
  }
  lines.push('')

  // 四、风险与问题
  lines.push('四、风险与问题')
  if (overdueList.length === 0) {
    lines.push('  本周无逾期或阻塞事项。')
  } else {
    overdueList.forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t.title}（原计划截止 ${t.dueDate}）`)
    })
  }
  lines.push('')

  // 五、下周工作计划
  lines.push('五、下周工作计划')
  const plans: string[] = []
  if (inProgressList.length > 0) {
    plans.push(`继续推进 ${inProgressList.length} 项进行中任务`)
  }
  if (overdueList.length > 0) {
    plans.push(`优先解决 ${overdueList.length} 项逾期任务`)
  }
  plans.push('根据实际需要新增任务安排')
  plans.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`))
  lines.push('')

  // 六、本周小结
  lines.push('六、本周小结')
  if (highlights.length === 0) {
    lines.push('  本周工作平稳推进。')
  } else {
    highlights.forEach((h) => lines.push(`  - ${h}`))
  }

  return lines.join('\n')
}

/** Numbered section block used in the 汇报 tab. */
function ReportSection({
  title,
  children
}: {
  title: string
  children: ReactNode
}): JSX.Element {
  return (
    <section className="mb-5">
      <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 mb-2 pb-1 border-b border-zinc-200 dark:border-zinc-800">
        {title}
      </h2>
      <div className="pl-1 text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  )
}

/** Section header with icon + title + count. */
function SectionHeader({
  icon,
  title,
  count
}: {
  icon: string
  title: string
  count?: number
}): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-sm">{icon}</span>
      <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{title}</h3>
      {typeof count === 'number' && (
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 tabular-nums">
          ({count})
        </span>
      )}
    </div>
  )
}

export default function WeeklyReport({ report, onClose }: WeeklyReportProps): JSX.Element {
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')

  const handleCopy = async (): Promise<void> => {
    // Tab-aware: on the 汇报 tab copy the formal report text so users can
    // paste straight into Feishu/email; elsewhere copy raw markdown.
    const textToCopy = tab === 'report' ? buildReportText(report) : report.markdown
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = textToCopy
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const { stats, highlights } = report

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end animate-fade-in">
      <div className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 rounded-t-xl max-h-[90%] flex flex-col animate-slide-in-bottom">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">周报</h2>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {report.weekStart} - {report.weekEnd}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-[10px] rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            >
              {copied ? '✓ 已复制' : tab === 'report' ? '复制汇报' : '复制 Markdown'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-2 text-[11px]">
          {(
            [
              ['overview', '总览'],
              ['details', '详情'],
              ['report', '汇报'],
              ['markdown', 'Markdown']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2">
                <StatCard label="完成" value={stats.completed} tone="good" />
                <StatCard label="新增" value={stats.created} />
                <StatCard label="进行中" value={stats.inProgress} />
                <StatCard
                  label="逾期"
                  value={stats.overdue}
                  tone={stats.overdue > 0 ? 'warn' : 'default'}
                />
              </div>

              {/* Rate + avg duration */}
              <div className="flex items-center gap-4 text-[11px] text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 dark:text-zinc-500">完成率</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {stats.completionRate}%
                  </span>
                  <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 dark:text-zinc-500">平均耗时</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {stats.avgDurationText}
                  </span>
                </div>
              </div>

              {/* Highlights */}
              {highlights.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200/60 dark:border-amber-700/30 rounded-lg p-3">
                  <SectionHeader icon="💡" title="亮点" />
                  <ul className="space-y-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                    {highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-500 dark:text-amber-400 mt-0.5">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Daily completion bar chart */}
              <div>
                <SectionHeader icon="📅" title="每日完成分布" />
                <DailyBarChart data={report.dailyCompletion} />
              </div>

              {/* Category donut */}
              <div>
                <SectionHeader icon="🏷️" title="分类分布" />
                <CategoryDonut data={report.byCategory} />
              </div>
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-5">
              {/* Completed */}
              <div>
                <SectionHeader
                  icon="✅"
                  title="本周完成"
                  count={report.completedList.length}
                />
                {report.completedList.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                    暂无
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {report.completedList.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[11px] text-zinc-700 dark:text-zinc-300"
                      >
                        <CategoryBadge category={t.category} label={t.categoryLabel} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{t.title}</div>
                          {t.bugCause && (
                            <div className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5">
                              原因: {t.bugCause}
                            </div>
                          )}
                          {t.subtasksText && (
                            <div className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5">
                              子任务: {t.subtasksText}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* In progress */}
              <div>
                <SectionHeader
                  icon="🔄"
                  title="进行中"
                  count={report.inProgressList.length}
                />
                {report.inProgressList.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                    暂无
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {report.inProgressList.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[11px] text-zinc-700 dark:text-zinc-300"
                      >
                        <CategoryBadge category={t.category} label={t.categoryLabel} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{t.title}</div>
                          {t.subtasksText && (
                            <div className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5">
                              子任务: {t.subtasksText}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Overdue */}
              {report.overdueList.length > 0 && (
                <div>
                  <SectionHeader
                    icon="⚠️"
                    title="逾期未完成"
                    count={report.overdueList.length}
                  />
                  <ul className="space-y-1 text-[11px]">
                    {report.overdueList.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-red-600 dark:text-red-400"
                      >
                        <span className="truncate flex-1">{t.title}</span>
                        <span className="text-[10px] text-red-500/80 dark:text-red-500/80 flex-shrink-0">
                          截止 {t.dueDate}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Created */}
              <div>
                <SectionHeader
                  icon="➕"
                  title="本周新增"
                  count={report.createdList.length}
                />
                {report.createdList.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                    暂无
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {report.createdList.slice(0, 20).map((t, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-[11px] text-zinc-700 dark:text-zinc-300"
                      >
                        <CategoryBadge category={t.category} label={t.categoryLabel} />
                        <span className="truncate flex-1">{t.title}</span>
                      </li>
                    ))}
                    {report.createdList.length > 20 && (
                      <li className="text-[10px] text-zinc-500 dark:text-zinc-400 italic">
                        ...及其他 {report.createdList.length - 20} 项
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'report' && (
            <article className="max-w-[640px] mx-auto text-[12px] leading-[1.85] text-zinc-800 dark:text-zinc-200">
              {/* Report header */}
              <header className="text-center mb-5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h1 className="text-base font-bold mb-1 text-zinc-900 dark:text-zinc-100">
                  本周工作汇报
                </h1>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  汇报周期：{report.weekStart} 至 {report.weekEnd}
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  生成时间：{report.generatedAt.replace('T', ' ').slice(0, 16)}
                </div>
              </header>

              {/* 一、本周工作概况 */}
              <ReportSection title="一、本周工作概况">
                <p>
                  本周累计完成任务{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {stats.completed}
                  </strong>{' '}
                  项，推进中 <strong>{stats.inProgress}</strong> 项，新增{' '}
                  <strong>{stats.created}</strong> 项，完成率{' '}
                  <strong>{stats.completionRate}%</strong>。
                  {stats.avgDurationText && stats.avgDurationText !== '暂无' && (
                    <>
                      {' '}
                      任务平均耗时 <strong>{stats.avgDurationText}</strong>。
                    </>
                  )}
                </p>
                {stats.overdue > 0 && (
                  <p className="text-amber-700 dark:text-amber-400 mt-1.5">
                    目前尚有 <strong>{stats.overdue}</strong> 项任务逾期，需要重点关注。
                  </p>
                )}
              </ReportSection>

              {/* 二、重点完成事项 */}
              <ReportSection title="二、重点完成事项">
                {report.completedList.length === 0 ? (
                  <p className="text-zinc-400 dark:text-zinc-500 italic">本周暂无完成事项。</p>
                ) : (
                  <ol className="space-y-2 list-decimal list-inside marker:text-zinc-400">
                    {report.completedList.map((t, i) => (
                      <li key={i}>
                        <span className="font-medium">{t.title}</span>
                        <span className="text-zinc-500 dark:text-zinc-400 ml-1 text-[11px]">
                          ({t.categoryLabel})
                        </span>
                        {t.bugCause && (
                          <div className="ml-5 mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                            问题原因：{t.bugCause}
                          </div>
                        )}
                        {t.subtasksText && (
                          <div className="ml-5 mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                            具体进展：{t.subtasksText}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </ReportSection>

              {/* 三、正在推进工作 */}
              <ReportSection title="三、正在推进工作">
                {report.inProgressList.length === 0 ? (
                  <p className="text-zinc-400 dark:text-zinc-500 italic">暂无进行中任务。</p>
                ) : (
                  <ol className="space-y-2 list-decimal list-inside marker:text-zinc-400">
                    {report.inProgressList.map((t, i) => (
                      <li key={i}>
                        <span className="font-medium">{t.title}</span>
                        <span className="text-zinc-500 dark:text-zinc-400 ml-1 text-[11px]">
                          ({t.categoryLabel})
                        </span>
                        {t.subtasksText && (
                          <div className="ml-5 mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                            当前进度：{t.subtasksText}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </ReportSection>

              {/* 四、风险与问题 */}
              <ReportSection title="四、风险与问题">
                {report.overdueList.length === 0 ? (
                  <p className="text-zinc-400 dark:text-zinc-500 italic">
                    本周无逾期或阻塞事项。
                  </p>
                ) : (
                  <ol className="space-y-1.5 list-decimal list-inside marker:text-amber-500 text-amber-700 dark:text-amber-400">
                    {report.overdueList.map((t, i) => (
                      <li key={i}>
                        <span className="font-medium">{t.title}</span>
                        <span className="text-[11px] ml-1">
                          （原计划截止 {t.dueDate}）
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </ReportSection>

              {/* 五、下周工作计划 */}
              <ReportSection title="五、下周工作计划">
                <ol className="space-y-1 list-decimal list-inside marker:text-zinc-400">
                  {report.inProgressList.length > 0 && (
                    <li>
                      继续推进 <strong>{report.inProgressList.length}</strong> 项进行中任务
                    </li>
                  )}
                  {report.overdueList.length > 0 && (
                    <li>
                      优先解决 <strong>{report.overdueList.length}</strong> 项逾期任务
                    </li>
                  )}
                  <li>根据实际需要新增任务安排</li>
                </ol>
              </ReportSection>

              {/* 六、本周小结 */}
              <ReportSection title="六、本周小结">
                {highlights.length === 0 ? (
                  <p>本周工作平稳推进。</p>
                ) : (
                  <ul className="space-y-1 list-disc list-inside marker:text-amber-500">
                    {highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
              </ReportSection>
            </article>
          )}

          {tab === 'markdown' && (
            <div className="prose-mini">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.markdown}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
