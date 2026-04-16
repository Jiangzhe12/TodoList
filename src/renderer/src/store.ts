import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  Todo,
  TodoCategory,
  TodoStatus,
  TodoPriority,
  Subtask,
  AppData,
  FilterCategory,
  FilterStatus,
  TodoTemplate,
  ChangeLogEntry,
  isBugTodo
} from './types'
import { getToday } from './utils/dates'
import { carryOverTodos } from './utils/carryOver'

interface TodoStore {
  todos: Todo[]
  lastOpenDate: string
  loaded: boolean

  // Filter & search
  filterCategory: FilterCategory
  filterStatus: FilterStatus
  searchQuery: string
  sortByPriority: boolean
  setFilterCategory: (c: FilterCategory) => void
  setFilterStatus: (s: FilterStatus) => void
  setSearchQuery: (q: string) => void
  toggleSortByPriority: () => void

  // Undo delete
  deletedTodo: Todo | null
  undoTimer: ReturnType<typeof setTimeout> | null
  undoDelete: () => void
  clearDeletedTodo: () => void

  // CRUD
  loadFromDisk: () => Promise<void>
  saveToDisk: () => Promise<void>
  addTodo: (params: {
    title: string
    category: TodoCategory
    priority?: TodoPriority
    dueDate?: string
    note?: string
    tags?: string[]
    bugCause?: string
    fixPlan?: string
  }) => void
  updateTodo: (id: string, patch: Partial<Todo>) => void
  deleteTodo: (id: string) => void
  toggleStatus: (id: string) => void
  convertBugToOptimization: (bugId: string) => void
  runCarryOver: () => void
  reorderTodos: (dateGroup: string, orderedIds: string[]) => void

  // Subtasks
  addSubtask: (todoId: string, title: string) => void
  toggleSubtask: (todoId: string, subtaskId: string) => void
  removeSubtask: (todoId: string, subtaskId: string) => void

  // Archive
  archiveTodo: (id: string) => void
  unarchiveTodo: (id: string) => void
  archiveDone: () => void

  // Tags
  customTags: string[]
  filterTag: string
  setFilterTag: (tag: string) => void
  addCustomTag: (name: string) => void
  removeCustomTag: (name: string) => void

  // Templates
  templates: TodoTemplate[]
  addTemplate: (template: Omit<TodoTemplate, 'id'>) => void
  deleteTemplate: (id: string) => void
  createFromTemplate: (templateId: string) => void

  // Saved weekly reports (user-edited text keyed by weekStart)
  savedReports: Record<string, string>
  saveWeeklyReport: (weekStart: string, text: string) => void
  clearSavedReport: (weekStart: string) => void

  // Focus (keyboard navigation)
  focusedTodoId: string | null
  setFocusedTodo: (id: string | null) => void

  // Theme
  theme: 'dark' | 'light' | 'system'
  setTheme: (theme: 'dark' | 'light' | 'system') => void
}

