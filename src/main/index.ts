import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'

const store = new Store({ name: 'todo-data' })

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isPinned = true // true = screen-saver level, false = floating level

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 680,
    minWidth: 320,
    minHeight: 200,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: '#18181b',
    titleBarStyle: 'hidden',
    vibrancy: 'under-window',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set initial always-on-top level: pinned = screen-saver (highest)
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  isPinned = true

  // Z-axis behavior: focus → top, blur + unpinned → bottom
  mainWindow.on('focus', () => {
    if (!isPinned && mainWindow) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    }
  })
  mainWindow.on('blur', () => {
    if (!isPinned && mainWindow) {
      mainWindow.setAlwaysOnTop(true, 'normal', -1)
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  // Create a simple tray icon (16x16 template image)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAADlJREFUOI1jYBhsgJGBgYGBgYEhikSNKHYxMqABRoLqiDaAhRgNuAwgxU5kkwn6gZEYA0Y9MBIBAOYkBBlyzBJnAAAAAElFTkSuQmCC'
  )
  tray = new Tray(icon)
  tray.setToolTip('Todo Desktop')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => mainWindow?.show()
    },
    {
      label: 'Pin on Top',
      type: 'checkbox',
      checked: isPinned,
      click: (menuItem) => {
        isPinned = menuItem.checked
        if (mainWindow) {
          if (isPinned) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver')
          } else if (!mainWindow.isFocused()) {
            mainWindow.setAlwaysOnTop(true, 'normal', -1)
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
    }
  })
}

// IPC handlers for store
ipcMain.handle('store:get', () => {
  return store.store
})

ipcMain.handle('store:set', (_event, data) => {
  store.store = data
})

// Window control IPC
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window:close', () => {
  mainWindow?.hide()
})

ipcMain.on('window:toggle-always-on-top', () => {
  if (mainWindow) {
    isPinned = !isPinned
    if (isPinned) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
    } else if (!mainWindow.isFocused()) {
      // Unpinned + no focus → sink to bottom
      mainWindow.setAlwaysOnTop(true, 'normal', -1)
    }
    // If unpinned but focused, stay on top; blur handler will sink it later
  }
})

ipcMain.handle('window:is-always-on-top', () => {
  return isPinned
})

interface TodoData {
  title: string
  category: string
  status: string
  priority?: string
  date: string
  createdAt: string
  completedAt?: string
  archived?: boolean
  dueDate?: string
  note?: string
  bugCause?: string
  subtasks?: { id: string; title: string; done: boolean }[]
}

// Rich weekly-report payload. Renderer uses this to render stats cards,
// charts, and detail lists. `markdown` remains for copy-to-clipboard.
interface WeeklyReportData {
  weekStart: string // "04/13"
  weekEnd: string // "04/19"
  generatedAt: string // ISO timestamp
  stats: {
    completed: number
    created: number
    inProgress: number
    overdue: number
    completionRate: number // 0-100, weekly-scoped
    avgDurationText: string // "3.2h" / "1.5d" / "—"
  }
  // 7 buckets, Mon → Sun. isToday marks the current weekday.
  dailyCompletion: Array<{ day: string; count: number; isToday: boolean }>
  // Category breakdown for completed-this-week tasks.
  byCategory: Array<{ key: string; label: string; count: number }>
  completedList: Array<{
    title: string
    category: string
    categoryLabel: string
    bugCause?: string
    subtasksText?: string
    completedAt: string
  }>
  inProgressList: Array<{
    title: string
    category: string
    categoryLabel: string
    subtasksText?: string
  }>
  createdList: Array<{ title: string; category: string; categoryLabel: string }>
  overdueList: Array<{ title: string; dueDate: string }>
  highlights: string[]
  markdown: string
}

// Helper: format date as MM/dd
function fmtMMDD(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
// Helper: format date as yyyy-MM-dd
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Helper: get Monday of the week (local time, 00:00:00.000)
function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setHours(0, 0, 0, 0)
  mon.setDate(diff)
  return mon
}
// Helper: get Sunday of the week (local time, 23:59:59.999)
function getSunday(d: Date): Date {
  const mon = getMonday(d)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'feature':
      return 'Feature'
    case 'bug':
      return 'Bug'
    case 'optimization':
      return '优化'
    default:
      return cat
  }
}

