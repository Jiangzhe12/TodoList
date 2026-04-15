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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end animate-fade-in">
      <div className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 rounded-t-xl max-h-[80%] flex flex-col animate-slide-in-bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            任务模板
            <span className="ml-2 text-zinc-400 dark:text-zinc-500 font-normal">({templates.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400 dark:text-zinc-500">
              <span className="text-2xl mb-2">📋</span>
              <span className="text-sm">暂无模板</span>
              <span className="text-[10px] mt-1 text-zinc-400 dark:text-zinc-600">在新建任务时可以"保存为模板"</span>
            </div>
          ) : (
            templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="group flex items-center gap-2 px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate font-medium">{tmpl.name}</span>
                    <CategoryBadge category={tmpl.category} />
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {priorityLabels[tmpl.priority]}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
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
                    className="px-2 py-0.5 text-[10px] rounded border border-blue-400/50 text-blue-400 hover:text-blue-300 hover:border-blue-400 transition-colors"
                  >
                    创建任务
                  </button>
                  <button
                    onClick={() => deleteTemplate(tmpl.id)}
                    className="px-2 py-0.5 text-[10px] rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-400 dark:hover:border-red-500/50 transition-colors"
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
