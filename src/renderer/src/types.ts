export type TodoCategory = 'feature' | 'bug' | 'optimization'

export type TodoStatus = 'pending' | 'in_progress' | 'done'

export type TodoPriority = 'high' | 'medium' | 'low'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface ChangeLogEntry {
  timestamp: string
  field: string
  oldValue?: string
  newValue?: string
}

export interface TodoTemplate {
  id: string
  name: string
  category: TodoCategory
  priority: TodoPriority
  tags?: string[]
  subtasks?: string[] // template only stores titles
  note?: string
}

export interface TodoBase {
  id: string
  title: string
  category: TodoCategory
  status: TodoStatus
  priority: TodoPriority
  date: string // "YYYY-MM-DD"
  createdAt: string
  updatedAt: string
  completedAt?: string
  dueDate?: string // "YYYY-MM-DD"
  note?: string
  order: number // sort order within a date group
  archived?: boolean
  subtasks?: Subtask[]
  tags?: string[]
  changelog?: ChangeLogEntry[]
}

export interface BugTodo extends TodoBase {
  category: 'bug'
  bugCause?: string
  fixPlan?: string
  convertedToOptimizationId?: string
}

export type Todo = TodoBase | BugTodo

export interface AppData {
  todos: Todo[]
  lastOpenDate: string
  customTags?: string[]
  templates?: TodoTemplate[]
  savedReports?: Record<string, string> // key = weekStart, value = user-edited report text
}

export type FilterCategory = TodoCategory | 'all'
export type FilterStatus = TodoStatus | 'all'

export function isBugTodo(todo: Todo): todo is BugTodo {
  return todo.category === 'bug'
}

// Rich weekly-report payload from main process. Renderer uses this to render
// stats cards, charts, and detail lists. `markdown` is kept for copy-to-clipboard.
export interface WeeklyReportData {
  weekStart: string
  weekEnd: string
  generatedAt: string
  stats: {
    completed: number
    created: number
    inProgress: number
    overdue: number
    completionRate: number
    avgDurationText: string
  }
  dailyCompletion: Array<{ day: string; count: number; isToday: boolean }>
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

// Window API exposed by preload
declare global {
  interface Window {
    api: {
      getStoreData: () => Promise<Record<string, unknown>>
      setStoreData: (data: Record<string, unknown>) => Promise<void>
      minimizeWindow: () => void
      closeWindow: () => void
      toggleAlwaysOnTop: () => void
      isAlwaysOnTop: () => Promise<boolean>
      onQuickAdd: (callback: () => void) => () => void
      onWeeklyReport: (
        callback: (_event: unknown, report: WeeklyReportData) => void
      ) => () => void
      requestWeeklyReport: () => void
    }
  }
}