function buildHighlights(
  data: WeeklyReportData,
  dailyCountMap: Map<number, number>
): string[] {
  const h: string[] = []
  const { stats } = data

  if (stats.completed === 0 && stats.created === 0) {
    h.push('本周尚无任务活动，加把劲吧 💪')
    return h
  }

  h.push(`本周完成 ${stats.completed} 项任务，新增 ${stats.created} 项`)

  // Best weekday
  if (stats.completed > 0) {
    let bestIdx = -1
    let bestCount = 0
    for (const [idx, count] of dailyCountMap) {
      if (count > bestCount) {
        bestCount = count
        bestIdx = idx
      }
    }
    if (bestIdx >= 0 && bestCount >= 2) {
      const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      h.push(`效率最高: ${dayNames[bestIdx]}（${bestCount} 项）`)
    }
  }

  // Category focus
  const catParts = data.byCategory.filter((c) => c.count > 0)
  if (catParts.length > 0) {
    const top = [...catParts].sort((a, b) => b.count - a.count)[0]
    if (top.count >= 2) {
      h.push(`主攻方向: ${top.label}（${top.count} 项）`)
    }
  }

  // Completion rate commentary
  if (stats.completionRate >= 80) {
    h.push(`完成率 ${stats.completionRate}%，表现优秀 👍`)
  } else if (stats.completionRate >= 50) {
    h.push(`完成率 ${stats.completionRate}%，稳步推进`)
  } else if (stats.completed + stats.inProgress >= 3) {
    h.push(`完成率 ${stats.completionRate}%，建议聚焦收尾`)
  }

  if (stats.overdue > 0) {
    h.push(`⚠️ 逾期 ${stats.overdue} 项，需优先处理`)
  }

  if (stats.avgDurationText !== '—') {
    h.push(`平均耗时 ${stats.avgDurationText}`)
  }

  return h
}

