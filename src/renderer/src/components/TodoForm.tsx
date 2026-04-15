import { useState, useEffect } from 'react'
import { Todo, TodoCategory, TodoPriority, isBugTodo } from '../types'
import { useTodoStore } from '../store'
import BugFields from './BugFields'

interface TodoFormProps {
  editingTodo?: Todo | null
  onClose: () => void
}

export default function TodoForm({ editingTodo, onClose }: TodoFormProps): JSX.Element {
  const { addTodo, updateTodo, customTags, addCustomTag, templates, addTemplate } = useTodoStore()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TodoCategory>('feature')
  const [priority, setPriority] = useState<TodoPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [bugCause, setBugCause] = useState('')
  const [fixPlan, setFixPlan] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [subtaskInputs, setSubtaskInputs] = useState<string[]>([])

  useEffect(() => {
    if (editingTodo) {
      setTitle(editingTodo.title)
      setCategory(editingTodo.category)
      setPriority(editingTodo.priority || 'medium')
      setDueDate(editingTodo.dueDate || '')
      setNote(editingTodo.note || '')
      setTags(editingTodo.tags || [])
      if (isBugTodo(editingTodo)) {
        setBugCause(editingTodo.bugCause || '')
        setFixPlan(editingTodo.fixPlan || '')
      }
    }
  }, [editingTodo])

  const handleLoadTemplate = (templateId: string): void => {
    const tmpl = templates.find((t) => t.id === templateId)
    if (!tmpl) return
    setTitle(tmpl.name)
    setCategory(tmpl.category)
    setPriority(tmpl.priority)
    setTags(tmpl.tags || [])
    setNote(tmpl.note || '')
    setSubtaskInputs(tmpl.subtasks || [])
  }

  const handleSaveAsTemplate = (): void => {
    if (!templateName.trim()) return
    addTemplate({
      name: templateName.trim(),
      category,
      priority,
      tags: tags.length ? tags : undefined,
      subtasks: subtaskInputs.filter((s) => s.trim()),
      note: note.trim() || undefined
    })
    setShowSaveTemplate(false)
    setTemplateName('')
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!title.trim()) return

    if (editingTodo) {
      const patch: Partial<Todo> = {
        title: title.trim(),
        category,
        priority,
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
        tags: tags.length ? tags : undefined
      }
      if (category === 'bug') {
        ;(patch as Record<string, unknown>).bugCause = bugCause.trim() || undefined
        ;(patch as Record<string, unknown>).fixPlan = fixPlan.trim() || undefined
      }
      updateTodo(editingTodo.id, patch)
    } else {
      addTodo({
        title: title.trim(),
        category,
        priority,
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
        tags: tags.length ? tags : undefined,
        bugCause: category === 'bug' ? bugCause.trim() || undefined : undefined,
        fixPlan: category === 'bug' ? fixPlan.trim() || undefined : undefined
      })
    }

    onClose()
  }

  const handleBugFieldChange = (field: 'bugCause' | 'fixPlan', value: string): void => {
    if (field === 'bugCause') setBugCause(value)
    else setFixPlan(value)
  }

  const categories: { value: TodoCategory; label: string; color: string }[] = [
    { value: 'feature', label: 'Feature', color: 'border-blue-500 text-blue-300' },
    { value: 'bug', label: 'Bug', color: 'border-red-500 text-red-300' },
    { value: 'optimization', label: '优化', color: 'border-amber-500 text-amber-300' }
  ]

  const priorities: { value: TodoPriority; label: string; color: string }[] = [
    { value: 'high', label: '高', color: 'border-red-500 text-red-300' },
    { value: 'medium', label: '中', color: 'border-yellow-500 text-yellow-300' },
    { value: 'low', label: '低', color: 'border-zinc-500 text-zinc-400' }
  ]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end animate-fade-in">
      <div className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 rounded-t-xl p-4 max-h-[80%] overflow-y-auto animate-slide-in-bottom">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {editingTodo ? '编辑任务' : '新建任务'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Template selector (only when creating) */}
          {!editingTodo && templates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 w-12 shrink-0">模板</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleLoadTemplate(e.target.value)
                  e.target.value = ''
                }}
                className="flex-1 px-2 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                defaultValue=""
              >
                <option value="" disabled>从模板创建...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
              placeholder="任务标题..."
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  category === cat.value
                    ? `${cat.color} bg-zinc-100 dark:bg-zinc-800`
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Priority */}
          <div className="flex gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500 self-center w-12 shrink-0">优先级</span>
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  priority === p.value
                    ? `${p.color} bg-zinc-100 dark:bg-zinc-800`
                    : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500 w-12 shrink-0">截止</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 dark:[color-scheme:dark]"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                清除
              </button>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 w-12 shrink-0">标签</span>
              <div className="flex-1 flex flex-wrap gap-1 items-center">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-purple-900/30 border border-purple-500/30 text-purple-300 rounded"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="text-purple-400 hover:text-purple-200 ml-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault()
                      const newTag = tagInput.trim()
                      if (!tags.includes(newTag)) {
                        setTags([...tags, newTag])
                        addCustomTag(newTag)
                      }
                      setTagInput('')
                    }
                  }}
                  placeholder="输入后回车..."
                  className="flex-1 min-w-[80px] text-xs px-1.5 py-0.5 bg-transparent text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none"
                />
              </div>
            </div>
            {customTags.filter((t) => !tags.includes(t)).length > 0 && (
              <div className="flex gap-1 flex-wrap ml-14">
                {customTags
                  .filter((t) => !tags.includes(t))
                  .slice(0, 8)
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags([...tags, tag])}
                      className="px-1.5 py-0.5 text-[10px] border border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 rounded hover:border-purple-500/30 hover:text-purple-300 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {category === 'bug' && (
            <BugFields bugCause={bugCause} fixPlan={fixPlan} onChange={handleBugFieldChange} />
          )}

          <div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
              rows={2}
              placeholder="备注 (可选)..."
            />
          </div>

          {/* Save as template */}
          {!editingTodo && (
            <div>
              {!showSaveTemplate ? (
                <button
                  type="button"
                  onClick={() => setShowSaveTemplate(true)}
                  className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  📋 保存为模板
                </button>
              ) : (
                <div className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="模板名称..."
                    className="flex-1 px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveAsTemplate() }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    className="px-2 py-1 text-[10px] rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSaveTemplate(false); setTemplateName('') }}
                    className="text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            {editingTodo ? '保存' : '添加'}
          </button>
        </form>
      </div>
    </div>
  )
}
