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

// Helper: format date as MM/dd
function fmtMMDD(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
// Helper: format date as yyyy-MM-dd
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Helper: get Monday of the week
function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setHours(0, 0, 0, 0)
  mon.setDate(diff)
  return mon
}
// Helper: get Sunday of the week
function getSunday(d: Date): Date {
  const mon = getMonday(d)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun
}

function generateWeeklyReport(): string {
  const data = store.store as { todos?: TodoData[] }
  if (!data?.todos) return '# 周报\n\n暂无任务数据'

  const now = new Date()
  const weekStart = getMonday(now)
  const weekEnd = getSunday(now)

  const weekStartStr = fmtMMDD(weekStart)
  const weekEndStr = fmtMMDD(weekEnd)

  const todos = data.todos.filter((t) => !t.archived)

  const inWeek = (isoStr: string): boolean => {
    const d = new Date(isoStr)
    return d >= weekStart && d <= weekEnd
  }

  const completed = todos.filter((t) => t.completedAt && inWeek(t.completedAt))
  const created = todos.filter((t) => t.createdAt && inWeek(t.createdAt))
  const inProgress = todos.filter((t) => t.status === 'in_progress')

  const today = fmtDate(now)
  const overdue = todos.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done')

  const totalActive = todos.length
  const doneCount = todos.filter((t) => t.status === 'done').length
  const rate = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0

  let avgHoursStr = '—'
  if (completed.length > 0) {
    const totalMs = completed.reduce((sum, t) => {
      return sum + (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime())
    }, 0)
    const avgHours = Math.round((totalMs / completed.length / 3600000) * 10) / 10
    avgHoursStr = avgHours < 24 ? `${avgHours}h` : `${Math.round((avgHours / 24) * 10) / 10}d`
  }

  const categoryLabel = (cat: string): string => {
    switch (cat) {
      case 'feature': return 'Feature'
      case 'bug': return 'Bug'
      case 'optimization': return '优化'
      default: return cat
    }
  }

  let md = `# 周报 (${weekStartStr} - ${weekEndStr})\n\n`

  md += `## 本周完成 (${completed.length})\n`
  if (completed.length === 0) {
    md += '- *暂无*\n'
  } else {
    for (const t of completed) {
      let line = `- **[${categoryLabel(t.category)}]** ${t.title}`
      if (t.category === 'bug' && t.bugCause) line += ` — 原因: ${t.bugCause}`
      md += line + '\n'
    }
  }
  md += '\n'

  md += `## 进行中 (${inProgress.length})\n`
  if (inProgress.length === 0) {
    md += '- *暂无*\n'
  } else {
    for (const t of inProgress) {
      let line = `- **[${categoryLabel(t.category)}]** ${t.title}`
      if (t.subtasks && t.subtasks.length > 0) {
        const done = t.subtasks.filter((s) => s.done).length
        line += ` (子任务: ${done}/${t.subtasks.length})`
      }
      md += line + '\n'
    }
  }
  md += '\n'

  md += `## 本周新增 (${created.length})\n`
  if (created.length === 0) {
    md += '- *暂无*\n'
  } else {
    for (const t of created.slice(0, 15)) {
      md += `- **[${categoryLabel(t.category)}]** ${t.title}\n`
    }
    if (created.length > 15) md += `- ...及其他 ${created.length - 15} 项\n`
  }
  md += '\n'

  if (overdue.length > 0) {
    md += `## 逾期未完成 (${overdue.length})\n`
    for (const t of overdue) {
      md += `- ${t.title} (截止: ${t.dueDate})\n`
    }
    md += '\n'
  }

  md += `## 统计\n`
  md += `- 总完成率: ${rate}%\n`
  md += `- 本周完成: ${completed.length} 项\n`
  md += `- 平均耗时: ${avgHoursStr}\n`
  if (overdue.length > 0) md += `- 逾期任务: ${overdue.length} 项\n`

  return md
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