function generateWeeklyReport(): WeeklyReportData {
  const raw = store.store as { todos?: TodoData[] }
  const now = new Date()
  const weekStart = getMonday(now)
  const weekEnd = getSunday(now)
  const weekStartStr = fmtMMDD(weekStart)
  const weekEndStr = fmtMMDD(weekEnd)

  const empty: WeeklyReportData = {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    generatedAt: now.toISOString(),
    stats: {
      completed: 0,
      created: 0,
      inProgress: 0,
      overdue: 0,
      completionRate: 0,
      avgDurationText: '—'
    },
    dailyCompletion: [],
    byCategory: [],
    completedList: [],
    inProgressList: [],
    createdList: [],
    overdueList: [],
    highlights: ['本周尚无任务数据'],
    markdown: `# 周报 (${weekStartStr} - ${weekEndStr})\n\n暂无任务数据`
  }
  if (!raw?.todos) return empty

  const todos = raw.todos.filter((t) => !t.archived)

  const inWeek = (isoStr: string): boolean => {
    const d = new Date(isoStr)
    return d.getTime() >= weekStart.getTime() && d.getTime() <= weekEnd.getTime()
  }

  const completed = todos.filter((t) => t.completedAt && inWeek(t.completedAt))
  const created = todos.filter((t) => t.createdAt && inWeek(t.createdAt))
  const inProgress = todos.filter((t) => t.status === 'in_progress')

  const todayStr = fmtDate(now)
  const overdue = todos.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== 'done'
  )

  // Weekly-scoped completion rate: 本周完成 / (本周完成 + 进行中 + 逾期)
  // This reflects "what fraction of this week's workload is actually done".
  const denom = completed.length + inProgress.length + overdue.length
  const completionRate = denom > 0 ? Math.round((completed.length / denom) * 100) : 0

  // Average completion duration (createdAt → completedAt)
  let avgDurationText = '—'
  if (completed.length > 0) {
    const totalMs = completed.reduce((sum, t) => {
      return sum + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime())
    }, 0)
    const avgHours = Math.round((totalMs / completed.length / 3600000) * 10) / 10
    avgDurationText = avgHours < 24 ? `${avgHours}h` : `${Math.round((avgHours / 24) * 10) / 10}d`
  }

  // Daily completion buckets: index 0 = Mon, 6 = Sun
  // Compute bucket by day-offset from weekStart to avoid Date.getDay() edge cases.
  const dailyCountMap = new Map<number, number>()
  for (const t of completed) {
    if (!t.completedAt) continue
    const d = new Date(t.completedAt)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const weekStartDay = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate()
    ).getTime()
    const offset = Math.round((dayStart - weekStartDay) / 86400000)
    if (offset >= 0 && offset <= 6) {
      dailyCountMap.set(offset, (dailyCountMap.get(offset) || 0) + 1)
    }
  }
  const todayOffset = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate()
      ).getTime()) /
      86400000
  )
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日']
  const dailyCompletion = dayLabels.map((label, idx) => ({
    day: label,
    count: dailyCountMap.get(idx) || 0,
    isToday: idx === todayOffset
  }))

  // Category breakdown (completed this week)
  const catMap = new Map<string, number>()
  for (const t of completed) {
    catMap.set(t.category, (catMap.get(t.category) || 0) + 1)
  }
  const byCategory: Array<{ key: string; label: string; count: number }> = []
  for (const key of ['feature', 'bug', 'optimization']) {
    byCategory.push({ key, label: categoryLabel(key), count: catMap.get(key) || 0 })
  }

  // Lists
  const subtasksText = (t: TodoData): string | undefined => {
    if (!t.subtasks || t.subtasks.length === 0) return undefined
    const done = t.subtasks.filter((s) => s.done).length
    return `${done}/${t.subtasks.length}`
  }

  const completedList = completed
    .slice()
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .map((t) => ({
      title: t.title,
      category: t.category,
      categoryLabel: categoryLabel(t.category),
      bugCause: t.category === 'bug' ? t.bugCause : undefined,
      subtasksText: subtasksText(t),
      completedAt: t.completedAt!
    }))

  const inProgressList = inProgress.map((t) => ({
    title: t.title,
    category: t.category,
    categoryLabel: categoryLabel(t.category),
    subtasksText: subtasksText(t)
  }))

  const createdList = created.map((t) => ({
    title: t.title,
    category: t.category,
    categoryLabel: categoryLabel(t.category)
  }))

  const overdueList = overdue.map((t) => ({
    title: t.title,
    dueDate: t.dueDate!
  }))

  // Build markdown version (for copy-to-clipboard)
  let md = `# 周报 (${weekStartStr} - ${weekEndStr})\n\n`
  md += `## 亮点\n`
  // highlights will be prepended after we build the data object
  md += '<<HIGHLIGHTS>>\n\n'

  md += `## 统计\n`
  md += `- 完成: **${completed.length}** 项 · 新增: **${created.length}** 项 · 进行中: **${inProgress.length}** 项 · 逾期: **${overdue.length}** 项\n`
  md += `- 完成率: **${completionRate}%** · 平均耗时: **${avgDurationText}**\n\n`

  md += `## 每日完成分布\n`
  for (const d of dailyCompletion) {
    const bar = '█'.repeat(d.count) || '·'
    md += `- 周${d.day} \`${bar}\` ${d.count}${d.isToday ? ' (今天)' : ''}\n`
  }
  md += '\n'

  const nonZeroCats = byCategory.filter((c) => c.count > 0)
  if (nonZeroCats.length > 0) {
    md += `## 分类分布\n`
    for (const c of nonZeroCats) {
      md += `- ${c.label}: ${c.count} 项\n`
    }
    md += '\n'
  }

  md += `## 本周完成 (${completedList.length})\n`
  if (completedList.length === 0) {
    md += '- *暂无*\n'
  } else {
    for (const t of completedList) {
      let line = `- **[${t.categoryLabel}]** ${t.title}`
      if (t.bugCause) line += ` — 原因: ${t.bugCause}`
      if (t.subtasksText) line += ` (子任务: ${t.subtasksText})`
      md += line + '\n'
    }
  }
  md += '\n'

  md += `## 进行中 (${inProgressList.length})\n`
  if (inProgressList.length === 0) {
    md += '- *暂无*\n'
  } else {
    for (const t of inProgressList) {
      let line = `- **[${t.categoryLabel}]** ${t.title}`
      if (t.subtasksText) line += ` (子任务: ${t.subtasksText})`
      md += line + '\n'
    }
  }
  md += '\n'

  md += `## 本周新增 (${createdList.length})\n`
  if (createdList.length === 0) {
    md += '- *暂无*\n'
  } else {
    for (const t of createdList.slice(0, 15)) {
      md += `- **[${t.categoryLabel}]** ${t.title}\n`
    }
    if (createdList.length > 15) md += `- ...及其他 ${createdList.length - 15} 项\n`
  }
  md += '\n'

  if (overdueList.length > 0) {
    md += `## 逾期未完成 (${overdueList.length})\n`
    for (const t of overdueList) {
      md += `- ${t.title} (截止: ${t.dueDate})\n`
    }
    md += '\n'
  }

  const result: WeeklyReportData = {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    generatedAt: now.toISOString(),
    stats: {
      completed: completed.length,
      created: created.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      completionRate,
      avgDurationText
    },
    dailyCompletion,
    byCategory,
    completedList,
    inProgressList,
    createdList,
    overdueList,
    highlights: [],
    markdown: ''
  }
  result.highlights = buildHighlights(result, dailyCountMap)
  result.markdown = md.replace(
    '<<HIGHLIGHTS>>',
    result.highlights.map((h) => `- ${h}`).join('\n')
  )

  return result
}