function appendChangeLog(
  existing: ChangeLogEntry[] | undefined,
  field: string,
  oldValue?: string,
  newValue?: string
): ChangeLogEntry[] {
  const entry: ChangeLogEntry = {
    timestamp: new Date().toISOString(),
    field,
    oldValue,
    newValue
  }
  return [...(existing || []), entry]
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave(saveFn: () => Promise<void>): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveFn(), 300)
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  lastOpenDate: getToday(),
  loaded: false,

  // Filter & search
  filterCategory: 'all',
  filterStatus: 'all',
  searchQuery: '',
  sortByPriority: false,
  customTags: [],
  filterTag: '',
  setFilterCategory: (c) => set({ filterCategory: c }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleSortByPriority: () => set((state) => ({ sortByPriority: !state.sortByPriority })),
  setFilterTag: (tag) => set({ filterTag: tag }),

  // Undo delete
  deletedTodo: null,
  undoTimer: null,

  undoDelete: () => {
    const { deletedTodo, undoTimer } = get()
    if (!deletedTodo) return
    if (undoTimer) clearTimeout(undoTimer)
    set((state) => ({
      todos: [deletedTodo, ...state.todos],
      deletedTodo: null,
      undoTimer: null
    }))
    debouncedSave(get().saveToDisk)
  },

  clearDeletedTodo: () => {
    const { undoTimer } = get()
    if (undoTimer) clearTimeout(undoTimer)
    set({ deletedTodo: null, undoTimer: null })
  },

  loadFromDisk: async () => {
    try {
      const raw = (await window.api.getStoreData()) as unknown as AppData | undefined
      if (raw && raw.todos) {
        const today = getToday()
        // Backfill fields for old data:
        // - order / priority defaults
        // - completedAt for done tasks missing the timestamp (use updatedAt as
        //   best-effort fallback) — fixes old data where toggleStatus cleared
        //   completedAt when cycling off done, hiding tasks from weekly reports.
        let needsMigrationSave = false
        const todosWithOrder = raw.todos.map((t, i) => {
          const base = {
            ...t,
            order: t.order ?? i,
            priority: t.priority ?? 'medium'
          } as Todo
          if (base.status === 'done' && !base.completedAt) {
            needsMigrationSave = true
            base.completedAt = base.updatedAt || base.createdAt
          }
          return base
        })
        const carried = carryOverTodos(todosWithOrder, raw.lastOpenDate || today)
        set({ todos: carried, lastOpenDate: today, loaded: true, customTags: raw.customTags || [], templates: raw.templates || [], savedReports: raw.savedReports || {} })
        if (raw.lastOpenDate !== today || needsMigrationSave) {
          await get().saveToDisk()
        }
      } else {
        set({ todos: [], lastOpenDate: getToday(), loaded: true })
      }
    } catch {
      set({ todos: [], lastOpenDate: getToday(), loaded: true })
    }
  },

  saveToDisk: async () => {
    const { todos, lastOpenDate, customTags, templates, savedReports } = get()
    const data: AppData = {
      todos,
      lastOpenDate,
      customTags: customTags.length ? customTags : undefined,
      templates: templates.length ? templates : undefined,
      savedReports: Object.keys(savedReports).length ? savedReports : undefined
    }
    await window.api.setStoreData(data as unknown as Record<string, unknown>)
  },

  addTodo: (params) => {
    const now = new Date().toISOString()
    const today = getToday()
    const newTodo: Todo = {
      id: uuidv4(),
      title: params.title,
      category: params.category,
      priority: params.priority || 'medium',
      status: 'pending' as TodoStatus,
      date: today,
      createdAt: now,
      updatedAt: now,
      order: 0,
      note: params.note,
      dueDate: params.dueDate,
      tags: params.tags?.length ? params.tags : undefined,
      ...(params.category === 'bug'
        ? { bugCause: params.bugCause, fixPlan: params.fixPlan }
        : {})
    }
    // Push existing todos' order +1 for this date
    set((state) => ({
      todos: [
        newTodo,
        ...state.todos.map((t) =>
          t.date === today ? { ...t, order: t.order + 1 } : t
        )
      ]
    }))
    debouncedSave(get().saveToDisk)
  },

  updateTodo: (id, patch) => {
    set((state) => ({
      todos: state.todos.map((t) => {
        if (t.id !== id) return t
        // Record changelog for tracked fields
        let changelog = t.changelog || []
        const trackedFields: (keyof Todo)[] = ['title', 'category', 'priority', 'status', 'dueDate', 'note']
        for (const field of trackedFields) {
          if (field in patch && patch[field] !== t[field]) {
            changelog = appendChangeLog(changelog, field, String(t[field] ?? ''), String(patch[field] ?? ''))
          }
        }
        // Set completedAt on first transition to 'done'; preserve historical record if already set.
        // Never clear completedAt — once a task has been completed, keep the timestamp
        // so weekly reports can still count it even if the user later reopens it.
        const now = new Date().toISOString()
        const willBeDone = 'status' in patch ? patch.status === 'done' : t.status === 'done'
        const completedAt = willBeDone ? (t.completedAt ?? now) : t.completedAt
        return { ...t, ...patch, completedAt, changelog, updatedAt: now }
      })
    }))
    debouncedSave(get().saveToDisk)
  },

  deleteTodo: (id) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return

    // Clear previous undo timer
    const { undoTimer: prevTimer } = get()
    if (prevTimer) clearTimeout(prevTimer)

    const timer = setTimeout(() => {
      set({ deletedTodo: null, undoTimer: null })
    }, 4000)

    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
      deletedTodo: todo,
      undoTimer: timer
    }))
    debouncedSave(get().saveToDisk)
  },

  toggleStatus: (id) => {
    const statusCycle: Record<TodoStatus, TodoStatus> = {
      pending: 'in_progress',
      in_progress: 'done',
      done: 'pending'
    }
    const statusLabels: Record<TodoStatus, string> = {
      pending: '待办',
      in_progress: '进行中',
      done: '已完成'
    }
    set((state) => ({
      todos: state.todos.map((t) => {
        if (t.id !== id) return t
        const newStatus = statusCycle[t.status]
        const now = new Date().toISOString()
        const changelog = appendChangeLog(t.changelog, 'status', statusLabels[t.status], statusLabels[newStatus])
        // Preserve completedAt: set on first transition to done, keep historical
        // timestamp even if user cycles back to pending. Prevents weekly-report
        // data loss when a task is accidentally re-toggled.
        const completedAt = newStatus === 'done' ? (t.completedAt ?? now) : t.completedAt
        return {
          ...t,
          status: newStatus,
          updatedAt: now,
          completedAt,
          changelog
        }
      })
    }))
    debouncedSave(get().saveToDisk)
  },

  convertBugToOptimization: (bugId) => {
    const bug = get().todos.find((t) => t.id === bugId)
    if (!bug || !isBugTodo(bug)) return

    const now = new Date().toISOString()
    const optimizationTodo: Todo = {
      id: uuidv4(),
      title: `优化: ${bug.title}`,
      category: 'optimization',
      priority: bug.priority,
      status: 'pending',
      date: getToday(),
      createdAt: now,
      updatedAt: now,
      order: 0,
      note: bug.fixPlan ? `来源Bug修复方案: ${bug.fixPlan}` : undefined
    }

    set((state) => ({
      todos: [
        optimizationTodo,
        ...state.todos.map((t) =>
          t.id === bugId
            ? {
                ...t,
                status: 'done' as TodoStatus,
                convertedToOptimizationId: optimizationTodo.id,
                completedAt: t.completedAt ?? now,
                updatedAt: now
              }
            : t
        )
      ]
    }))
    debouncedSave(get().saveToDisk)
  },

  runCarryOver: () => {
    const { todos, lastOpenDate } = get()
    const today = getToday()
    if (lastOpenDate === today) return
    const carried = carryOverTodos(todos, lastOpenDate)
    set({ todos: carried, lastOpenDate: today })
    debouncedSave(get().saveToDisk)
  },

  reorderTodos: (dateGroup, orderedIds) => {
    set((state) => {
      const updated = [...state.todos]
      orderedIds.forEach((id, index) => {
        const todo = updated.find((t) => t.id === id)
        if (todo && todo.date === dateGroup) {
          todo.order = index
        }
      })
      return { todos: updated }
    })
    debouncedSave(get().saveToDisk)
  },

  // Subtasks
  addSubtask: (todoId, title) => {
    const subtask: Subtask = { id: uuidv4(), title, done: false }
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === todoId
          ? { ...t, subtasks: [...(t.subtasks || []), subtask], updatedAt: new Date().toISOString() }
          : t
      )
    }))
    debouncedSave(get().saveToDisk)
  },

  toggleSubtask: (todoId, subtaskId) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === todoId
          ? {
              ...t,
              subtasks: (t.subtasks || []).map((s) =>
                s.id === subtaskId ? { ...s, done: !s.done } : s
              ),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    debouncedSave(get().saveToDisk)
  },

  removeSubtask: (todoId, subtaskId) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === todoId
          ? {
              ...t,
              subtasks: (t.subtasks || []).filter((s) => s.id !== subtaskId),
              updatedAt: new Date().toISOString()
            }
          : t
      )
    }))
    debouncedSave(get().saveToDisk)
  },

  // Archive
  archiveTodo: (id) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, archived: true, updatedAt: new Date().toISOString() } : t
      )
    }))
    debouncedSave(get().saveToDisk)
  },

  unarchiveTodo: (id) => {
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, archived: false, updatedAt: new Date().toISOString() } : t
      )
    }))
    debouncedSave(get().saveToDisk)
  },

  archiveDone: () => {
    const now = new Date().toISOString()
    set((state) => ({
      todos: state.todos.map((t) =>
        t.status === 'done' && !t.archived ? { ...t, archived: true, updatedAt: now } : t
      )
    }))
    debouncedSave(get().saveToDisk)
  },

  // Tags
  addCustomTag: (name) => {
    set((state) => {
      if (state.customTags.includes(name)) return state
      return { customTags: [...state.customTags, name] }
    })
    debouncedSave(get().saveToDisk)
  },

  removeCustomTag: (name) => {
    set((state) => ({
      customTags: state.customTags.filter((t) => t !== name)
    }))
    debouncedSave(get().saveToDisk)
  },

  // Templates
  templates: [],

  addTemplate: (tmpl) => {
    const template: TodoTemplate = { ...tmpl, id: uuidv4() }
    set((state) => ({ templates: [...state.templates, template] }))
    debouncedSave(get().saveToDisk)
  },

  deleteTemplate: (id) => {
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
    debouncedSave(get().saveToDisk)
  },

  createFromTemplate: (templateId) => {
    const template = get().templates.find((t) => t.id === templateId)
    if (!template) return
    const now = new Date().toISOString()
    const today = getToday()
    const subtasks: Subtask[] = (template.subtasks || []).map((title) => ({
      id: uuidv4(),
      title,
      done: false
    }))
    const newTodo: Todo = {
      id: uuidv4(),
      title: template.name,
      category: template.category,
      priority: template.priority,
      status: 'pending' as TodoStatus,
      date: today,
      createdAt: now,
      updatedAt: now,
      order: 0,
      note: template.note,
      tags: template.tags?.length ? [...template.tags] : undefined,
      subtasks: subtasks.length ? subtasks : undefined
    }
    set((state) => ({
      todos: [
        newTodo,
        ...state.todos.map((t) =>
          t.date === today ? { ...t, order: t.order + 1 } : t
        )
      ]
    }))
    debouncedSave(get().saveToDisk)
  },

  // Saved weekly reports
  savedReports: {},

  saveWeeklyReport: (weekStart, text) => {
    set((state) => ({
      savedReports: { ...state.savedReports, [weekStart]: text }
    }))
    debouncedSave(get().saveToDisk)
  },

  clearSavedReport: (weekStart) => {
    set((state) => {
      const next = { ...state.savedReports }
      delete next[weekStart]
      return { savedReports: next }
    })
    debouncedSave(get().saveToDisk)
  },

  // Focus (keyboard navigation)
  focusedTodoId: null,
  setFocusedTodo: (id) => set({ focusedTodoId: id }),

  // Theme
  theme: 'dark',
  setTheme: (theme) => {
    set({ theme })
    // Apply to DOM
    const root = document.documentElement
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }
}))
