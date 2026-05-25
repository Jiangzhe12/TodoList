import { useTodoStore } from '../store'
import CategoryBadge from './CategoryBadge'

interface TemplateManagerProps {
  onClose: () => void
  onCreateFromTemplate: (templateId: string) => void
}

const priorityLabels = { high: '高', medium: '中', low: '低' }

export default function TemplateManager({ onClose, onCreateFromTemplate }: TemplateManagerProps): JSX.Element {
  const templates = useTodoStore((s) => s.templates)
  const deleteTemplate = useTodoStore((s) => s.deleteTemplate)

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-sheet animate-slide-in-bottom">
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            任务模板
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              ({templates.length})
            </span>
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ padding: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32" style={{ color: 'var(--text-muted)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'var(--accent-softer)' }}
              >
                <span className="text-lg">📋</span>
              </div>
              <span className="text-sm">暂无模板</span>
              <span className="text-[10px] mt-1">在新建任务时可以"保存为模板"</span>
            </div>
          ) : (
            templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="group flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-softer)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</span>
                    <CategoryBadge category={tmpl.category} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {priorityLabels[tmpl.priority]}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {tmpl.subtasks && tmpl.subtasks.length > 0 && (
                      <span>{tmpl.subtasks.length} 个子任务</span>
                    )}
                    {tmpl.tags && tmpl.tags.length > 0 && (
                      <span>{tmpl.tags.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onCreateFromTemplate(tmpl.id)}
                    className="pill active"
                    style={{ cursor: 'pointer' }}
                  >
                    创建任务
                  </button>
                  <button
                    onClick={() => deleteTemplate(tmpl.id)}
                    className="pill"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ef4444'
                      e.currentTarget.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