// Weekly report: check every minute if it's Friday 17:00
let lastReportDate = ''
function checkWeeklyReport(): void {
  const now = new Date()
  const todayStr = fmtDate(now)
  if (now.getDay() === 5 && now.getHours() === 17 && lastReportDate !== todayStr) {
    lastReportDate = todayStr
    const report = generateWeeklyReport()
    if (mainWindow) {
      mainWindow.webContents.send('report:ready', report)
      new Notification({
        title: '周报已生成',
        body: '点击查看本周工作总结'
      }).show()
      mainWindow.show()
    }
  }
}

// IPC handler for manual report generation
ipcMain.on('report:generate', () => {
  const report = generateWeeklyReport()
  if (mainWindow) {
    mainWindow.webContents.send('report:ready', report)
  }
})

function checkDueDateNotifications(): void {
  const data = store.store as { todos?: Array<{ title: string; dueDate?: string; status: string; archived?: boolean }> }
  if (!data?.todos) return

  const today = new Date().toISOString().split('T')[0]
  const overdue: string[] = []
  const dueToday: string[] = []

  for (const todo of data.todos) {
    if (!todo.dueDate || todo.status === 'done' || todo.archived) continue
    if (todo.dueDate < today) overdue.push(todo.title)
    else if (todo.dueDate === today) dueToday.push(todo.title)
  }

  if (overdue.length > 0) {
    new Notification({
      title: `${overdue.length} 个任务已逾期`,
      body: overdue.slice(0, 3).join('、') + (overdue.length > 3 ? ' 等...' : '')
    }).show()
  }

  if (dueToday.length > 0) {
    new Notification({
      title: `${dueToday.length} 个任务今天到期`,
      body: dueToday.slice(0, 3).join('、') + (dueToday.length > 3 ? ' 等...' : '')
    }).show()
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.todo-desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  createTray()

  // Register global shortcut: Cmd+Shift+N to quick-add task
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (!mainWindow) return
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('global:quick-add')
  })

  // Check due date notifications on startup (with slight delay) and every hour
  setTimeout(checkDueDateNotifications, 3000)
  setInterval(checkDueDateNotifications, 3600_000)

  // Check weekly report every minute (Friday 17:00)
  setInterval(checkWeeklyReport, 60_000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Extend app type for isQuiting flag
declare module 'electron' {
  interface App {
    isQuiting?: boolean
  }
}
