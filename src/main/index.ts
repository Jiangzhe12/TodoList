import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, globalShortcut, screen, protocol, net } from 'electron'
import { join, basename } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { randomUUID } from 'crypto'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'

// Custom protocol for serving locally-stored images via app-image://<filename>
// Must be registered before app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app-image', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

const store = new Store({ name: 'todo-data' })

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isPinned = true // true = floating level (above normal windows, below IME popup), false = sunk to bottom on blur

// ─── Window bounds persistence ───
let boundsTimer: ReturnType<typeof setTimeout> | null = null
function saveBounds(): void {
  if (!mainWindow) return
  if (boundsTimer) clearTimeout(boundsTimer)
  boundsTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      store.set('windowBounds', mainWindow.getBounds())
    }
  }, 500)
}

function getRestoredBounds(): Electron.Rectangle | null {
  const saved = store.get('windowBounds') as { x: number; y: number; width: number; height: number } | undefined
  if (!saved || typeof saved.x !== 'number' || typeof saved.y !== 'number') return null
  // Require at least 50px of the window to be within a visible display
  const displays = screen.getAllDisplays()
  const isVisible = displays.some((d) => {
    const wa = d.workArea
    const overlapX = Math.max(0, Math.min(saved.x + saved.width, wa.x + wa.width) - Math.max(saved.x, wa.x))
    const overlapY = Math.max(0, Math.min(saved.y + saved.height, wa.y + wa.height) - Math.max(saved.y, wa.y))
    return overlapX >= 50 && overlapY >= 50
  })
  return isVisible ? saved : null
}

