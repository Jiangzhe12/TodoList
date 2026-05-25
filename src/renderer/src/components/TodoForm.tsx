import { useState, useEffect } from 'react'
import { Todo, TodoCategory, TodoPriority, isBugTodo } from '../types'
import { useTodoStore } from '../store'
import { useImagePaste } from '../utils/useImagePaste'
import BugFields from './BugFields'

interface TodoFormProps {
  editingTodo?: Todo | null
  initialTitle?: string
  onClose: () => void
}

const categoryOptions: { value: TodoCategory; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'optimization', label: '优化' }
]

const priorityOptions: { value: TodoPriority; label: string }[] = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
]

export default function TodoForm({ editingTodo, initialTitle, onClose }: TodoFormProps): JSX.Element {
  const { addTodo, updateTodo, customTags, addCustomTag } = useTodoStore()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TodoCategory>('feature')
  const [priority, setPriority] = useState<TodoPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [bugCause, setBugCause] = useState('')
  const [fixPlan, setFixPlan] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)

  const { onPaste: onImagePaste, error: pasteError } = useImagePaste({
    onImage: ({ filename }) => {
      setAttachments((prev) => [...prev, filename])
    }
  })

  useEffect(() => {
    if (editingTodo) {
      setTitle(editingTodo.title)
      setCategory(editingTodo.category)
      setPriority(editingTodo.priority || 'medium')
      setDueDate(editingTodo.dueDate || '')
      setNote(editingTodo.note || '')
      setTags(editingTodo.tags || [])
      setAttachments(editingTodo.attachments || [])
      if (isBugTodo(editingTodo)) {
        setBugCause(editingTodo.bugCause || '')
        setFixPlan(editingTodo.fixPlan || '')
      }
    } else if (initialTitle) {
      setTitle(initialTitle)
    }
  }, [editingTodo, initialTitle])

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
        tags: tags.length ? tags : undefined,
        attachments: attachments.length ? attachments : undefined
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
        attachments: attachments.length ? attachments : undefined,
        bugCause: category === 'bug' ? bugCause.trim() || undefined : undefined,
        fixPlan: category === 'bug' ? fixPlan.trim() || undefined : undefined
      })
    }

    onClose()
  }

  const removeAttachment = (filename: string): void => {
    setAttachments((prev) => prev.filter((f) => f !== filename))
    // Only delete from disk if this is a brand-new attachment that hasn't
    // been saved yet (i.e. the editing todo doesn't reference it). When
    // editing, leave the file alone — the store update is the canonical
    // moment to delete, but we keep it simple and skip disk cleanup here.
    if (!editingTodo?.attachments?.includes(filename)) {
      void window.api.deleteImage(filename)
    }
  }

  const handleBugFieldChange = (field: 'bugCause' | 'fixPlan', value: string): void => {
    if (field === 'bugCause') setBugCause(value)
    else setFixPlan(value)
  }

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-sheet animate-slide-in-bottom" onPaste={onImagePaste}>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {editingTodo ? '编辑任务' : '新建任务'}
            </h2>
            <button onClick={onClose} className="btn-icon" style={{ padding: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="任务标题..."
              autoFocus
            />

            {/* Category */}
            <div className="flex gap-2">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                  style={{
                    border: `1px solid ${category === cat.value ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: category === cat.value ? 'var(--accent-soft)' : 'transparent',
                    color: category === cat.value ? 'var(--accent)' : 'var(--text-muted)'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Priority */}
            <div className="flex gap-2 items-center">
              <span className="text-xs w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>优先级</span>
              {priorityOptions.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                  style={{
                    border: `1px solid ${priority === p.value ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: priority === p.value ? 'var(--accent-soft)' : 'transparent',
                    color: priority === p.value ? 'var(--accent)' : 'var(--text-muted)'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2">
              <span className="text-xs w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>截止</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field sm flex-1 dark:[color-scheme:dark]"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="text-xs transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  清除
                </button>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>标签</span>
                <div className="flex-1 flex flex-wrap gap-1 items-center">
                  {tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--accent)' }}
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
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing && tagInput.trim()) {
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
                    className="flex-1 min-w-[80px] text-xs px-1.5 py-0.5 bg-transparent focus:outline-none"
                    style={{ color: 'var(--text-primary)' }}
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
                        className="pill"
                        style={{ fontSize: '10px' }}
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Bug fields */}
            {category === 'bug' && (
              <BugFields bugCause={bugCause} fixPlan={fixPlan} onChange={handleBugFieldChange} />
            )}

            {/* Note */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field resize-none"
              style={{ fontSize: '13px' }}
              rows={2}
              placeholder="备注 (可选)..."
            />

            {/* Attachments */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  附件{attachments.length > 0 ? ` · ${attachments.length}` : ''}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Cmd+V 粘贴图片 · 最大 5MB
                </span>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((f) => (
                    <div
                      key={f}
                      className="relative group/att rounded overflow-hidden"
                      style={{ border: '1px solid var(--border-default)', width: '60px', height: '60px' }}
                    >
                      <img
                        src={`app-image://${f}`}
                        alt=""
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={() => setLightbox(f)}
                      />
                      <button
                        type="button"
                        onClick={() => removeAttachment(f)}
                        className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover/att:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                        title="移除"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {pasteError && (
                <p className="text-[11px]" style={{ color: '#ef4444' }}>
                  {pasteError}
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className="btn-primary">
              {editingTodo ? '保存' : '添加'}
            </button>
          </form>
        </div>
      </div>

      {lightbox && (
        <div
          className="modal-overlay animate-fade-in"
          style={{ zIndex: 60, cursor: 'zoom-out' }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={`app-image://${lightbox}`}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