function createWindow(): void {
  const restored = getRestoredBounds()
  mainWindow = new BrowserWindow({
    width: restored?.width ?? 400,
    height: restored?.height ?? 680,
    x: restored?.x,
    y: restored?.y,
    minWidth: 320,
    minHeight: 200,
    show: false, // Don't show until content is ready — prevents white flash
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: '#18181b',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set initial always-on-top level: pinned = floating.
  // NOTE: do not use 'screen-saver' — it sits above macOS IME candidate
  // windows, which makes Chinese/Japanese input suggestions appear hidden
  // behind this app. 'floating' keeps us above normal windows while still
  // letting system UI (IME popup, context menus) render on top.
  mainWindow.setAlwaysOnTop(true, 'floating')
  isPinned = true

  // Persist window bounds on move/resize
  mainWindow.on('move', saveBounds)
  mainWindow.on('resize', saveBounds)

  // Z-axis behavior: focus → top, blur + unpinned → bottom
  mainWindow.on('focus', () => {
    if (!isPinned && mainWindow) {
      mainWindow.setAlwaysOnTop(true, 'floating')
    }
  })
  mainWindow.on('blur', () => {
    if (!isPinned && mainWindow) {
      mainWindow.setAlwaysOnTop(true, 'normal', -1)
    }
  })

  // Only show window once content has painted — prevents white flash
  let shown = false
  const showOnce = (): void => {
    if (shown || !mainWindow || mainWindow.isDestroyed()) return
    shown = true
    mainWindow.show()
  }
  mainWindow.on('ready-to-show', showOnce)

  // Failsafe: if the page hasn't triggered ready-to-show within 4s, show anyway
  // to avoid invisible app. Then reload once if content is still blank.
  const showTimeout = setTimeout(() => {
    showOnce()
    // If we had to force-show, the renderer might be stuck — give it one reload
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.reload()
    }
  }, 4000)
  mainWindow.on('ready-to-show', () => clearTimeout(showTimeout))

  // Auto-reload on renderer crash
  mainWindow.webContents.on('render-process-gone', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.reload()
    }
  })

  // Auto-reload on load failure (e.g., asar read error, file not found)
  mainWindow.webContents.on('did-fail-load', (_e, code, _desc, url) => {
    if (code !== -3 && mainWindow && !mainWindow.isDestroyed()) { // -3 = aborted (normal)
      setTimeout(() => mainWindow?.webContents.reload(), 500)
    }
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
  // macOS template image: black + alpha. macOS auto-renders white/dark
  // based on menu bar appearance. Using inline base64 to avoid file path issues.
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAzklEQVR4nO2WwQ2DMAxFXYsROkKGyBAdlyEyhEfoEBWHSpFLsX/jWEjlX0hE8HuQCJno33NLYKzd+KFvciJ8b06zBczw2c9AC2A8j87AMhm+5f7LF2jduAZIfK3HCXBdp3kPYR2EiqceD0IsuJZIE+gj2QKi5iVTQNAHeDK8RAoI5mPDEQHrVEP7jgoIOIeyONYUEOp++y3eLfAWheCIwLt4iYSjAkOgSIFeQl8p80dURuGWQFRHdFiPkeYhCF69TWmj+Hw0JYwsjoZfOUVeeAofD1N5JmQAAAAASUVORK5CYII='
  )
  icon.setTemplateImage(true)
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
            mainWindow.setAlwaysOnTop(true, 'floating')
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
      mainWindow.setAlwaysOnTop(true, 'floating')
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

function generateWeeklyReport(weekOffset = 0): WeeklyReportData {
  const raw = store.store as { todos?: TodoData[] }
  const now = new Date()
  const target = new Date(now)
  target.setDate(target.getDate() + weekOffset * 7)
  const weekStart = getMonday(target)
  const weekEnd = getSunday(target)
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

  const todos = raw.todos ?? []

  const inWeek = (isoStr: string): boolean => {
    const d = new Date(isoStr)
    return d.getTime() >= weekStart.getTime() && d.getTime() <= weekEnd.getTime()
  }

  const isPast = weekOffset < 0
  const completed = todos.filter((t) => t.completedAt && inWeek(t.completedAt))
  const created = todos.filter((t) => t.createdAt && inWeek(t.createdAt))
  // For past weeks, "in progress" only makes sense as current state — skip for history
  const inProgress = isPast ? [] : todos.filter((t) => t.status === 'in_progress')

  const todayStr = fmtDate(now)
  // For past weeks, overdue is not meaningful
  const overdue = isPast ? [] : todos.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== 'done'
  )

  // Weekly-scoped completion rate: for past weeks, just completed / (completed + created-but-not-completed)
  // For current week: 本周完成 / (本周完成 + 进行中 + 逾期)
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

// Weekly report: check every minute if it's Friday 14:00
// The user asked to be reminded at Friday 2 PM to review their weekly report
// before submitting it to their manager.
let lastReportDate = ''
function checkWeeklyReport(): void {
  const now = new Date()
  const todayStr = fmtDate(now)
  if (now.getDay() === 5 && now.getHours() === 14 && lastReportDate !== todayStr) {
    lastReportDate = todayStr
    const report = generateWeeklyReport()
    if (mainWindow) {
      mainWindow.webContents.send('report:ready', report)
      new Notification({
        title: '周五了，该复盘周报了',
        body: '回顾本周工作，整理汇报内容'
      }).show()
      mainWindow.show()
    }
  }
}

// IPC handler for manual report generation (with optional week offset)
ipcMain.on('report:generate', (_event, weekOffset?: number) => {
  const report = generateWeeklyReport(weekOffset ?? 0)
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

const imagesDir = (): string => join(app.getPath('userData'), 'images')

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

ipcMain.handle('images:save', async (_event, buffer: ArrayBuffer, mime: string) => {
  const ext = MIME_TO_EXT[mime]
  if (!ext) throw new Error(`Unsupported image type: ${mime}`)
  const dir = imagesDir()
  await mkdir(dir, { recursive: true })
  const filename = `${randomUUID()}.${ext}`
  await writeFile(join(dir, filename), Buffer.from(buffer))
  return filename
})

ipcMain.handle('images:delete', async (_event, filename: string) => {
  const safe = basename(filename)
  if (!safe) return
  try {
    const { unlink } = await import('fs/promises')
    await unlink(join(imagesDir(), safe))
  } catch {
    // Ignore — already gone or never existed.
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.todo-desktop')

  // Serve app-image://<filename> from userData/images on disk.
  // basename() strips any path traversal attempts.
  protocol.handle('app-image', (request) => {
    try {
      // URL shape: app-image://<filename> → hostname holds the filename.
      // basename() strips any traversal/separators as defense in depth.
      const url = new URL(request.url)
      const filename = basename(decodeURIComponent(url.hostname))
      if (!filename) return new Response('Not Found', { status: 404 })
      return net.fetch(pathToFileURL(join(imagesDir(), filename)).toString())
    } catch {
      return new Response('Bad Request', { status: 400 })
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  try { createTray() } catch (_) { /* tray icon failed, app still works */ }

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
